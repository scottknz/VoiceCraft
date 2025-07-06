import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, User, Bot, Clock } from "lucide-react";
import { useChatContext } from "@/contexts/ChatContext";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { Message } from "@shared/schema";

export default function MessageList() {
  const { currentConversation } = useChatContext();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["/api/conversations", currentConversation?.id, "messages"],
    enabled: !!currentConversation,
    refetchInterval: isStreaming ? 1000 : false, // Poll while streaming
    staleTime: 0, // Always consider data stale to ensure fresh fetches
  });

  // Handle streaming messages
  useEffect(() => {
    const handleStreamingMessage = (event: CustomEvent) => {
      const { content, done, reset } = event.detail;
      
      if (reset) {
        setStreamingMessage("");
        setIsStreaming(false);
        return;
      }
      
      if (done) {
        // Use setQueryData to persist the accumulated streaming message
        queryClient.setQueryData(
          ["/api/conversations", currentConversation?.id, "messages"],
          (oldData: Message[] | undefined) => {
            if (!oldData) return oldData;
            
            // Check if streaming message already exists as a saved message
            const hasStreamingMessage = streamingMessage.trim();
            if (!hasStreamingMessage) return oldData;
            
            // Create a temporary message object for the completed streaming message
            const streamMessage: Message = {
              id: Date.now(), // Temporary ID, will be replaced when real data loads
              conversationId: currentConversation?.id || 0,
              role: "assistant",
              content: streamingMessage,
              model: null,
              voiceProfileId: null,
              createdAt: new Date()
            };
            
            return [...oldData, streamMessage];
          }
        );
        
        setStreamingMessage("");
        setIsStreaming(false);
        
        // Invalidate after a delay to load the real saved message
        setTimeout(() => {
          queryClient.invalidateQueries({ 
            queryKey: ["/api/conversations", currentConversation?.id, "messages"],
            refetchType: 'all'
          });
        }, 500);
        return;
      }
      
      if (content) {
        setIsStreaming(true);
        setStreamingMessage(prev => prev + content);
      }
    };

    window.addEventListener('streamingMessage', handleStreamingMessage as EventListener);
    return () => {
      window.removeEventListener('streamingMessage', handleStreamingMessage as EventListener);
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessage]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: "Message copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy message",
        variant: "destructive",
      });
    }
  };

  const formatTime = (date: Date | string | null) => {
    if (!date) return "";
    const messageTime = new Date(date);
    return messageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!currentConversation) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">Welcome to AI Assistant</h3>
          <p className="text-sm">Start a new conversation or select an existing one from the sidebar</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 p-4">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 && !isStreaming ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">No messages yet. Start the conversation!</p>
        </div>
      ) : (
        <>
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onCopy={copyToClipboard}
              formatTime={formatTime}
            />
          ))}
          
          {/* Streaming message */}
          {isStreaming && streamingMessage && (
            <div className="flex gap-3 items-start">
              <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        AI Assistant
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        Typing...
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                      {streamingMessage}
                      <span className="animate-pulse">▋</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
  onCopy: (text: string) => Promise<void>;
  formatTime: (date: Date | string | null) => string;
}

function MessageBubble({ message, onCopy, formatTime }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  return (
    <div className={`flex gap-3 items-start ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser 
          ? "bg-green-500" 
          : isAssistant 
          ? "bg-blue-500" 
          : "bg-gray-500"
      }`}>
        {isUser ? (
          <User className="h-4 w-4 text-white" />
        ) : (
          <Bot className="h-4 w-4 text-white" />
        )}
      </div>
      
      <div className={`flex-1 ${isUser ? "text-right" : ""}`}>
        <Card className={`${
          isUser 
            ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800" 
            : isAssistant
            ? "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800"
            : "bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800"
        }`}>
          <div className="p-4">
            <div className={`flex items-center gap-2 mb-2 ${isUser ? "justify-end" : ""}`}>
              <span className={`text-sm font-medium ${
                isUser 
                  ? "text-green-900 dark:text-green-100" 
                  : isAssistant
                  ? "text-blue-900 dark:text-blue-100"
                  : "text-gray-900 dark:text-gray-100"
              }`}>
                {isUser ? "You" : isAssistant ? "AI Assistant" : "System"}
              </span>
              {message.createdAt && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  <span>{formatTime(message.createdAt)}</span>
                </div>
              )}
            </div>
            
            <div className={`text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap ${
              isUser ? "text-right" : ""
            }`}>
              {message.content}
            </div>
            
            <div className={`mt-2 flex gap-1 ${isUser ? "justify-start" : "justify-end"}`}>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onCopy(message.content)}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}