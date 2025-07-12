import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ChevronRight, 
  ChevronLeft, 
  X, 
  Maximize2, 
  Minimize2,
  Download,
  FileText,
  Code2,
  Eye
} from 'lucide-react';
import TemplateEditor from './TemplateEditor';
import type { StructureTemplate } from '@shared/schema';

interface TemplateOutputPanelProps {
  isVisible: boolean;
  onToggle: () => void;
  width: number;
  onWidthChange: (width: number) => void;
  template: StructureTemplate | null;
  content: string;
  onContentChange: (content: string, formattingInstructions?: string) => void;
}

export default function TemplateOutputPanel({
  isVisible,
  onToggle,
  width,
  onWidthChange,
  template,
  content,
  onContentChange
}: TemplateOutputPanelProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newWidth = window.innerWidth - e.clientX;
      const minWidth = 300;
      const maxWidth = window.innerWidth * 0.8;
      
      onWidthChange(Math.max(minWidth, Math.min(maxWidth, newWidth)));
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMaximize = () => {
    setIsMaximized(!isMaximized);
    if (!isMaximized) {
      onWidthChange(window.innerWidth * 0.7);
    } else {
      onWidthChange(400);
    }
  };

  if (!isVisible) {
    return (
      <div className="fixed right-4 top-1/2 -translate-y-1/2 z-50">
        <Button
          onClick={onToggle}
          size="sm"
          variant="outline"
          className="h-12 w-8 rounded-l-lg rounded-r-none shadow-lg"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div 
      className="fixed right-0 top-0 h-full bg-white dark:bg-gray-900 border-l shadow-xl z-40 flex"
      style={{ width: `${width}px` }}
    >
      {/* Resize Handle */}
      <div
        className="w-1 bg-gray-300 dark:bg-gray-600 cursor-col-resize hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
        onMouseDown={handleMouseDown}
      />
      
      {/* Panel Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="font-semibold text-sm">Template Output</h3>
              {template && (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {template.name}
                </p>
              )}
            </div>
            {template && (
              <Badge variant="outline" className="text-xs">
                {template.templateType}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              onClick={handleMaximize}
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
            >
              {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button
              onClick={onToggle}
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {template && content ? (
            <TemplateEditor
              content={content}
              onChange={(newContent, formattingInstructions) => {
                onContentChange(newContent, formattingInstructions);
              }}
              onSave={() => {}}
              title={`${template.name} Output`}
              isReadOnly={false}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-center p-8">
              <div className="space-y-3">
                <FileText className="h-12 w-12 mx-auto text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    No template output yet
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Send a message with a template selected to see formatted output
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        {template && content && (
          <div className="border-t p-3 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  <Eye className="h-3 w-3 mr-1" />
                  Preview
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  <Download className="h-3 w-3 mr-1" />
                  Export
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}