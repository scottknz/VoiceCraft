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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  Download,
  FileText,
  Code2
} from 'lucide-react';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun } from 'docx';

interface TemplateEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSave: () => void;
  title?: string;
  isReadOnly?: boolean;
}

export default function TemplateEditor({ 
  content, 
  onChange, 
  onSave, 
  title = "Template Editor",
  isReadOnly = false 
}: TemplateEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
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
    content: content,
    editable: !isReadOnly,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  const exportAsDocx = async () => {
    try {
      const htmlContent = editor?.getHTML() || '';
      const textContent = editor?.getText() || '';
      
      // Create a simple DOCX document
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: textContent,
                  break: 1,
                }),
              ],
            }),
          ],
        }],
      });
      
      const buffer = await Packer.toBuffer(doc);
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      saveAs(blob, `${title.replace(/\s+/g, '_')}.docx`);
    } catch (error) {
      console.error('Error exporting as DOCX:', error);
    }
  };

  const exportAsRtf = () => {
    const htmlContent = editor?.getHTML() || '';
    const rtfContent = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}} ${htmlContent.replace(/<[^>]*>/g, '')} }`;
    const blob = new Blob([rtfContent], { type: 'application/rtf' });
    saveAs(blob, `${title.replace(/\s+/g, '_')}.rtf`);
  };

  const exportAsHtml = () => {
    const htmlContent = editor?.getHTML() || '';
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
    <title>${title}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>`;
    const blob = new Blob([fullHtml], { type: 'text/html' });
    saveAs(blob, `${title.replace(/\s+/g, '_')}.html`);
  };

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">
              {isReadOnly ? 'Read Only' : 'Editable'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col gap-3">
        {/* Toolbar */}
        {!isReadOnly && (
          <div className="flex flex-wrap gap-1 p-2 border rounded-lg bg-gray-50 dark:bg-gray-900">
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
            
            <Separator orientation="vertical" className="h-6" />
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onSave}
              className="text-green-600 hover:text-green-700"
            >
              <Save className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        {/* Editor */}
        <div className="flex-1 border rounded-lg p-4 bg-white dark:bg-gray-950 overflow-y-auto">
          <EditorContent 
            editor={editor}
            className="prose prose-sm max-w-none dark:prose-invert"
          />
        </div>
        
        {/* Export Options */}
        <div className="flex gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={exportAsDocx}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Export DOCX
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportAsRtf}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Export RTF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportAsHtml}
            className="flex items-center gap-2"
          >
            <Code2 className="h-4 w-4" />
            Export HTML
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}