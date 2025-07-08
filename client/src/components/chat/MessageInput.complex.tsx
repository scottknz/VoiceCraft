import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, Square } from "lucide-react";
import { useChat } from "@/hooks/useChat";
import { useChatContext } from "@/contexts/ChatContext";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Conversation } from "@shared/schema";

export default function MessageInput() {
  const [message, setMessage] = useState("");
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const {
    activeVoiceProfile,
    currentConversation,
    createNewConversation,
  } = useChatContext();

  const { sendMessage, addUserMessageToUI, stopStreaming, isSending, isStreaming } = useChat(
    currentConversation?.id || null
  );

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

  const handleSend = async () => {
    if (!message.trim() || isSending) return;

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
    
    // Clear input immediately before any async operations
    setMessage("");

    // Add user message to UI instantly
    addUserMessageToUI(messageText);

    // Send message asynchronously without blocking UI
    sendMessage(messageText, true).catch(error => {
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
        // Restore message on error
        setMessage(messageText);
      }
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMessageChange = (value: string) => {
    setMessage(value);
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
              : isSending
              ? "Sending..."
              : "Type your message..."
          }
          value={message}
          onChange={(e) => handleMessageChange(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isSending || isCreatingConversation}
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
            disabled={!message.trim() || isSending || isCreatingConversation}
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