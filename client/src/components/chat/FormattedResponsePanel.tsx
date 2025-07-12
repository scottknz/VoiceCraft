import { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  List, 
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  X,
  FileText,
  Download
} from "lucide-react";

interface FormattedResponsePanelProps {
  content: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function FormattedResponsePanel({ content, isOpen, onClose }: FormattedResponsePanelProps) {
  const [formattedContent, setFormattedContent] = useState("");

  // Convert markdown-like text to HTML with proper formatting
  const formatContent = (text: string) => {
    let formatted = text;
    
    // Convert markdown-style formatting to HTML
    formatted = formatted
      // Headers
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      // Bold text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic text
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Bullet lists
      .replace(/^[\*\-\+] (.*$)/gm, '<li>$1</li>')
      // Numbered lists
      .replace(/^\d+\. (.*$)/gm, '<li>$1</li>')
      // Line breaks
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      // Handle footnotes and references
      .replace(/\[\d+\]/g, '<sup>$&</sup>')
      // Handle quotes
      .replace(/> (.*?)(<br>|$)/g, '<blockquote>$1</blockquote>$2');

    // Clean up extra breaks and wrap in paragraphs
    formatted = formatted.replace(/<br>\s*<br>/g, '<br>');
    
    // Wrap the content in paragraphs if not already wrapped
    if (!formatted.startsWith('<')) {
      formatted = `<p>${formatted}</p>`;
    }
    
    return formatted;
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyle,
      Color,
      FontFamily,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: formattedContent,
    editable: true,
    onUpdate: ({ editor }) => {
      // Handle content updates if needed
    },
  });

  useEffect(() => {
    if (content) {
      const formatted = formatContent(content);
      setFormattedContent(formatted);
      if (editor) {
        editor.commands.setContent(formatted);
      }
    }
  }, [content, editor]);

  const exportAsHTML = () => {
    if (editor) {
      const html = editor.getHTML();
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'formatted-response.html';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Formatted Response Editor
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportAsHTML}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export HTML
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <Separator />
        
        <CardContent className="p-0">
          {/* Editor Toolbar */}
          <div className="border-b p-4 flex flex-wrap gap-2">
            <Button
              variant={editor?.isActive('heading', { level: 1 }) ? 'default' : 'outline'}
              size="sm"
              onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
            >
              <Heading1 className="h-4 w-4" />
            </Button>
            <Button
              variant={editor?.isActive('heading', { level: 2 }) ? 'default' : 'outline'}
              size="sm"
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              <Heading2 className="h-4 w-4" />
            </Button>
            <Button
              variant={editor?.isActive('heading', { level: 3 }) ? 'default' : 'outline'}
              size="sm"
              onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
            >
              <Heading3 className="h-4 w-4" />
            </Button>
            
            <Separator orientation="vertical" className="h-6" />
            
            <Button
              variant={editor?.isActive('bold') ? 'default' : 'outline'}
              size="sm"
              onClick={() => editor?.chain().focus().toggleBold().run()}
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              variant={editor?.isActive('italic') ? 'default' : 'outline'}
              size="sm"
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              variant={editor?.isActive('underline') ? 'default' : 'outline'}
              size="sm"
              onClick={() => editor?.chain().focus().toggleMark('underline').run()}
              title="Underline (may require custom CSS)"
            >
              <UnderlineIcon className="h-4 w-4" />
            </Button>
            
            <Separator orientation="vertical" className="h-6" />
            
            <Button
              variant={editor?.isActive({ textAlign: 'left' }) ? 'default' : 'outline'}
              size="sm"
              onClick={() => editor?.chain().focus().setTextAlign('left').run()}
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button
              variant={editor?.isActive({ textAlign: 'center' }) ? 'default' : 'outline'}
              size="sm"
              onClick={() => editor?.chain().focus().setTextAlign('center').run()}
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button
              variant={editor?.isActive({ textAlign: 'right' }) ? 'default' : 'outline'}
              size="sm"
              onClick={() => editor?.chain().focus().setTextAlign('right').run()}
            >
              <AlignRight className="h-4 w-4" />
            </Button>
            
            <Separator orientation="vertical" className="h-6" />
            
            <Button
              variant={editor?.isActive('bulletList') ? 'default' : 'outline'}
              size="sm"
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={editor?.isActive('orderedList') ? 'default' : 'outline'}
              size="sm"
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Editor Content */}
          <div className="p-4 max-h-[60vh] overflow-y-auto">
            <EditorContent 
              editor={editor}
              className="min-h-[400px] focus:outline-none border rounded-lg p-4"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}