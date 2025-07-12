import { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import TextAlign from '@tiptap/extension-text-align';
import FontFamily from '@tiptap/extension-font-family';
import ListItem from '@tiptap/extension-list-item';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  Table as TableIcon,
  Save,
  X,
  RefreshCw,
  FileText,
  Trash2,
  Download
} from 'lucide-react';
import type { StructureTemplate } from '@shared/schema';

interface TemplateEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: {
    name: string;
    description: string;
    editableContent: string;
    formattingInstructions: string;
  }) => void;
  defaultTemplates: StructureTemplate[];
  userTemplates: StructureTemplate[];
  selectedVoiceProfile?: {
    id: number;
    name: string;
    description: string;
  };
}

export default function TemplateEditor({
  isOpen,
  onClose,
  onSave,
  defaultTemplates,
  userTemplates,
  selectedVoiceProfile
}: TemplateEditorProps) {
  const { toast } = useToast();
  const [selectedDefaultTemplate, setSelectedDefaultTemplate] = useState<string>('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUpdatingDescription, setIsUpdatingDescription] = useState(false);

  // Generate AI-readable formatting instructions from TipTap editor content
  const generateFormattingInstructions = (editor: any): string => {
    if (!editor) return '';
    
    const json = editor.getJSON();
    const instructions: string[] = [];
    
    // Analyze the document structure and content
    const analyzeNode = (node: any, level = 0) => {
      if (!node) return;
      
      switch (node.type) {
        case 'heading':
          instructions.push(`Use heading level ${node.attrs?.level || 1} for section titles`);
          break;
        case 'paragraph':
          if (node.attrs?.textAlign && node.attrs.textAlign !== 'left') {
            instructions.push(`Align text to ${node.attrs.textAlign}`);
          }
          break;
        case 'bulletList':
          instructions.push('Use bullet points for unordered lists');
          break;
        case 'orderedList':
          instructions.push('Use numbered lists for ordered content');
          break;
        case 'table':
          instructions.push('Format content in a table structure when appropriate');
          break;
        case 'blockquote':
          instructions.push('Use blockquotes for emphasized or quoted content');
          break;
      }
      
      // Analyze text formatting
      if (node.marks) {
        node.marks.forEach((mark: any) => {
          switch (mark.type) {
            case 'bold':
              instructions.push('Use bold text for emphasis on key terms');
              break;
            case 'italic':
              instructions.push('Use italic text for subtle emphasis');
              break;
            case 'underline':
              instructions.push('Use underlined text for highlighting');
              break;
            case 'textStyle':
              if (mark.attrs?.color) {
                instructions.push(`Use colored text (${mark.attrs.color}) for highlighting`);
              }
              if (mark.attrs?.fontFamily) {
                instructions.push(`Use ${mark.attrs.fontFamily} font family`);
              }
              break;
          }
        });
      }
      
      // Recursively analyze child nodes
      if (node.content) {
        node.content.forEach((child: any) => analyzeNode(child, level + 1));
      }
    };
    
    if (json.content) {
      json.content.forEach((node: any) => analyzeNode(node));
    }
    
    // Remove duplicates and create a comprehensive instruction
    const uniqueInstructions = [...new Set(instructions)];
    
    return uniqueInstructions.length > 0 
      ? `Formatting requirements: ${uniqueInstructions.join('; ')}.`
      : 'Use standard formatting without special styling.';
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable the default list extensions from StarterKit to avoid duplicates
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      TextStyle,
      Color,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      FontFamily,
      ListItem,
      BulletList,
      OrderedList,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: '<p>Rich text content will appear here...</p>',
    editable: true,
  });

  // Generate template example mutation
  const generateExampleMutation = useMutation({
    mutationFn: async (templateType: string) => {
      const response = await apiRequest('/api/generate-template-example', {
        method: 'POST',
        body: JSON.stringify({
          templateType,
          voiceProfile: selectedVoiceProfile,
        }),
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (editor && data.content) {
        editor.commands.setContent(data.content);
        setIsGenerating(false);
        toast({
          title: 'Template Generated',
          description: 'AI-generated template example has been loaded.',
        });
      }
    },
    onError: (error) => {
      console.error('Error generating template example:', error);
      setIsGenerating(false);
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate template example. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Update description mutation
  const updateDescriptionMutation = useMutation({
    mutationFn: async (editorContent: string) => {
      const response = await apiRequest('/api/generate-template-description', {
        method: 'POST',
        body: JSON.stringify({
          content: editorContent,
          voiceProfile: selectedVoiceProfile,
        }),
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.description) {
        setTemplateDescription(data.description);
        setIsUpdatingDescription(false);
        toast({
          title: 'Description Updated',
          description: 'AI-generated description has been created based on your template.',
        });
      }
    },
    onError: (error) => {
      console.error('Error updating description:', error);
      setIsUpdatingDescription(false);
      toast({
        title: 'Update Failed',
        description: 'Failed to update description. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Handle default template selection
  const handleDefaultTemplateSelect = (template: StructureTemplate) => {
    setSelectedDefaultTemplate(template.name);
    setTemplateDescription(template.description);
    setIsGenerating(true);
    generateExampleMutation.mutate(template.templateType);
  };

  // Handle updating description from editor content
  const handleUpdateDescription = () => {
    if (editor) {
      const content = editor.getHTML();
      setIsUpdatingDescription(true);
      updateDescriptionMutation.mutate(content);
    }
  };

  // Handle saving template
  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter a template name.',
        variant: 'destructive',
      });
      return;
    }

    if (editor) {
      const content = editor.getHTML();
      const formattingInstructions = generateFormattingInstructions(editor);
      
      onSave({
        name: templateName,
        description: templateDescription,
        editableContent: content,
        formattingInstructions,
      });
    }
  };

  // Handle loading user template
  const handleLoadUserTemplate = (template: StructureTemplate) => {
    setTemplateName(template.name);
    setTemplateDescription(template.description);
    if (editor && template.editableContent) {
      editor.commands.setContent(template.editableContent);
    }
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedDefaultTemplate('');
      setTemplateDescription('');
      setTemplateName('');
      if (editor) {
        editor.commands.setContent('<p>Rich text content will appear here...</p>');
      }
    }
  }, [isOpen, editor]);

  if (!editor) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[95vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">Template Editor</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Select Default Template */}
            <div>
              <Label className="text-base font-medium mb-3 block">Select Default Template</Label>
              <div className="grid grid-cols-4 gap-3">
                {defaultTemplates.map((template) => (
                  <Card
                    key={template.id}
                    className={`cursor-pointer transition-all ${
                      selectedDefaultTemplate === template.name
                        ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                    onClick={() => handleDefaultTemplateSelect(template)}
                  >
                    <CardContent className="p-3">
                      <div className="text-sm font-medium">{template.name}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {template.description.substring(0, 60)}...
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Separator />

            {/* Template Description */}
            <div>
              <Label className="text-base font-medium mb-3 block">Template Description</Label>
              <Textarea
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Enter AI-optimized prompt for template generation..."
                rows={3}
                className="resize-none"
              />
            </div>

            <Separator />

            {/* Template Example with TipTap Editor */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-medium">Template Example</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUpdateDescription}
                  disabled={isUpdatingDescription}
                  className="flex items-center gap-2"
                >
                  {isUpdatingDescription ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Update Description
                </Button>
              </div>

              <div className="border rounded-lg">
                {/* Editor Toolbar */}
                <div className="flex flex-wrap gap-1 p-2 border-b bg-gray-50 dark:bg-gray-900">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={editor.isActive('bold') ? 'bg-gray-200 dark:bg-gray-700' : ''}
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={editor.isActive('italic') ? 'bg-gray-200 dark:bg-gray-700' : ''}
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    className={editor.isActive('underline') ? 'bg-gray-200 dark:bg-gray-700' : ''}
                  >
                    <Underline className="h-4 w-4" />
                  </Button>
                  
                  <Separator orientation="vertical" className="h-6" />
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    className={editor.isActive({ textAlign: 'left' }) ? 'bg-gray-200 dark:bg-gray-700' : ''}
                  >
                    <AlignLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    className={editor.isActive({ textAlign: 'center' }) ? 'bg-gray-200 dark:bg-gray-700' : ''}
                  >
                    <AlignCenter className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    className={editor.isActive({ textAlign: 'right' }) ? 'bg-gray-200 dark:bg-gray-700' : ''}
                  >
                    <AlignRight className="h-4 w-4" />
                  </Button>
                  
                  <Separator orientation="vertical" className="h-6" />
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={editor.isActive('bulletList') ? 'bg-gray-200 dark:bg-gray-700' : ''}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={editor.isActive('orderedList') ? 'bg-gray-200 dark:bg-gray-700' : ''}
                  >
                    <ListOrdered className="h-4 w-4" />
                  </Button>
                  
                  <Separator orientation="vertical" className="h-6" />
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                  >
                    <TableIcon className="h-4 w-4" />
                  </Button>
                </div>

                {/* Editor Content */}
                <div className="p-4 min-h-[200px] bg-white dark:bg-gray-950">
                  {isGenerating ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex items-center gap-2 text-gray-500">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Generating template content...
                      </div>
                    </div>
                  ) : (
                    <EditorContent 
                      editor={editor}
                      className="prose prose-sm max-w-none dark:prose-invert"
                    />
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Previously Saved Templates */}
            <div>
              <Label className="text-base font-medium mb-3 block">Previously Saved Templates</Label>
              {userTemplates.length === 0 ? (
                <div className="text-gray-500 dark:text-gray-400 text-sm py-4">
                  No saved templates yet. Create your first template below.
                </div>
              ) : (
                <div className="space-y-2">
                  {userTemplates.map((template) => (
                    <Card key={template.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{template.name}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {template.description.substring(0, 100)}...
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleLoadUserTemplate(template)}
                          >
                            Load
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Save Template */}
            <div>
              <Label className="text-base font-medium mb-3 block">Save Template</Label>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Template name..."
                    className="mb-3"
                  />
                </div>
                <Button
                  onClick={handleSaveTemplate}
                  disabled={!templateName.trim()}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save Template
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}