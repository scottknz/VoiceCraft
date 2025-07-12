import { useRef, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bot, User, Copy, CheckCircle2, FileText } from "lucide-react";
import { useChatContext } from "@/contexts/ChatContext";
import { useAuth } from "@/hooks/useAuth";
import { useChat } from "@/hooks/useChat";
import FormattedResponsePanel from "./FormattedResponsePanel";
import type { Message } from "@shared/schema";

interface MessageBubbleProps {
  message: any; // Accept both Message and ChatMessage types
  onCopy: () => void;
  copiedMessageId: number | null;
  formatTime: (date: Date) => string;
  onOpenFormatted: () => void;
}

function MessageBubble({ message, onCopy, copiedMessageId, formatTime, onOpenFormatted }: MessageBubbleProps) {
  const isUser = message.role === "user";
  
  return (
    <div className={`flex gap-3 items-start ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
          <Bot className="h-4 w-4 text-white" />
        </div>
      )}
      
      <div className={`flex-1 ${isUser ? 'max-w-xs' : ''}`}>
        <Card className={`${
          isUser 
            ? 'bg-blue-500 text-white ml-auto' 
            : 'bg-gray-50 dark:bg-gray-800'
        }`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-sm font-medium ${
                isUser ? 'text-blue-100' : 'text-gray-900 dark:text-gray-100'
              }`}>
                {isUser ? 'You' : 'AI Assistant'}
              </span>
              <span className={`text-xs ${
                isUser ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'
              }`}>
                {formatTime(message.createdAt instanceof Date ? message.createdAt : new Date(message.createdAt))}
              </span>
            </div>
            <div className={`text-sm whitespace-pre-wrap ${
              isUser ? 'text-white' : 'text-gray-900 dark:text-gray-100'
            }`}>
              {message.content}
            </div>
            {!isUser && (
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCopy(message.id)}
                  className="h-6 px-2 text-xs"
                >
                  {copiedMessageId === message.id ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onOpenFormatted}
                  className="h-6 px-2 text-xs"
                  title="Open formatted editor"
                >
                  <FileText className="h-3 w-3" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {isUser && (
        <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
          <User className="h-4 w-4 text-white" />
        </div>
      )}
    </div>
  );
}

export default function MessageList() {
  const { user } = useAuth();
  const { currentConversation } = useChatContext();
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null);
  const [formattedPanelOpen, setFormattedPanelOpen] = useState(false);
  const [selectedMessageContent, setSelectedMessageContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use the optimized messages from useChat that include instant updates
  const { messages, isLoading, isStreaming } = useChat(currentConversation?.id || null);

  // Messages come from useChat which handles optimistic updates
  const displayMessages = messages;

  // Auto-scroll to bottom when new messages arrive
  const messageCount = displayMessages.length;
  useEffect(() => {
    if (messageCount > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messageCount]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const copyToClipboard = async (messageId: number) => {
    const message = displayMessages.find(m => Number(m.id) === messageId);
    if (message) {
      await navigator.clipboard.writeText(message.content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    }
  };

  const openFormattedPanel = (content: string) => {
    setSelectedMessageContent(content);
    setFormattedPanelOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <Bot className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse" />
          <p className="text-sm">Loading conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-full" style={{ scrollbarWidth: 'thin' }}>
      {displayMessages.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">No messages yet. Start the conversation!</p>
        </div>
      ) : (
        <>
          {displayMessages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message as Message}
              onCopy={() => copyToClipboard(Number(message.id))}
              copiedMessageId={copiedMessageId}
              formatTime={formatTime}
              onOpenFormatted={() => openFormattedPanel(message.content)}
            />
          ))}
        </>
      )}
      <div ref={messagesEndRef} />
      
      <FormattedResponsePanel
        content={selectedMessageContent}
        isOpen={formattedPanelOpen}
        onClose={() => setFormattedPanelOpen(false)}
      />
    </div>
  );
}