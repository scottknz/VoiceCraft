import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useChatContext } from "@/contexts/ChatContext";

interface ChatMessage {
  id: string | number;
  conversationId: number;
  role: "user" | "assistant";
  content: string;
  model: string | null;
  voiceProfileId: number | null;
  createdAt: Date;
  isTemporary?: boolean;
}

interface StreamingResponse {
  response: string;
}

export function useStreamingChat(conversationId: number | null) {
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const { selectedModel, activeVoiceProfile } = useChatContext();

  // Main streaming mutation - rebuilt to match reference implementation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ message }: { message: string }): Promise<StreamingResponse> => {
      if (!conversationId) throw new Error("No conversation selected");
      
      // Add user message immediately
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        conversationId,
        role: "user",
        content: message,
        model: null,
        voiceProfileId: null,
        createdAt: new Date(),
        isTemporary: false,
      };
      
      setLocalMessages(prev => [...prev, userMessage]);
      
      // Add temporary AI message
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
      
      // Start streaming
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setIsStreaming(true);
      setStreamingContent("");
      
      try {
        const response = await fetch("/api/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
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
          const lines = chunk.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              
              try {
                const parsed = JSON.parse(data);
                
                if (parsed.type === "start") {
                  console.log("Stream started");
                  continue;
                }
                
                if (parsed.type === "done") {
                  console.log("Stream completed");
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
                
                if (parsed.type === "error") {
                  throw new Error(parsed.error || "Streaming error");
                }
                
                // Handle content chunks
                if (parsed.content) {
                  accumulatedContent += parsed.content;
                  setStreamingContent(accumulatedContent);
                  
                  // Update UI immediately - match reference behavior
                  setLocalMessages(prev => 
                    prev.map(msg => 
                      msg.id === tempAiMessage.id 
                        ? { ...msg, content: accumulatedContent }
                        : msg
                    )
                  );
                }
              } catch (e) {
                console.error("Error parsing streaming data:", e);
              }
            }
          }
        }
        
        return { response: accumulatedContent };
      } catch (error: any) {
        console.error("Error in streaming:", error);
        setIsStreaming(false);
        
        // Remove temporary message on error
        setLocalMessages(prev => prev.filter(msg => msg.id !== tempAiMessage.id));
        
        if (error.name === 'AbortError') {
          return { response: "Request cancelled" };
        }
        throw error;
      }
    },
  });
  
  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  };
  
  return {
    localMessages,
    setLocalMessages,
    isStreaming,
    streamingContent,
    sendMessageMutation,
    stopStreaming,
  };
}