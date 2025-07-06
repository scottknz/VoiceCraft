import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bot, User, Copy, Check } from "lucide-react";
import { useChatContext } from "@/contexts/ChatContext";
import { queryClient } from "@/lib/queryClient";
import type { Message } from "@shared/schema";

export default function MessageList() {
  const { currentConversation } = useChatContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [optimisticUserMessage, setOptimisticUserMessage] = useState<Message | null>(null);

  const { data: messages = [], isLoading, refetch } = useQuery<Message[]>({
    queryKey: ["/api/conversations", currentConversation?.id, "messages"],
    enabled: !!currentConversation,
    staleTime: 0,
  });

  // Listen for streaming events
  useEffect(() => {
    const handleStreamingMessage = (event: CustomEvent) => {
      const { content, done, reset } = event.detail;
      
      if (reset) {
        setStreamingMessage("");
        setIsStreaming(false);
        return;
      }
      
      if (done) {
        setStreamingMessage("");
        setIsStreaming(false);
        
        // Refetch messages to get the saved AI response
        setTimeout(() => {
          refetch();
        }, 200);
        
        return;
      }
      
      setIsStreaming(true);
      setStreamingMessage(prev => prev + content);
    };

    // Listen for new user messages
    const handleUserMessage = (event: CustomEvent) => {
      const { message } = event.detail;
      
      // Show optimistic user message immediately
      const optimisticMsg: Message = {
        id: Date.now(),
        conversationId: currentConversation?.id || 0,
        role: "user",
        content: message,
        model: null,
        voiceProfileId: null,
        createdAt: new Date()
      };
      
      setOptimisticUserMessage(optimisticMsg);
      
      // Clear optimistic message after server data loads
      setTimeout(() => {
        setOptimisticUserMessage(null);
        refetch();
      }, 1000);
    };

    window.addEventListener('streamingMessage', handleStreamingMessage as EventListener);
    window.addEventListener('userMessage', handleUserMessage as EventListener);

    return () => {
      window.removeEventListener('streamingMessage', handleStreamingMessage as EventListener);
      window.removeEventListener('userMessage', handleUserMessage as EventListener);
    };
  }, [currentConversation?.id, refetch]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessage, optimisticUserMessage]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy text: ', err);
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

  // Combine all messages for display
  const allMessages = [...messages];
  
  // Add optimistic user message if it exists and isn't already saved
  if (optimisticUserMessage && !messages.some(m => m.content === optimisticUserMessage.content)) {
    allMessages.push(optimisticUserMessage);
  }

  // Filter out system messages and sort by creation time
  const displayMessages = allMessages
    .filter(message => message.role !== "system")
    .sort((a, b) => {
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {displayMessages.length === 0 && !isStreaming ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">No messages yet. Start the conversation!</p>
        </div>
      ) : (
        <>
          {displayMessages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onCopy={copyToClipboard}
              formatTime={formatTime}
            />
          ))}
          
          {/* Streaming AI Response */}
          {isStreaming && streamingMessage && (
            <div className="flex gap-3 items-start">
              <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                  <CardContent className="p-4">
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
                  </CardContent>
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
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  const handleCopy = async () => {
    await onCopy(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`group flex gap-3 items-start ${isUser ? "flex-row-reverse" : ""}`}>
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
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${
                  isUser 
                    ? "text-green-900 dark:text-green-100" 
                    : isAssistant
                    ? "text-blue-900 dark:text-blue-100"
                    : "text-gray-900 dark:text-gray-100"
                }`}>
                  {isUser ? "You" : isAssistant ? "AI Assistant" : "System"}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatTime(message.createdAt)}
                </span>
              </div>
              {message.content && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              )}
            </div>
            <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
              {message.content}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}