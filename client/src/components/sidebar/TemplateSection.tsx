import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { isUnauthorizedError } from '@/lib/authUtils';
import { useAuth } from '@/hooks/useAuth';
import { useChatContext } from '@/contexts/ChatContext';
import { FileText, Plus, Edit, Trash2, Check, X } from 'lucide-react';
import type { StructureTemplate } from '@shared/schema';
import TemplateEditor from '@/components/templates/TemplateEditor';

interface TemplateSectionProps {
  className?: string;
}

export default function TemplateSection({ className }: TemplateSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedTemplate, setSelectedTemplate } = useChatContext();
  
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<StructureTemplate | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [selectedDefaultTemplate, setSelectedDefaultTemplate] = useState<string>('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateContent, setTemplateContent] = useState('');
  const [formattingInstructions, setFormattingInstructions] = useState('');

  const { data: templates, isLoading } = useQuery<{
    default: StructureTemplate[];
    user: StructureTemplate[];
  }>({
    queryKey: ['/api/structure-templates'],
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const userTemplates = templates?.user || [];
  const defaultTemplates = templates?.default || [];

  const createTemplateMutation = useMutation({
    mutationFn: async (template: Omit<StructureTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await apiRequest("POST", `/api/structure-templates`, template);
      return response.json();
    },
    onSuccess: (newTemplate) => {
      queryClient.invalidateQueries({ queryKey: ['/api/structure-templates'] });
      setSelectedTemplate(newTemplate);
      setShowTemplateModal(false);
      resetForm();
      toast({
        title: "Success",
        description: "Template created successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "Error",
        description: "Failed to create template",
        variant: "destructive",
      });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async (template: StructureTemplate) => {
      const response = await apiRequest("PATCH", `/api/structure-templates/${template.id}`, {
        name: template.name,
        description: template.description,
        example: template.example,
        templateType: template.templateType,
        editableContent: template.editableContent,
        formattingInstructions: template.formattingInstructions,
      });
      return response.json();
    },
    onSuccess: (updatedTemplate) => {
      queryClient.invalidateQueries({ queryKey: ['/api/structure-templates'] });
      if (selectedTemplate?.id === updatedTemplate.id) {
        setSelectedTemplate(updatedTemplate);
      }
      setShowTemplateModal(false);
      resetForm();
      toast({
        title: "Success",
        description: "Template updated successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "Error",
        description: "Failed to update template",
        variant: "destructive",
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: number) => {
      const response = await apiRequest("DELETE", `/api/structure-templates/${templateId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/structure-templates'] });
      if (selectedTemplate?.id === editingTemplate?.id) {
        setSelectedTemplate(null);
      }
      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setNewTemplateName('');
    setSelectedDefaultTemplate('');
    setTemplateDescription('');
    setTemplateContent('');
    setFormattingInstructions('');
    setEditingTemplate(null);
  };

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    resetForm();
    setShowTemplateModal(true);
  };

  const handleEditTemplate = (template: StructureTemplate) => {
    setEditingTemplate(template);
    setNewTemplateName(template.name);
    setTemplateDescription(template.description);
    setTemplateContent(template.editableContent || template.example || '');
    setFormattingInstructions(template.formattingInstructions || '');
    setShowTemplateModal(true);
  };

  const handleDefaultTemplateSelect = (templateType: string) => {
    const defaultTemplate = defaultTemplates.find(t => t.templateType === templateType);
    if (defaultTemplate) {
      setTemplateDescription(defaultTemplate.description);
      setTemplateContent(defaultTemplate.example || '');
      setFormattingInstructions(defaultTemplate.formattingInstructions || 'Use standard formatting without special styling.');
    }
  };

  const handleSaveTemplate = () => {
    if (!newTemplateName.trim()) {
      toast({
        title: "Error",
        description: "Please provide a template name",
        variant: "destructive",
      });
      return;
    }

    if (editingTemplate) {
      // Update existing template
      const updatedTemplate = {
        ...editingTemplate,
        name: newTemplateName,
        description: templateDescription,
        example: templateContent,
        editableContent: templateContent,
        formattingInstructions: formattingInstructions,
      };
      updateTemplateMutation.mutate(updatedTemplate);
    } else {
      // Create new template
      const newTemplate = {
        userId: user?.id || 1,
        name: newTemplateName,
        description: templateDescription,
        templateType: selectedDefaultTemplate || 'custom',
        example: templateContent,
        editableContent: templateContent,
        formattingInstructions: formattingInstructions,
        isDefault: false,
      };
      createTemplateMutation.mutate(newTemplate);
    }
  };

  const handleDeleteTemplate = (template: StructureTemplate) => {
    if (window.confirm(`Are you sure you want to delete "${template.name}"?`)) {
      deleteTemplateMutation.mutate(template.id);
    }
  };

  const handleTemplateContentChange = (content: string, formatting?: string) => {
    setTemplateContent(content);
    if (formatting) {
      setFormattingInstructions(formatting);
    }
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Templates
            </CardTitle>
            <Button
              onClick={handleCreateTemplate}
              size="sm"
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Active Template */}
          {selectedTemplate && (
            <div className="mb-4">
              <div className="text-sm font-medium mb-2">Active Template:</div>
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{selectedTemplate.name}</span>
                  <Badge variant="default" className="text-xs">Active</Badge>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {selectedTemplate.description}
                </p>
                {selectedTemplate.formattingInstructions && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {selectedTemplate.formattingInstructions}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* User Templates */}
          <div className="space-y-2">
            <ScrollArea className="h-40">
              {userTemplates.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-xs text-gray-500">No custom templates yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {userTemplates.map((template) => (
                    <Card 
                      key={template.id}
                      className={`cursor-pointer transition-all hover:shadow-sm group ${
                        selectedTemplate?.id === template.id 
                          ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950' 
                          : ''
                      }`}
                    >
                      <CardHeader 
                        className="pb-2 px-3 py-2"
                        onClick={() => setSelectedTemplate(template)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-sm">{template.name}</CardTitle>
                            <CardDescription className="text-xs line-clamp-1">
                              {template.description}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditTemplate(template);
                              }}
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTemplate(template);
                              }}
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Default Templates */}
          <div className="space-y-2 mt-4">
            <div className="text-sm font-medium">Default Templates:</div>
            <ScrollArea className="h-32">
              <div className="space-y-2">
                {defaultTemplates.map((template) => (
                  <Card 
                    key={template.id}
                    className={`cursor-pointer transition-all hover:shadow-sm ${
                      selectedTemplate?.id === template.id 
                        ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950' 
                        : ''
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <CardHeader className="pb-2 px-3 py-2">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-sm">{template.name}</CardTitle>
                          <CardDescription className="text-xs line-clamp-1">
                            {template.description}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          Default
                        </Badge>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Clear Selection */}
          {selectedTemplate && (
            <div className="mt-4 pt-3 border-t">
              <Button
                onClick={() => setSelectedTemplate(null)}
                size="sm"
                variant="outline"
                className="w-full text-xs"
              >
                Clear Active Template
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Template Creation/Edit Modal */}
      <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? `Edit Template: ${editingTemplate.name}` : 'Create New Template'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex flex-col gap-6">
            {/* Template Name */}
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="Enter template name"
              />
            </div>

            {/* Default Template Selection (only for new templates) */}
            {!editingTemplate && (
              <div className="space-y-2">
                <Label htmlFor="default-template">Base Template</Label>
                <Select value={selectedDefaultTemplate} onValueChange={(value) => {
                  setSelectedDefaultTemplate(value);
                  handleDefaultTemplateSelect(value);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a default template to start with" />
                  </SelectTrigger>
                  <SelectContent>
                    {defaultTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.templateType}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* AI Description */}
            <div className="space-y-2">
              <Label htmlFor="template-description">AI Description</Label>
              <Textarea
                id="template-description"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="AI-generated description based on template content"
                rows={3}
              />
            </div>

            {/* Formatting Instructions */}
            <div className="space-y-2">
              <Label htmlFor="formatting-instructions">Formatting Instructions</Label>
              <Textarea
                id="formatting-instructions"
                value={formattingInstructions}
                onChange={(e) => setFormattingInstructions(e.target.value)}
                placeholder="AI-readable formatting instructions (auto-generated from editor)"
                rows={2}
                className="text-xs"
              />
            </div>

            {/* TipTap Editor */}
            <div className="flex-1 min-h-0 space-y-2">
              <Label>Template Content</Label>
              <div className="border rounded-lg flex-1 overflow-hidden">
                <TemplateEditor
                  content={templateContent}
                  onChange={handleTemplateContentChange}
                  onSave={handleSaveTemplate}
                  title="Template Content"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                onClick={() => setShowTemplateModal(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveTemplate}
                disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
              >
                {editingTemplate ? 'Update Template' : 'Create Template'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}