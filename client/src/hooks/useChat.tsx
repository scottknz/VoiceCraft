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

  // Sync database messages with local state
  useEffect(() => {
    if (dbMessages.length > 0) {
      const formattedMessages: ChatMessage[] = dbMessages.map(msg => ({
        ...msg,
        id: msg.id,
        createdAt: new Date(msg.createdAt),
      }));
      setLocalMessages(formattedMessages);
    } else if (conversationId) {
      setLocalMessages([]);
    }
  }, [dbMessages, conversationId]);

  // Send message mutation with optimistic updates
  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, stream = true }: SendMessageOptions) => {
      if (!conversationId || !user) {
        throw new Error("No active conversation or user");
      }

      // 1. Optimistically add user message to UI
      const tempUserMessage: ChatMessage = {
        id: `temp-user-${Date.now()}`,
        conversationId,
        role: "user",
        content: message,
        model: null,
        voiceProfileId: activeVoiceProfile?.id || null,
        createdAt: new Date(),
        isTemporary: true,
      };

      setLocalMessages(prev => [...prev, tempUserMessage]);

      // 2. Save user message to database first
      const savedUserMessage = await apiRequest("POST", "/api/messages", {
        conversationId,
        role: "user",
        content: message,
      });

      // 3. Replace temporary message with saved one
      const userMessageData = await savedUserMessage.json();
      setLocalMessages(prev => 
        prev.map(msg => 
          msg.id === tempUserMessage.id 
            ? { ...userMessageData, id: userMessageData.id, createdAt: new Date(userMessageData.createdAt), isTemporary: false }
            : msg
        )
      );

      // 4. Get AI response
      console.log("About to get AI response, stream:", stream);
      if (stream) {
        console.log("Using streaming response");
        return handleStreamingResponse(conversationId, message);
      } else {
        console.log("Using regular response");
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
              
              // Save final response to database
              await apiRequest("POST", "/api/messages", {
                conversationId,
                role: "assistant",
                content: accumulatedContent,
                model: selectedModel,
                voiceProfileId: activeVoiceProfile?.id,
              });

              return { response: accumulatedContent };
            }

            try {
              const parsed = JSON.parse(data);
              console.log("Parsed streaming data:", parsed);
              
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
                
                // Update temporary message in real-time
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