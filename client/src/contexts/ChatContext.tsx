import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
  accumulatedContent: string;
  setAccumulatedContent: React.Dispatch<React.SetStateAction<string>>;
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
  const [accumulatedContent, setAccumulatedContent] = useState<string>("");

  // Query conversations to auto-select the most recent one
  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    enabled: !!user,
    retry: false,
  });

  // Query voice profiles to track active profile
  const { data: voiceProfiles = [] } = useQuery<VoiceProfile[]>({
    queryKey: ["/api/voice-profiles"],
    enabled: !!user,
    retry: false,
  });

  // Auto-select the most recent conversation when conversations load, but handle deletions
  useEffect(() => {
    if (conversations.length > 0) {
      // If no current conversation, select the first one (most recent)
      if (!currentConversation) {
        console.log("Auto-selecting first conversation:", conversations[0]);
        setCurrentConversation(conversations[0]);
      } else {
        // If current conversation was deleted, select the first one or clear if none
        const stillExists = conversations.find(c => c.id === currentConversation.id);
        if (!stillExists) {
          console.log("Current conversation deleted, selecting first:", conversations[0]);
          setCurrentConversation(conversations[0] || null);
        }
        // Do not auto-select if current conversation still exists - prevents bouncing
      }
    } else if (currentConversation) {
      // If all conversations are deleted, clear current conversation
      console.log("No conversations left, clearing current conversation");
      setCurrentConversation(null);
    }
  }, [conversations.length, currentConversation?.id]); // Use specific dependencies to prevent over-triggering

  // Track active voice profile and ensure it updates when profiles change
  useEffect(() => {
    const activeProfile = voiceProfiles.find(profile => profile.isActive);
    if (activeProfile && (!activeVoiceProfile || activeVoiceProfile.id !== activeProfile.id)) {
      console.log("Setting active voice profile:", activeProfile.name);
      setActiveVoiceProfile(activeProfile);
    } else if (!activeProfile && activeVoiceProfile) {
      console.log("Clearing active voice profile");
      setActiveVoiceProfile(null);
    }
  }, [voiceProfiles, activeVoiceProfile]);

  const createConversationMutation = useMutation({
    mutationFn: async (data: { title?: string }) => {
      const response = await apiRequest("POST", "/api/conversations", data);
      return response.json();
    },
    onSuccess: (conversation) => {
      console.log("New conversation created:", conversation);
      
      // Set the new conversation immediately to prevent auto-selection interference
      setCurrentConversation(conversation);
      
      // Invalidate conversations query to refresh the list
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
    const validModels = ["gpt-4o", "gpt-3.5-turbo", "gemini-2.5-pro", "gemini-2.5-flash"];
    if (savedModel && validModels.includes(savedModel)) {
      setSelectedModel(savedModel);
    } else {
      // Reset to default if invalid model is stored
      setSelectedModel("gpt-4o");
      localStorage.setItem("selectedModel", "gpt-4o");
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
    accumulatedContent,
    setAccumulatedContent,
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
