import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useChatContext } from "@/contexts/ChatContext";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Bot, User } from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import type { Message } from "@shared/schema";

export default function MessageList() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { currentConversation } = useChatContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [typingMessage, setTypingMessage] = useState<string>("");
  const [isTyping, setIsTyping] = useState(false);

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["/api/conversations", currentConversation?.id, "messages"],
    enabled: !!currentConversation?.id,
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
      }
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingMessage]);

  // Handle streaming messages
  useEffect(() => {
    const handleStreamingMessage = (event: CustomEvent) => {
      const { content, done } = event.detail;
      
      if (done) {
        setIsTyping(false);
        setTypingMessage("");
        // Refetch messages to get the complete message
        // This will be handled by the ChatContext
      } else {
        setIsTyping(true);
        setTypingMessage(prev => prev + content);
      }
    };

    window.addEventListener('streamingMessage', handleStreamingMessage as EventListener);
    return () => {
      window.removeEventListener('streamingMessage', handleStreamingMessage as EventListener);
    };
  }, []);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getModelDisplayName = (model: string) => {
    switch (model) {
      case "gpt-4o":
        return "GPT-4";
      case "gpt-3.5-turbo":
        return "GPT-3.5";
      case "gemini-2.5-pro":
        return "Gemini Pro";
      case "gemini-2.5-flash":
        return "Gemini Flash";
      default:
        return model;
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-slate-500">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {messages.length === 0 && !isTyping ? (
          <div className="text-center py-12">
            <Bot className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
              Welcome to AI Voice Assistant
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
              Start a conversation by typing a message below. I'll adapt my responses to match your selected voice profile.
            </p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <Avatar className="h-8 w-8 bg-green-600">
                    <AvatarFallback className="bg-green-600 text-white">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div className={`max-w-[70%] ${message.role === "user" ? "order-2" : ""}`}>
                  <Card className={`${
                    message.role === "user" 
                      ? "bg-green-600 text-white border-green-600" 
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  }`}>
                    <CardContent className="p-4">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {message.content}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <div className={`flex items-center gap-2 mt-2 text-xs text-slate-500 dark:text-slate-400 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}>
                    <span>{formatTime(message.createdAt)}</span>
                    {message.role === "assistant" && message.model && (
                      <>
                        <span>•</span>
                        <Badge variant="outline" className="text-xs">
                          {getModelDisplayName(message.model)}
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
                
                {message.role === "user" && (
                  <Avatar className="h-8 w-8 bg-blue-600 order-3">
                    <AvatarFallback className="bg-blue-600 text-white">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            
            {/* Typing indicator */}
            {isTyping && (
              <div className="flex gap-3 justify-start">
                <Avatar className="h-8 w-8 bg-green-600">
                  <AvatarFallback className="bg-green-600 text-white">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                
                <div className="max-w-[70%]">
                  <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <CardContent className="p-4">
                      {typingMessage ? (
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">
                          {typingMessage}
                          <span className="animate-pulse">|</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></div>
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                          </div>
                          <span className="text-sm text-slate-500">AI is typing...</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </>
        )}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
