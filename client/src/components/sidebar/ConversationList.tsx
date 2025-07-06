import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Plus, X, RefreshCw } from "lucide-react";
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

  const deleteConversationMutation = useMutation({
    mutationFn: async (conversationId: number) => {
      await apiRequest("DELETE", `/api/conversations/${conversationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({
        title: "Success",
        description: "Conversation deleted successfully",
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
        description: "Failed to delete conversation",
        variant: "destructive",
      });
    },
  });

  const regenerateTitleMutation = useMutation({
    mutationFn: async (conversationId: number) => {
      await apiRequest("POST", `/api/conversations/${conversationId}/generate-title`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({
        title: "Success",
        description: "Title regenerated successfully",
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
        description: "Failed to regenerate title",
        variant: "destructive",
      });
    },
  });

  const handleDeleteConversation = (conversationId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // If we're deleting the current conversation, clear it
    if (currentConversation?.id === conversationId) {
      setCurrentConversation(null);
    }
    
    deleteConversationMutation.mutate(conversationId);
  };

  const handleRegenerateTitle = (conversationId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    regenerateTitleMutation.mutate(conversationId);
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
              className={`group cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-800 border-0 shadow-none ${
                currentConversation?.id === conversation.id
                  ? "bg-gray-100 dark:bg-gray-800"
                  : ""
              }`}
              onClick={() => handleConversationClick(conversation)}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <h4 className="text-sm truncate text-gray-900 dark:text-gray-100">
                      {conversation.title || `Conversation ${conversation.id}`}
                    </h4>
                    {currentConversation?.id === conversation.id && (
                      <Badge variant="secondary" className="text-xs">
                        Active
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-blue-100 dark:hover:bg-blue-900"
                      onClick={(e) => handleRegenerateTitle(conversation.id, e)}
                      disabled={regenerateTitleMutation.isPending}
                      title="Regenerate title"
                    >
                      <RefreshCw className="h-3 w-3 text-blue-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900"
                      onClick={(e) => handleDeleteConversation(conversation.id, e)}
                      disabled={deleteConversationMutation.isPending}
                      title="Delete conversation"
                    >
                      <X className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}