import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Plus } from "lucide-react";
import { useChatContext } from "@/contexts/ChatContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Conversation } from "@shared/schema";

export default function ConversationList() {
  const { toast } = useToast();
  const { currentConversation, setCurrentConversation } = useChatContext();

  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/conversations", {});
      return response.json();
    },
    onSuccess: (newConversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setCurrentConversation(newConversation);
      toast({
        title: "Success",
        description: "New conversation created",
      });
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

  const handleConversationClick = (conversation: Conversation) => {
    setCurrentConversation(conversation);
  };



  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Conversations
        </h3>
        <Button
          onClick={() => createConversationMutation.mutate()}
          disabled={createConversationMutation.isPending}
          size="sm"
          className="h-8 w-8 p-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2 px-4">
        {conversations.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="p-6 text-center">
              <MessageSquare className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500 mb-3">No conversations yet</p>
              <Button
                onClick={() => createConversationMutation.mutate()}
                disabled={createConversationMutation.isPending}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Start Chatting
              </Button>
            </CardContent>
          </Card>
        ) : (
          conversations.map((conversation) => (
            <Card
              key={conversation.id}
              className={`cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-800 border-0 shadow-none ${
                currentConversation?.id === conversation.id
                  ? "bg-gray-100 dark:bg-gray-800"
                  : ""
              }`}
              onClick={() => handleConversationClick(conversation)}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm truncate text-gray-900 dark:text-gray-100">
                      {conversation.title || `Conversation ${conversation.id}`}
                    </h4>
                  </div>
                  {currentConversation?.id === conversation.id && (
                    <Badge variant="secondary" className="text-xs ml-2">
                      Active
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}