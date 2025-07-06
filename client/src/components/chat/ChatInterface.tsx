import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useChatContext } from "@/contexts/ChatContext";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Bot } from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import type { VoiceProfile } from "@shared/schema";

export default function ChatInterface() {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    selectedModel,
    setSelectedModel,
    activeVoiceProfile,
    setActiveVoiceProfile,
    currentConversation,
    createNewConversation,
  } = useChatContext();

  const { data: profiles = [] } = useQuery<VoiceProfile[]>({
    queryKey: ["/api/voice-profiles"],
    enabled: !!user,
  });

  // Set active voice profile based on profiles data
  useEffect(() => {
    if (Array.isArray(profiles) && profiles.length > 0 && !activeVoiceProfile) {
      const activeProfile = profiles.find((p: VoiceProfile) => p.isActive);
      if (activeProfile) {
        setActiveVoiceProfile(activeProfile);
      }
    }
  }, [profiles, activeVoiceProfile, setActiveVoiceProfile]);

  // Don't automatically create conversations - user must explicitly create them

  const handleNewChat = () => {
    createNewConversation();
  };

  const modelOptions = [
    { value: "gpt-4o", label: "GPT-4 (OpenAI)" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
    { value: "gemini-2.5-pro", label: "Gemini Pro" },
    { value: "gemini-2.5-flash", label: "Gemini Flash" },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      {/* Top Bar */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleNewChat}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              New Chat
            </Button>
            
            {activeVoiceProfile && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  <Bot className="h-3 w-3 mr-1" />
                  {activeVoiceProfile.name}
                </Badge>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {modelOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden min-h-0">
        <MessageList />
      </div>

      {/* Input */}
      <MessageInput />
    </div>
  );
}
