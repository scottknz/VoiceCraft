import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    addTemporaryMessage, // 👈 hypothetical hook to show message in chat immediately
  } = useChatContext();

  const { sendMessage, stopStreaming, isSending, isStreaming } = useChat(
    currentConversation?.id || null
  );

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    retry: false,
  });

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed || isSending) return;

    // Immediately show prompt in UI
    addTemporaryMessage({
      role: "user",
      content: trimmed,
      conversationId: currentConversation?.id ?? -1, // fallback id
      createdAt: new Date(),
    });

    setMessage(""); // Clear input instantly

    try {
      // Fire off conversation creation in parallel
      if (!currentConversation && conversations.length === 0 && !isCreatingConversation) {
        setIsCreatingConversation(true);
        try {
          await createNewConversation();
        } catch (error) {
          if (isUnauthorizedError(error as Error)) {
            toast({ title: "Session expired", description: "Please log in again", variant: "destructive" });
            window.location.href = "/api/login";
          } else {
            toast({ title: "Conversation error", description: "Could not create conversation", variant: "destructive" });
          }
          return;
        } finally {
          setIsCreatingConversation(false);
        }
      }

      // Now stream the response
      await sendMessage(trimmed, true);
    } catch (error) {
      console.error("Send failed", error);
      toast({
        title: "Error",
        description: "Message send failed. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-center space-x-2 w-full">
      <Input
        ref={inputRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
        placeholder="Type your message..."
        disabled={isSending || isStreaming}
      />
      <Button onClick={handleSend} disabled={!message.trim() || isSending}>
        Send
      </Button>
    </div>
  );
}
