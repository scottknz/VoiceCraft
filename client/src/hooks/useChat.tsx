import { useState, useEffect, useCallback, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useChatContext } from "@/contexts/ChatContext";
import type { Message, Conversation } from "@shared/schema";

interface SendMessageOptions {
  message: string;
  stream?: boolean;
}

interface ChatMessage extends Omit<Message, 'id' | 'createdAt'> {
  id: string | number;
  createdAt: Date;
  isTemporary?: boolean;
}

export function useChat(conversationId: number | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { selectedModel, activeVoiceProfile } = useChatContext();
  
  // Local state for optimistic updates and streaming
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch messages from database
  const { data: dbMessages = [], isLoading } = useQuery<Message[]>({
    queryKey: [`/api/conversations/${conversationId}/messages`],
    enabled: !!conversationId && !!user,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Clear messages when conversation changes
  useEffect(() => {
    setLocalMessages([]);
    setStreamingContent("");
    setIsStreaming(false);
  }, [conversationId]);

  // Sync database messages with local state - but preserve optimistic updates
  useEffect(() => {
    if (dbMessages.length > 0) {
      setLocalMessages(prev => {
        // If we have temporary/optimistic messages, preserve them
        const hasOptimisticMessages = prev.some(msg => 
          msg.id.toString().startsWith('user-') || 
          msg.id.toString().startsWith('temp-') ||
          msg.isTemporary
        );
        
        if (hasOptimisticMessages) {
          // Keep the optimistic messages, don't overwrite
          return prev;
        }
        
        // Otherwise sync with database
        const formattedMessages: ChatMessage[] = dbMessages.map(msg => ({
          ...msg,
          id: msg.id,
          createdAt: new Date(msg.createdAt),
        }));
        return formattedMessages;
      });
    } else if (conversationId && localMessages.length === 0) {
      setLocalMessages([]);
    }
  }, [dbMessages, conversationId]);

  // Send message mutation with optimistic updates
  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, stream = true }: SendMessageOptions) => {
      if (!conversationId || !user) {
        throw new Error("No active conversation or user");
      }

      // 1. Show user message instantly - no database wait
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        conversationId,
        role: "user",
        content: message,
        model: null,
        voiceProfileId: activeVoiceProfile?.id || null,
        createdAt: new Date(),
        isTemporary: false, // Treat as permanent for instant display
      };

      setLocalMessages(prev => [...prev, userMessage]);

      // 2. Save user message to database in background (non-blocking)
      apiRequest("POST", "/api/messages", {
        conversationId,
        role: "user",
        content: message,
      }).then(async (response) => {
        const userMessageData = await response.json();
        setLocalMessages(prev => 
          prev.map(msg => 
            msg.id === userMessage.id 
              ? { ...userMessageData, id: userMessageData.id, createdAt: new Date(userMessageData.createdAt) }
              : msg
          )
        );
      }).catch(error => {
        console.error("Background user message save failed:", error);
      });

      // 3. Start streaming immediately - match reference behavior
      console.log("Starting immediate streaming response");
      if (stream) {
        return handleStreamingResponse(conversationId, message);
      } else {
        return handleRegularResponse(conversationId, message);
      }
    },
    onSuccess: () => {
      // Invalidate and refetch messages to ensure consistency
      queryClient.invalidateQueries({ 
        queryKey: [`/api/conversations/${conversationId}/messages`] 
      });
    },
    onError: (error) => {
      console.error("Failed to send message:", error);
      // Remove temporary messages on error
      setLocalMessages(prev => prev.filter(msg => !msg.isTemporary));
    },
  });

  const handleRegularResponse = async (conversationId: number, message: string) => {
    const response = await apiRequest("POST", "/api/chat", {
      conversationId,
      message,
      model: selectedModel,
      voiceProfileId: activeVoiceProfile?.id,
    });

    const data = await response.json();
    
    if (data.response) {
      // Add AI response immediately to UI
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        conversationId,
        role: "assistant",
        content: data.response,
        model: selectedModel,
        voiceProfileId: activeVoiceProfile?.id || null,
        createdAt: new Date(),
      };

      setLocalMessages(prev => [...prev, aiMessage]);
    }

    return data;
  };

  const handleStreamingResponse = async (conversationId: number, message: string) => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    setIsStreaming(true);
    setStreamingContent("");

    // Add temporary AI message for streaming
    const tempAiMessage: ChatMessage = {
      id: `temp-ai-${Date.now()}`,
      conversationId,
      role: "assistant",
      content: "",
      model: selectedModel,
      voiceProfileId: activeVoiceProfile?.id || null,
      createdAt: new Date(),
      isTemporary: true,
    };

    setLocalMessages(prev => [...prev, tempAiMessage]);

    try {
      // Use fetch directly for streaming with proper credentials
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies for authentication
        signal: controller.signal,
        body: JSON.stringify({
          conversationId,
          message,
          model: selectedModel,
          voiceProfileId: activeVoiceProfile?.id,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      let accumulatedContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              setIsStreaming(false);
              
              // Replace temporary message with final content
              setLocalMessages(prev => 
                prev.map(msg => 
                  msg.id === tempAiMessage.id 
                    ? { ...msg, content: accumulatedContent, isTemporary: false }
                    : msg
                )
              );
              
              // No need to save here - backend already saves after streaming

              return { response: accumulatedContent };
            }

            try {
              const parsed = JSON.parse(data);
              console.log("Parsed streaming data:", parsed);
              
              // Skip status messages
              if (parsed.status === "connected") {
                return;
              }
              
              if (parsed.done) {
                console.log("Streaming complete");
                setIsStreaming(false);
                
                // Replace temporary message with final content
                setLocalMessages(prev => 
                  prev.map(msg => 
                    msg.id === tempAiMessage.id 
                      ? { ...msg, content: accumulatedContent, isTemporary: false }
                      : msg
                  )
                );

                return { response: accumulatedContent };
              }
              
              if (parsed.content) {
                console.log("Received content chunk:", parsed.content);
                accumulatedContent += parsed.content;
                setStreamingContent(accumulatedContent);
                
                // Update temporary message in real-time with better performance
                setLocalMessages(prev => 
                  prev.map(msg => 
                    msg.id === tempAiMessage.id 
                      ? { ...msg, content: accumulatedContent }
                      : msg
                  )
                );
              }
            } catch (e) {
              console.error("Error parsing streaming data:", e, "Data:", data);
            }
          }
        }
      }
    } catch (error) {
      console.error("Streaming error:", error);
      setIsStreaming(false);
      setStreamingContent("");
      // Remove temporary AI message on error and fall back to regular API
      setLocalMessages(prev => prev.filter(msg => msg.id !== tempAiMessage.id));
      
      // Fall back to regular response on streaming error
      console.log("Falling back to regular response");
      return handleRegularResponse(conversationId, message);
    } finally {
      abortControllerRef.current = null;
    }
  };

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      setStreamingContent("");
    }
  }, []);

  const sendMessage = useCallback((message: string, stream = true) => {
    console.log("sendMessage called with stream:", stream);
    sendMessageMutation.mutate({ message, stream });
  }, [sendMessageMutation]);

  return {
    messages: localMessages,
    isLoading,
    isStreaming,
    streamingContent,
    sendMessage,
    stopStreaming,
    isSending: sendMessageMutation.isPending,
  };
}