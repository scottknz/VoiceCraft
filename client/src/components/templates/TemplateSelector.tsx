import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { FileText, Plus, Edit, Eye, Sparkles } from 'lucide-react';
import type { StructureTemplate } from '@shared/schema';
import TemplateEditor from './TemplateEditor';

interface TemplateSelectorProps {
  selectedTemplate: StructureTemplate | null;
  onTemplateSelect: (template: StructureTemplate | null) => void;
  onTemplateUpdate: (template: StructureTemplate) => void;
}

export default function TemplateSelector({ 
  selectedTemplate, 
  onTemplateSelect,
  onTemplateUpdate 
}: TemplateSelectorProps) {
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<StructureTemplate | null>(null);
  const [editorContent, setEditorContent] = useState('');

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

  const allTemplates = [
    ...(templates?.default || []),
    ...(templates?.user || [])
  ];

  const handleTemplateClick = (template: StructureTemplate) => {
    onTemplateSelect(template);
  };

  const handleEditTemplate = (template: StructureTemplate) => {
    setEditingTemplate(template);
    setEditorContent(template.example || '');
    setShowEditor(true);
  };

  const handleSaveTemplate = () => {
    if (editingTemplate) {
      const updatedTemplate = {
        ...editingTemplate,
        example: editorContent
      };
      onTemplateUpdate(updatedTemplate);
      setShowEditor(false);
    }
  };

  const handleCreateNew = () => {
    const newTemplate: StructureTemplate = {
      id: Date.now(), // Temporary ID
      userId: 1, // Will be set by API
      name: 'New Template',
      description: 'Custom template',
      templateType: 'custom',
      example: '<h1>New Template</h1><p>Start editing...</p>',
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setEditingTemplate(newTemplate);
    setEditorContent(newTemplate.example);
    setShowEditor(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50 animate-pulse" />
          <p className="text-sm text-gray-500">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Template Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Templates
              </CardTitle>
              <CardDescription>
                Select a template to structure your AI responses
              </CardDescription>
            </div>
            <Button onClick={handleCreateNew} size="sm" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Quick Select */}
            <div className="flex items-center gap-2">
              <Select 
                value={selectedTemplate?.id?.toString() || 'none'} 
                onValueChange={(value) => {
                  if (value === 'none') {
                    onTemplateSelect(null);
                  } else {
                    const template = allTemplates.find(t => t.id.toString() === value);
                    onTemplateSelect(template || null);
                  }
                }}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No template</SelectItem>
                  {allTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id.toString()}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedTemplate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditTemplate(selectedTemplate)}
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              )}
            </div>

            {/* Template Preview */}
            {selectedTemplate && (
              <Card className="bg-gray-50 dark:bg-gray-900">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{selectedTemplate.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {selectedTemplate.description}
                      </CardDescription>
                    </div>
                    <Badge variant={selectedTemplate.isDefault ? "default" : "secondary"}>
                      {selectedTemplate.isDefault ? 'Default' : 'Custom'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Preview:</div>
                    <div 
                      className="text-xs bg-white dark:bg-gray-800 p-3 rounded border max-h-32 overflow-y-auto"
                      dangerouslySetInnerHTML={{ __html: selectedTemplate.example || '' }}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Available Templates Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Available Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {allTemplates.map((template) => (
                <Card 
                  key={template.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedTemplate?.id === template.id 
                      ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950' 
                      : ''
                  }`}
                  onClick={() => handleTemplateClick(template)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{template.name}</CardTitle>
                      <Badge variant={template.isDefault ? "default" : "secondary"} className="text-xs">
                        {template.isDefault ? 'Default' : 'Custom'}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      {template.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Template Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate?.name || 'Template Editor'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 h-full">
            <TemplateEditor
              content={editorContent}
              onChange={setEditorContent}
              onSave={handleSaveTemplate}
              title={editingTemplate?.name || 'New Template'}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}