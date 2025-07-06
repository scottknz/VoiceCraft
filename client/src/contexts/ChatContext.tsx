import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { VoiceProfile, Conversation } from "@shared/schema";

interface ChatContextType {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  activeVoiceProfile: VoiceProfile | null;
  setActiveVoiceProfile: (profile: VoiceProfile | null) => void;
  currentConversation: Conversation | null;
  setCurrentConversation: (conversation: Conversation | null) => void;
  createNewConversation: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedModel, setSelectedModel] = useState<string>("gpt-4o");
  const [activeVoiceProfile, setActiveVoiceProfile] = useState<VoiceProfile | null>(null);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);

  const createConversationMutation = useMutation({
    mutationFn: async (data: { title?: string }) => {
      const response = await apiRequest("POST", "/api/conversations", data);
      return response.json();
    },
    onSuccess: (conversation) => {
      setCurrentConversation(conversation);
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
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
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create conversation",
        variant: "destructive",
      });
    },
  });

  const createNewConversation = async () => {
    if (createConversationMutation.isPending || isCreatingConversation) return;
    setIsCreatingConversation(true);
    try {
      const title = `Chat ${new Date().toLocaleString()}`;
      await createConversationMutation.mutateAsync({ title });
    } finally {
      setIsCreatingConversation(false);
    }
  };

  // Load saved preferences
  useEffect(() => {
    const savedModel = localStorage.getItem("selectedModel");
    if (savedModel) {
      setSelectedModel(savedModel);
    }
  }, []);

  // Save model preference
  useEffect(() => {
    localStorage.setItem("selectedModel", selectedModel);
  }, [selectedModel]);

  const value: ChatContextType = {
    selectedModel,
    setSelectedModel,
    activeVoiceProfile,
    setActiveVoiceProfile,
    currentConversation,
    setCurrentConversation,
    createNewConversation,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
}
