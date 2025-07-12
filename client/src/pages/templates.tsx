import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';
import { isUnauthorizedError } from '@/lib/authUtils';
import TemplateSelector from '@/components/templates/TemplateSelector';
import TemplateOutputPanel from '@/components/templates/TemplateOutputPanel';
import type { StructureTemplate } from '@shared/schema';
import { FileText, Sparkles, Layout, PanelRightOpen, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';

export default function Templates() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedTemplate, setSelectedTemplate] = useState<StructureTemplate | null>(null);
  const [showOutputPanel, setShowOutputPanel] = useState(false);
  const [outputPanelWidth, setOutputPanelWidth] = useState(400);
  const [outputContent, setOutputContent] = useState('');

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/structure-templates'] });
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

  const createTemplateMutation = useMutation({
    mutationFn: async (template: Omit<StructureTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await apiRequest("POST", `/api/structure-templates`, template);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/structure-templates'] });
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

  const handleTemplateUpdate = (template: StructureTemplate, formattingInstructions?: string) => {
    // Include formatting instructions if provided
    const updatedTemplate = formattingInstructions
      ? { ...template, formattingInstructions }
      : template;
      
    if (template.id < 1000) { // Assume new templates have temporary IDs
      createTemplateMutation.mutate({
        userId: user?.id || 1,
        name: template.name,
        description: template.description,
        templateType: template.templateType,
        example: template.example,
        editableContent: template.editableContent,
        formattingInstructions: template.formattingInstructions,
        isDefault: false,
      });
    } else {
      updateTemplateMutation.mutate(updatedTemplate);
    }
  };

  const handleTestTemplate = () => {
    if (selectedTemplate) {
      setOutputContent(selectedTemplate.editableContent || selectedTemplate.example || '');
      setShowOutputPanel(true);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Please log in to access templates</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-all duration-300 ${
      showOutputPanel ? `mr-${outputPanelWidth}` : ''
    }`}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Sparkles className="h-8 w-8 text-blue-500" />
                Templates
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Create and manage structured templates for AI responses
              </p>
            </div>
            
            <Link href="/">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Chat
              </Button>
            </Link>
            
            <div className="flex items-center gap-3">
              {selectedTemplate && (
                <Button
                  onClick={handleTestTemplate}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Layout className="h-4 w-4" />
                  Test Template
                </Button>
              )}
              <Button
                onClick={() => setShowOutputPanel(true)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <PanelRightOpen className="h-4 w-4" />
                Show Output Panel
              </Button>
            </div>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Selected Template
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedTemplate ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{selectedTemplate.name}</span>
                    <Badge variant={selectedTemplate.isDefault ? "default" : "secondary"}>
                      {selectedTemplate.isDefault ? 'Default' : 'Custom'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedTemplate.description}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No template selected</p>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Layout className="h-5 w-5" />
                Output Panel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {showOutputPanel ? 'Visible' : 'Hidden'}
                  </span>
                  <Badge variant={showOutputPanel ? "default" : "secondary"}>
                    {showOutputPanel ? 'Open' : 'Closed'}
                  </Badge>
                </div>
                {showOutputPanel && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Width: {outputPanelWidth}px
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Ready</span>
                  <Badge variant="default">Active</Badge>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Templates system is ready
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Template Selector */}
        <TemplateSelector
          selectedTemplate={selectedTemplate}
          onTemplateSelect={setSelectedTemplate}
          onTemplateUpdate={handleTemplateUpdate}
        />
      </div>

      {/* Output Panel */}
      <TemplateOutputPanel
        isVisible={showOutputPanel}
        onToggle={() => setShowOutputPanel(!showOutputPanel)}
        width={outputPanelWidth}
        onWidthChange={setOutputPanelWidth}
        template={selectedTemplate}
        content={outputContent}
        onContentChange={(content, formattingInstructions) => {
          setOutputContent(content);
          // Could also store formattingInstructions for future use
        }}
      />
    </div>
  );
}