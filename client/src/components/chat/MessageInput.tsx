import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send } from "lucide-react";
import { useChatContext } from "@/contexts/ChatContext";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import type { Conversation } from "@shared/schema";

export default function MessageInput() {
  const [message, setMessage] = useState("");
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const {
    activeVoiceProfile,
    currentConversation,
    createNewConversation,
    selectedModel,
  } = useChatContext();

  // Query to check if any conversations exist
  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    retry: false,
  });

  // Auto-create conversation only when user sends a message and no conversations exist
  const autoCreateConversationForMessage = async () => {
    if (conversations.length === 0 && !currentConversation && !isCreatingConversation) {
      setIsCreatingConversation(true);
      try {
        await createNewConversation();
      } catch (error) {
        console.error("Failed to auto-create conversation:", error);
        if (isUnauthorizedError(error as Error)) {
          toast({
            title: "Session expired",
            description: "Please log in again",
            variant: "destructive",
          });
          window.location.href = "/api/login";
        }
        throw error; // Re-throw to prevent message sending
      } finally {
        setIsCreatingConversation(false);
      }
    }
  };

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      if (!currentConversation) {
        throw new Error("No active conversation");
      }

      // Save user message first
      await apiRequest("POST", "/api/messages", {
        conversationId: currentConversation.id,
        role: "user",
        content: messageText,
      });

      // Get AI response
      const response = await apiRequest("POST", "/api/chat", {
        conversationId: currentConversation.id,
        message: messageText,
        model: selectedModel,
        voiceProfileId: activeVoiceProfile?.id,
      });

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch messages
      queryClient.invalidateQueries({ 
        queryKey: [`/api/conversations/${currentConversation?.id}/messages`] 
      });
    },
    onError: (error) => {
      console.error("Failed to send message:", error);
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Session expired",
          description: "Please log in again",
          variant: "destructive",
        });
        window.location.href = "/api/login";
      } else {
        toast({
          title: "Error",
          description: "Failed to send message. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const handleSend = async () => {
    if (!message.trim() || sendMessageMutation.isPending) return;

    // Auto-create conversation if none exist and user is sending a message
    if (!currentConversation && conversations.length === 0) {
      try {
        await autoCreateConversationForMessage();
      } catch (error) {
        return; // Don't send message if conversation creation failed
      }
    }

    // Ensure we have a conversation after auto-creation
    if (!currentConversation) {
      toast({
        title: "No conversation selected",
        description: "Please select a conversation or create a new one",
        variant: "destructive",
      });
      return;
    }

    const messageText = message.trim();
    setMessage("");

    sendMessageMutation.mutate(messageText);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Focus input when conversation changes
  useEffect(() => {
    if (currentConversation && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentConversation]);

  return (
    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
      {activeVoiceProfile && (
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            Voice: {activeVoiceProfile.name}
          </Badge>
          {activeVoiceProfile.description && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {activeVoiceProfile.description}
            </span>
          )}
        </div>
      )}
      <div className="flex items-center space-x-2">
        <Input
          ref={inputRef}
          placeholder={
            isCreatingConversation 
              ? "Creating conversation..." 
              : sendMessageMutation.isPending
              ? "Sending..."
              : "Type your message..."
          }
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={sendMessageMutation.isPending || isCreatingConversation}
          className="flex-1"
        />
        <Button
          onClick={handleSend}
          disabled={!message.trim() || sendMessageMutation.isPending || isCreatingConversation}
          size="sm"
          className="px-3"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}