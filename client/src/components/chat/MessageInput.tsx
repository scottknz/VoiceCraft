import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useChatContext } from "@/contexts/ChatContext";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, ArrowUpDown, Info } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function MessageInput() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [message, setMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  
  const {
    selectedModel,
    activeVoiceProfile,
    currentConversation,
    createNewConversation,
  } = useChatContext();

  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, stream }: { message: string; stream: boolean }) => {
      if (!currentConversation) {
        throw new Error("No active conversation");
      }

      const requestBody = {
        message,
        model: selectedModel,
        conversationId: currentConversation.id,
        voiceProfileId: activeVoiceProfile?.id,
        stream,
      };

      if (stream) {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
          credentials: "include",
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

        let accumulatedContent = "";
        
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
                    accumulatedContent += parsed.content;
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
          console.error("Streaming error:", error);
          setIsStreaming(false);
          toast({
            title: "Error",
            description: "Failed to receive streaming response",
            variant: "destructive",
          });
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
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const handleSend = async () => {
    if (!message.trim() || sendMessageMutation.isPending) return;

    // Create conversation if none exists
    if (!currentConversation) {
      await createNewConversation();
    }

    const messageToSend = message.trim();
    setMessage("");
    setIsStreaming(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Reset streaming state before sending
    window.dispatchEvent(new CustomEvent('streamingMessage', { 
      detail: { reset: true } 
    }));

    sendMessageMutation.mutate({ message: messageToSend, stream: true });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, []);

  return (
    <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Message AI Voice Assistant..."
            className="min-h-[60px] pr-12 resize-none border-slate-200 dark:border-slate-600 focus:ring-green-500 focus:border-green-500"
            disabled={sendMessageMutation.isPending || isStreaming}
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim() || sendMessageMutation.isPending || isStreaming}
            size="sm"
            className="absolute right-3 bottom-3 bg-green-600 hover:bg-green-700 text-white"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center justify-between mt-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-4">
            {activeVoiceProfile ? (
              <div className="flex items-center gap-2">
                <span>Using:</span>
                <Badge variant="outline" className="text-xs">
                  {activeVoiceProfile.name}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-green-600 hover:text-green-700 font-medium"
                >
                  <ArrowUpDown className="h-3 w-3 mr-1" />
                  Switch Profile
                </Button>
              </div>
            ) : (
              <span>No voice profile selected</span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Info className="h-3 w-3" />
            <span>Press Enter to send, Shift+Enter for new line</span>
          </div>
        </div>
      </div>
    </div>
  );
}
