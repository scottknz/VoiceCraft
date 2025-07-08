import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useChatContext } from "@/contexts/ChatContext";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput.complex";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
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
        <div className="flex items-center justify-end">
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
