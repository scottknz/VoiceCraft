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
import { FileText, Plus, Edit, Trash2, Check, X, RefreshCw, Save } from 'lucide-react';
import type { StructureTemplate } from '@shared/schema';
import TemplateEditor from '@/components/templates/TemplateEditor';

interface TemplateSectionProps {
  className?: string;
}

function TemplateSection({ className }: TemplateSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedTemplate, setSelectedTemplate, selectedVoiceProfile } = useChatContext();
  
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

  const handleDefaultTemplateSelect = async (templateType: string) => {
    const defaultTemplate = defaultTemplates.find(t => t.templateType === templateType);
    if (defaultTemplate) {
      setTemplateDescription(defaultTemplate.description);
      setFormattingInstructions(defaultTemplate.formattingInstructions || 'Use standard formatting without special styling.');
      
      // Generate random rich text content based on template description
      try {
        const response = await apiRequest(
          'POST',
          '/api/generate-template-example',
          {
            description: defaultTemplate.description,
            templateType: templateType
          }
        );
        
        const data = await response.json();
        if (data.content) {
          setTemplateContent(data.content);
        } else {
          setTemplateContent(defaultTemplate.example || '');
        }
      } catch (error) {
        console.error('Failed to generate template example:', error);
        setTemplateContent(defaultTemplate.example || '');
      }
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

  const handleUpdateDescription = async () => {
    if (!templateContent.trim()) {
      toast({
        title: "No Content",
        description: "Please add some content to the template before updating the description.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Generate AI description based on template content using active voice profile
      const activeVoiceProfile = selectedVoiceProfile;
      
      const response = await apiRequest(
        'POST',
        '/api/generate-template-description',
        {
          content: templateContent,
          templateType: selectedDefaultTemplate || 'custom',
          voiceProfileId: activeVoiceProfile?.id
        }
      );

      const data = await response.json();
      if (data.description) {
        setTemplateDescription(data.description);
        toast({
          title: "Description Updated",
          description: "Template description has been updated based on your content structure.",
        });
      }
    } catch (error) {
      console.error('Failed to update description:', error);
      toast({
        title: "Update Failed",
        description: "Could not generate description. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className={className}>
      {/* Templates Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Templates</h3>
        <Button
          onClick={handleCreateTemplate}
          size="sm"
          className="h-8 w-8 p-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Templates List */}
      <div className="space-y-2">
        {userTemplates.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No templates yet</p>
            <p className="text-xs mt-1">Click + to create your first template</p>
          </div>
        ) : (
          userTemplates.map((template) => (
            <Card 
              key={template.id}
              className={`cursor-pointer transition-all hover:shadow-sm group ${
                selectedTemplate?.id === template.id 
                  ? 'border-2 border-blue-500 bg-blue-50 dark:bg-blue-950/50' 
                  : 'border border-gray-200 dark:border-gray-700'
              }`}
              onClick={() => setSelectedTemplate(template)}
            >
              <CardContent className="p-3">
                {selectedTemplate?.id === template.id ? (
                  // Active template - full information
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {template.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="default" className="text-xs">Active</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
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
                    {template.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                        {template.description}
                      </p>
                    )}
                    {template.formattingInstructions && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-1">
                        {template.formattingInstructions}
                      </p>
                    )}
                  </div>
                ) : (
                  // Inactive template - minimal display
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {template.name}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">Inactive</Badge>
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
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Template Editor Modal */}
      <TemplateEditor
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onSave={(template) => {
          if (editingTemplate) {
            // Update existing template
            const updatedTemplate = {
              ...editingTemplate,
              ...template
            };
            updateTemplateMutation.mutate(updatedTemplate);
          } else {
            // Create new template
            const newTemplate = {
              userId: user?.id || 1,
              ...template,
              templateType: 'custom',
              example: template.editableContent,
              isDefault: false,
            };
            createTemplateMutation.mutate(newTemplate);
          }
        }}
        defaultTemplates={defaultTemplates}
        userTemplates={userTemplates}
        selectedVoiceProfile={selectedVoiceProfile}
      />
    </div>
  );
}

export default TemplateSection;
