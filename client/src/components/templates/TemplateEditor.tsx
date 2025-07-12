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
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useChatContext } from '@/contexts/ChatContext';
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
  RefreshCw,
  Trash2
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

const editorExtensions = [
  StarterKit.configure({
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
];

// Toolbar component that can be reused for both editors
const EditorToolbar = ({ editor }: { editor: any }) => {
  if (!editor) return null;

  return (
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
  );
};

export default function TemplateEditor({
  isOpen,
  onClose,
  onSave,
  defaultTemplates,
  userTemplates,
  selectedVoiceProfile
}: TemplateEditorProps) {
  const { toast } = useToast();
  const { selectedModel } = useChatContext();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedDefaultTemplate, setSelectedDefaultTemplate] = useState<string>('');
  const [templateName, setTemplateName] = useState('');
  const [isUpdatingFromDescription, setIsUpdatingFromDescription] = useState(false);
  const [isUpdatingFromExample, setIsUpdatingFromExample] = useState(false);

  // Description editor
  const descriptionEditor = useEditor({
    extensions: editorExtensions,
    content: '<p>Describe the structure of your template here...</p>',
    editable: true,
  });

  // Example editor
  const exampleEditor = useEditor({
    extensions: editorExtensions,
    content: '<p>Example output will appear here...</p>',
    editable: true,
  });

  // Generate example from description
  const generateExampleMutation = useMutation({
    mutationFn: async (description: string) => {
      console.log('Generating example for description:', description);
      console.log('Using model:', selectedModel);
      const response = await apiRequest('POST', '/api/generate-template-example', {
        description,
        templateType: selectedDefaultTemplate,
        model: selectedModel,
        voiceProfile: selectedVoiceProfile,
      });
      const result = await response.json();
      console.log('Example generation result:', result);
      return result;
    },
    onSuccess: (data) => {
      if (exampleEditor && data.content) {
        exampleEditor.commands.setContent(data.content);
        setIsUpdatingFromDescription(false);
        toast({
          title: 'Example Generated',
          description: 'AI has generated an example based on your description.',
        });
      }
    },
    onError: (error) => {
      console.error('Error generating example:', error);
      setIsUpdatingFromDescription(false);
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate example. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Generate description from example
  const generateDescriptionMutation = useMutation({
    mutationFn: async (exampleContent: string) => {
      console.log('Generating description for example:', exampleContent);
      console.log('Using model:', selectedModel);
      
      // Get current description for partial update
      const currentDescription = descriptionEditor?.getHTML() || '';
      
      const response = await apiRequest('POST', '/api/generate-template-description', {
        content: exampleContent,
        templateType: selectedDefaultTemplate,
        model: selectedModel,
        currentDescription: currentDescription,
        voiceProfile: selectedVoiceProfile,
      });
      const result = await response.json();
      console.log('Description generation result:', result);
      return result;
    },
    onSuccess: (data) => {
      if (descriptionEditor && data.description) {
        descriptionEditor.commands.setContent(data.description);
        setIsUpdatingFromExample(false);
        toast({
          title: 'Description Updated',
          description: 'AI has analyzed the example and generated a description.',
        });
      }
    },
    onError: (error) => {
      console.error('Error generating description:', error);
      setIsUpdatingFromExample(false);
      toast({
        title: 'Update Failed',
        description: 'Failed to generate description. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Handle updating example from description
  const handleUpdateFromDescription = () => {
    if (descriptionEditor) {
      const description = descriptionEditor.getHTML();
      setIsUpdatingFromDescription(true);
      generateExampleMutation.mutate(description);
    }
  };

  // Handle updating description from example
  const handleUpdateFromExample = () => {
    if (exampleEditor) {
      const content = exampleEditor.getHTML();
      setIsUpdatingFromExample(true);
      generateDescriptionMutation.mutate(content);
    }
  };

  // Handle template selection
  const handleTemplateSelect = (template: StructureTemplate) => {
    console.log('Template selected:', template.name);
    setSelectedTemplate(template.name);
    setSelectedDefaultTemplate(template.name.toLowerCase().replace(/\s+/g, '_'));
    setTemplateName(template.name);
    
    // Load the template description
    if (descriptionEditor && template.description) {
      descriptionEditor.commands.setContent(template.description);
    }
    
    // Load the template example if available
    if (exampleEditor && template.editableContent) {
      exampleEditor.commands.setContent(template.editableContent);
    } else if (exampleEditor && template.description) {
      // If no example exists, generate one from the description
      console.log('No example content, generating from description');
      setIsUpdatingFromDescription(true);
      generateExampleMutation.mutate(template.description);
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

    if (descriptionEditor && exampleEditor) {
      const description = descriptionEditor.getHTML();
      const editableContent = exampleEditor.getHTML();
      
      // Generate formatting instructions from the example
      const formattingInstructions = `Use the following structure: ${description}`;
      
      onSave({
        name: templateName,
        description,
        editableContent,
        formattingInstructions,
      });
    }
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedTemplate('');
      setTemplateName('');
      if (descriptionEditor) {
        descriptionEditor.commands.setContent('<p>Describe the structure of your template here...</p>');
      }
      if (exampleEditor) {
        exampleEditor.commands.setContent('<p>Example output will appear here...</p>');
      }
    }
  }, [isOpen, descriptionEditor, exampleEditor]);

  if (!descriptionEditor || !exampleEditor) {
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
            {/* Select Template Section */}
            <div>
              <Label className="text-base font-medium mb-3 block">Select Template</Label>
              
              {/* Default Templates */}
              <div className="mb-4">
                <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Default Templates</Label>
                <div className="grid grid-cols-4 gap-3">
                  {defaultTemplates.map((template) => (
                    <Card
                      key={template.id}
                      className={`cursor-pointer transition-all ${
                        selectedTemplate === template.name
                          ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                      onClick={() => handleTemplateSelect(template)}
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

              {/* Previously Saved Templates */}
              {userTemplates.length > 0 && (
                <div>
                  <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Previously Saved Templates</Label>
                  <div className="grid grid-cols-4 gap-3">
                    {userTemplates.map((template) => (
                      <Card
                        key={template.id}
                        className={`cursor-pointer transition-all ${
                          selectedTemplate === template.name
                            ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                        onClick={() => handleTemplateSelect(template)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium flex-1 truncate">{template.name}</div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Handle delete
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">
                            {template.description.substring(0, 50)}...
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Template Description Editor */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-medium">Template Description</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUpdateFromDescription}
                  disabled={isUpdatingFromDescription}
                  className="flex items-center gap-2"
                >
                  {isUpdatingFromDescription ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Update Example
                </Button>
              </div>
              <div className="border rounded-lg">
                <EditorToolbar editor={descriptionEditor} />
                <div className="p-4 min-h-[150px] bg-white dark:bg-gray-950">
                  <EditorContent 
                    editor={descriptionEditor}
                    className="prose prose-sm max-w-none dark:prose-invert"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Template Example Editor */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-medium">Template Example</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUpdateFromExample}
                  disabled={isUpdatingFromExample}
                  className="flex items-center gap-2"
                >
                  {isUpdatingFromExample ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Update Description
                </Button>
              </div>
              <div className="border rounded-lg">
                <EditorToolbar editor={exampleEditor} />
                <div className="p-4 min-h-[200px] bg-white dark:bg-gray-950">
                  {isUpdatingFromDescription ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex items-center gap-2 text-gray-500">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Generating example based on description...
                      </div>
                    </div>
                  ) : (
                    <EditorContent 
                      editor={exampleEditor}
                      className="prose prose-sm max-w-none dark:prose-invert"
                    />
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Save Template Section */}
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