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
  const [chatHistory, setChatHistory] = useState<Message[]>([]);

  // Fetch messages from database and maintain in state
  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: [`/api/conversations/${currentConversation?.id}/messages`],
    enabled: !!currentConversation,
    staleTime: 0,
  });

  // Track the current conversation ID to detect conversation changes
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);

  // Update chat history when conversation changes or messages are loaded
  useEffect(() => {
    const conversationId = currentConversation?.id || null;
    const conversationChanged = conversationId !== currentConversationId;
    
    if (conversationChanged) {
      console.log(`Conversation changed from ${currentConversationId} to ${conversationId}`);
      setCurrentConversationId(conversationId);
    }
    
    if (messages.length > 0) {
      console.log(`Loaded ${messages.length} messages from database, updating chat history`);
      // Update chat history when conversation changes or when we have no messages
      if (chatHistory.length === 0 || conversationChanged) {
        setChatHistory(messages);
      }
    } else if (messages.length === 0 && currentConversation && conversationChanged) {
      // Only clear if we're switching to a different empty conversation
      console.log("Clearing chat history for empty conversation");
      setChatHistory([]);
    }
  }, [messages, currentConversation, currentConversationId, chatHistory.length]);

  // Debug: Log chat history changes
  useEffect(() => {
    console.log(`Chat history updated: ${chatHistory.length} messages`);
  }, [chatHistory]);

  // Listen for events to manage chat history
  useEffect(() => {
    const handleUserMessage = (event: CustomEvent) => {
      const { message } = event.detail;
      console.log("Adding user message to chat history");
      
      // Add user message to chat history immediately
      const userMessage: Message = {
        id: Date.now(), // Temporary ID
        conversationId: currentConversation?.id || 0,
        role: "user",
        content: message,
        model: null,
        voiceProfileId: null,
        createdAt: new Date()
      };
      
      setChatHistory(prev => [...prev, userMessage]);
    };

    const handleMessageSaved = (event: CustomEvent) => {
      const { type } = event.detail;
      console.log(`${type} message saved to database - NOT refreshing to preserve temp messages`);
      
      // Don't automatically refresh - this was causing message loss
      // queryClient.invalidateQueries({ 
      //   queryKey: ["/api/conversations", currentConversation?.id, "messages"] 
      // });
    };

    const handleStreamingMessage = (event: CustomEvent) => {
      const { content, done, reset, fullResponse } = event.detail;
      
      console.log("StreamingMessage event received:", { content, done, reset, fullResponse });
      
      if (reset) {
        setStreamingMessage("");
        setIsStreaming(false);
        return;
      }
      
      if (done) {
        setStreamingMessage("");
        setIsStreaming(false);
        
        // Add the complete AI response to chat history
        if (fullResponse) {
          console.log("Adding AI response to chat history:", fullResponse);
          const aiMessage: Message = {
            id: Date.now(), // Temporary ID
            conversationId: currentConversation?.id || 0,
            role: "assistant",
            content: fullResponse,
            model: null,
            voiceProfileId: null,
            createdAt: new Date()
          };
          
          console.log("Adding AI message to chat history, current length:", chatHistory.length);
          setChatHistory(prev => {
            const newHistory = [...prev, aiMessage];
            console.log("New chat history length:", newHistory.length);
            return newHistory;
          });
        } else {
          console.log("No fullResponse provided in done event");
        }
        return;
      }
      
      setIsStreaming(true);
      setStreamingMessage(prev => prev + content);
    };

    window.addEventListener('userMessage', handleUserMessage as EventListener);
    window.addEventListener('messageSaved', handleMessageSaved as EventListener);
    window.addEventListener('streamingMessage', handleStreamingMessage as EventListener);

    return () => {
      window.removeEventListener('userMessage', handleUserMessage as EventListener);
      window.removeEventListener('messageSaved', handleMessageSaved as EventListener);
      window.removeEventListener('streamingMessage', handleStreamingMessage as EventListener);
    };
  }, [currentConversation?.id]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessage]);

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

  // Filter system messages and sort by creation time from chatHistory
  const displayMessages = chatHistory
    .filter(message => message.role !== "system")
    .sort((a, b) => {
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

  console.log(`Displaying ${displayMessages.length} messages from chat history`);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-full" style={{ scrollbarWidth: 'thin' }}>
      {displayMessages.length === 0 && !isStreaming ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">No messages yet. Start the conversation!</p>
        </div>
      ) : (
        <>
          {/* Display all saved messages from database */}
          {displayMessages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onCopy={copyToClipboard}
              formatTime={formatTime}
            />
          ))}
          
          {/* Show streaming response in memory (not yet saved) */}
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