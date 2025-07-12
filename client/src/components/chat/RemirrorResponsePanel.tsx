import { useState, useEffect, useCallback } from "react";
import { Remirror, useRemirror, ThemeProvider, useCommands, useActive, useHelpers } from "@remirror/react";
import type { RemirrorJSON } from "remirror";
import { 
  BoldExtension,
  ItalicExtension,
  UnderlineExtension,
  HeadingExtension,
  BlockquoteExtension,
  HardBreakExtension,
  HistoryExtension,
  DropCursorExtension,
  CodeExtension,
  CodeBlockExtension,
  DocExtension,
  TextExtension,
  ParagraphExtension,
} from "remirror/extensions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Code,
  X,
  FileText,
  Download,
  Save
} from "lucide-react";

interface RemirrorResponsePanelProps {
  content: string;
  isOpen: boolean;
  onClose: () => void;
}

// Editor Toolbar Component
function EditorToolbar() {
  const commands = useCommands();
  const active = useActive();

  return (
    <div className="border-b p-4 flex flex-wrap gap-2">
      {/* Headings */}
      <Button
        variant={active.heading({ level: 1 }) ? 'default' : 'outline'}
        size="sm"
        onClick={() => commands.toggleHeading({ level: 1 })}
      >
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button
        variant={active.heading({ level: 2 }) ? 'default' : 'outline'}
        size="sm"
        onClick={() => commands.toggleHeading({ level: 2 })}
      >
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button
        variant={active.heading({ level: 3 }) ? 'default' : 'outline'}
        size="sm"
        onClick={() => commands.toggleHeading({ level: 3 })}
      >
        <Heading3 className="h-4 w-4" />
      </Button>
      
      <Separator orientation="vertical" className="h-6" />
      
      {/* Text Formatting */}
      <Button
        variant={active.bold() ? 'default' : 'outline'}
        size="sm"
        onClick={() => commands.toggleBold()}
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant={active.italic() ? 'default' : 'outline'}
        size="sm"
        onClick={() => commands.toggleItalic()}
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        variant={active.underline() ? 'default' : 'outline'}
        size="sm"
        onClick={() => commands.toggleUnderline()}
      >
        <UnderlineIcon className="h-4 w-4" />
      </Button>
      
      <Separator orientation="vertical" className="h-6" />
      
      {/* Special */}
      <Button
        variant={active.blockquote() ? 'default' : 'outline'}
        size="sm"
        onClick={() => commands.toggleBlockquote()}
      >
        <Quote className="h-4 w-4" />
      </Button>
      <Button
        variant={active.code() ? 'default' : 'outline'}
        size="sm"
        onClick={() => commands.toggleCode()}
      >
        <Code className="h-3 w-3" />
      </Button>
    </div>
  );
}

export default function RemirrorResponsePanel({ content, isOpen, onClose }: RemirrorResponsePanelProps) {
  const [formattedContent, setFormattedContent] = useState("");

  // Convert markdown-like text to HTML with proper formatting
  const formatContent = (text: string) => {
    let formatted = text;
    
    // Convert markdown-style formatting to HTML
    formatted = formatted
      // Headers (in order from most specific to least)
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold text (handle ** before single *)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic text
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Underline text
      .replace(/__(.*?)__/g, '<u>$1</u>')
      // Code blocks
      .replace(/```(.*?)```/gs, '<pre><code>$1</code></pre>')
      // Inline code
      .replace(/`(.*?)`/g, '<code>$1</code>')
      // Blockquotes
      .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
      // Bullet lists
      .replace(/^[\*\-\+] (.*$)/gim, '<li>$1</li>')
      // Numbered lists
      .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
      // Line breaks
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      // Handle footnotes and references with superscript
      .replace(/\[(\d+)\]/g, '<sup>[$1]</sup>')
      // Handle subscript notation
      .replace(/~(.*?)~/g, '<sub>$1</sub>')
      // Handle superscript notation
      .replace(/\^(.*?)\^/g, '<sup>$1</sup>');

    // Wrap consecutive list items
    formatted = formatted.replace(/(<li>.*?<\/li>)\s*(?=<li>)/g, '$1');
    const listPattern = /(<li>.*?<\/li>)+/g;
    formatted = formatted.replace(listPattern, (match) => {
      // Check if it's a numbered list based on original content
      const isNumbered = /^\d+\./m.test(text);
      return isNumbered ? `<ol>${match}</ol>` : `<ul>${match}</ul>`;
    });

    // Clean up extra breaks and wrap in paragraphs
    formatted = formatted.replace(/<br>\s*<br>/g, '</p><p>');
    
    // Wrap the content in paragraphs if not already wrapped
    if (!formatted.startsWith('<')) {
      formatted = `<p>${formatted}</p>`;
    }
    
    return formatted;
  };

  const extensions = useCallback(() => [
    new DocExtension(),
    new TextExtension(),
    new ParagraphExtension(),
    new BoldExtension(),
    new ItalicExtension(),
    new UnderlineExtension(),
    new HeadingExtension({ levels: [1, 2, 3] }),
    new BlockquoteExtension(),
    new CodeExtension(),
    new CodeBlockExtension(),
    new HardBreakExtension(),
    new HistoryExtension(),
    new DropCursorExtension(),
  ], []);

  const { manager, state } = useRemirror({
    extensions,
    content: formattedContent,
    stringHandler: "html",
  });

  useEffect(() => {
    if (content) {
      const formatted = formatContent(content);
      setFormattedContent(formatted);
    }
  }, [content]);

  const exportAsHTML = () => {
    const helpers = manager.helpers;
    if (helpers) {
      const html = helpers.getHTML();
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'formatted-response.html';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const exportAsMarkdown = () => {
    const helpers = manager.helpers;
    if (helpers) {
      const text = helpers.getText();
      const blob = new Blob([text], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'formatted-response.md';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-5xl max-h-[95vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Formatted Response Editor (Remirror)
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
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportAsMarkdown}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Export Markdown
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <Separator />
        
        <CardContent className="p-0">
          <ThemeProvider>
            <Remirror manager={manager} state={state}>
              <EditorToolbar />
              
              {/* Editor Content */}
              <div className="p-4 max-h-[65vh] overflow-y-auto">
                <div className="min-h-[400px] border rounded-lg p-4 prose prose-sm max-w-none focus-within:ring-2 focus-within:ring-blue-500">
                  {/* Remirror editor content is rendered here */}
                </div>
              </div>
            </Remirror>
          </ThemeProvider>
        </CardContent>
      </Card>
    </div>
  );
}