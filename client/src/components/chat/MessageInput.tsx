import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Square } from "lucide-react";
import { useChatContext } from "@/contexts/ChatContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function MessageInput() {
  const [message, setMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [accumulatedContent, setAccumulatedContent] = useState("");
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const {
    selectedModel,
    activeVoiceProfile,
    currentConversation,
    createNewConversation,
  } = useChatContext();

  const stopStreaming = async () => {
    if (abortController && currentConversation) {
      // Save accumulated content before aborting
      if (accumulatedContent.trim()) {
        try {
          await apiRequest("POST", "/api/messages", {
            conversationId: currentConversation.id,
            role: "assistant",
            content: accumulatedContent.trim(),
          });
          // Refresh messages
          queryClient.invalidateQueries({ 
            queryKey: ["/api/conversations", currentConversation.id, "messages"] 
          });
        } catch (error) {
          console.error("Failed to save partial response:", error);
        }
      }
      
      abortController.abort();
      setAbortController(null);
      setIsStreaming(false);
      setAccumulatedContent("");
      
      // Dispatch stop event to reset UI
      window.dispatchEvent(new CustomEvent('streamingMessage', { 
        detail: { content: "", done: true, reset: true } 
      }));
    }
  };

  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, stream }: { message: string; stream: boolean }) => {
      if (!currentConversation) {
        throw new Error("No active conversation");
      }

      const requestBody = {
        conversationId: currentConversation.id,
        message,
        model: selectedModel,
        stream: stream,
        voiceProfileId: activeVoiceProfile?.id,
      };

      if (stream) {
        const controller = new AbortController();
        setAbortController(controller);

        const response = await apiRequest("POST", "/api/chat", requestBody, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response;
      } else {
        const response = await apiRequest("POST", "/api/chat", requestBody);
        return response.json();
      }
    },
    onSuccess: async (response) => {
      if (response instanceof Response) {
        // Handle streaming response
        const reader = response.body?.getReader();
        if (!reader) return;

        setAccumulatedContent(""); // Reset at start
        
        try {
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
                  setAbortController(null);
                  setAccumulatedContent("");
                  // Refresh messages to get the complete saved message
                  queryClient.invalidateQueries({ 
                    queryKey: ["/api/conversations", currentConversation?.id, "messages"] 
                  });
                  // Dispatch done event
                  window.dispatchEvent(new CustomEvent('streamingMessage', { 
                    detail: { content: "", done: true } 
                  }));
                  return;
                }

                try {
                  const parsed = JSON.parse(data);
                  if (parsed.content) {
                    setAccumulatedContent(prev => prev + parsed.content);
                    // Dispatch streaming event
                    window.dispatchEvent(new CustomEvent('streamingMessage', { 
                      detail: { content: parsed.content, done: false } 
                    }));
                  }
                } catch (e) {
                  // Ignore parsing errors
                }
              }
            }
          }
        } catch (error) {
          setIsStreaming(false);
          setAbortController(null);
          setAccumulatedContent("");
          
          if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))) {
            console.log("Streaming aborted by user");
            // Don't show error toast for user-initiated aborts
            return;
          } else {
            console.error("Streaming error:", error);
            toast({
              title: "Error",
              description: "Failed to receive streaming response",
              variant: "destructive",
            });
          }
        }
      } else {
        // Handle non-streaming response
        queryClient.invalidateQueries({ 
          queryKey: ["/api/conversations", currentConversation?.id, "messages"] 
        });
      }
    },
    onError: (error) => {
      setIsStreaming(false);
      setAbortController(null);
      setAccumulatedContent("");
      
      if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))) {
        console.log("Request aborted by user");
        // Don't show error toast for user-initiated aborts
        return;
      }
      
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      console.error("Chat error:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const handleMessageChange = async (value: string) => {
    setMessage(value);
    
    // Auto-create conversation when user starts typing if none exists
    if (value.trim() && !currentConversation && !isCreatingConversation) {
      setIsCreatingConversation(true);
      try {
        await createNewConversation();
      } catch (error) {
        console.error("Failed to auto-create conversation:", error);
      } finally {
        setIsCreatingConversation(false);
      }
    }
  };

  const handleSend = async () => {
    if (!message.trim() || sendMessageMutation.isPending) return;

    // Auto-create conversation if none exists
    if (!currentConversation && !isCreatingConversation) {
      setIsCreatingConversation(true);
      try {
        await createNewConversation();
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to create conversation",
          variant: "destructive",
        });
        return;
      } finally {
        setIsCreatingConversation(false);
      }
    }

    setIsStreaming(true);
    sendMessageMutation.mutate({ 
      message: message.trim(), 
      stream: true 
    });
    setMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const isLoading = sendMessageMutation.isPending || isStreaming || isCreatingConversation;

  return (
    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center space-x-2">
        <Input
          ref={inputRef}
          placeholder={isCreatingConversation ? "Creating conversation..." : "Type your message..."}
          value={message}
          onChange={(e) => handleMessageChange(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
          className="flex-1"
        />
        {isStreaming ? (
          <Button
            onClick={stopStreaming}
            variant="destructive"
            size="sm"
            className="px-3"
          >
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSend}
            disabled={!message.trim() || isLoading}
            size="sm"
            className="px-3"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}