import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import DetailedVoiceProfileModal from "./DetailedVoiceProfileModal";
import ConversationList from "./ConversationList";
import { Plus, FileText, Calendar, MoreVertical, User, Settings, LogOut, X, RefreshCw, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { VoiceProfile } from "@shared/schema";

interface VoiceProfileSidebarProps {
  onClose: () => void;
}

export default function VoiceProfileSidebar({ onClose }: VoiceProfileSidebarProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<VoiceProfile | null>(null);

  const { data: profiles = [], isLoading } = useQuery<VoiceProfile[]>({
    queryKey: ["/api/voice-profiles"],
    enabled: !!user,
  });

  const activateProfileMutation = useMutation({
    mutationFn: async (profileId: number) => {
      await apiRequest("POST", `/api/voice-profiles/${profileId}/activate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/voice-profiles"] });
      toast({
        title: "Success",
        description: "Voice profile activated successfully",
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
        description: "Failed to activate voice profile",
        variant: "destructive",
      });
    },
  });

  const deleteProfileMutation = useMutation({
    mutationFn: async (profileId: number) => {
      await apiRequest("DELETE", `/api/voice-profiles/${profileId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/voice-profiles"] });
      toast({
        title: "Success",
        description: "Voice profile deleted successfully",
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
        description: "Failed to delete voice profile",
        variant: "destructive",
      });
    },
  });

  const handleProfileClick = (profile: VoiceProfile) => {
    if (!profile.isActive) {
      activateProfileMutation.mutate(profile.id);
    }
  };

  const openCreateModal = () => {
    setSelectedProfile(null);
    setShowModal(true);
  };

  const openEditModal = (profile: VoiceProfile) => {
    setSelectedProfile(profile);
    setShowModal(true);
  };

  const refreshProfilesMutation = useMutation({
    mutationFn: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/voice-profiles"] });
      await queryClient.refetchQueries({ queryKey: ["/api/voice-profiles"] });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Voice profiles refreshed",
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to refresh voice profiles",
        variant: "destructive",
      });
    },
  });

  const handleDeleteProfile = (profileId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this voice profile?")) {
      deleteProfileMutation.mutate(profileId);
    }
  };

  const handleRefreshProfiles = (e: React.MouseEvent) => {
    e.stopPropagation();
    refreshProfilesMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
          </div>
        </div>
        <div className="flex-1 p-4 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            AI Assistant
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Voice profiles and conversations
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Voice Profiles Section */}
        <div className="py-4">
          <div className="flex items-center justify-between px-4 mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <User className="h-5 w-5" />
              Voice Profiles
            </h3>
            <Button
              onClick={openCreateModal}
              size="sm"
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2 px-4">
            {profiles.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="p-6 text-center">
                  <User className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 mb-3">No voice profiles yet</p>
                  <Button onClick={openCreateModal} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Profile
                  </Button>
                </CardContent>
              </Card>
            ) : (
              profiles.map((profile) => (
                <Card
                  key={profile.id}
                  className={`cursor-pointer transition-all hover:shadow-md group ${
                    profile.isActive
                      ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950"
                      : ""
                  }`}
                  onClick={() => handleProfileClick(profile)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm truncate">
                            {profile.name}
                          </h4>
                          <Badge 
                            variant="secondary"
                            className={`text-xs cursor-pointer transition-colors ${
                              profile.isActive 
                                ? "!bg-green-500 hover:!bg-green-600 !text-white !border-green-500" 
                                : "hover:bg-gray-200 dark:hover:bg-gray-600"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!profile.isActive) {
                                activateProfileMutation.mutate(profile.id);
                              }
                            }}
                          >
                            {profile.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">
                          {profile.description || "No description"}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {profile.samplesCount || 0} samples
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {profile.createdAt
                              ? new Date(profile.createdAt).toLocaleDateString()
                              : "Unknown"}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-blue-100 dark:hover:bg-blue-900"
                          onClick={handleRefreshProfiles}
                          disabled={refreshProfilesMutation.isPending}
                          title="Refresh profiles"
                        >
                          <RefreshCw className="h-3 w-3 text-blue-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(profile);
                          }}
                          title="Edit profile"
                        >
                          <MoreVertical className="h-3 w-3 text-gray-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900"
                          onClick={(e) => handleDeleteProfile(profile.id, e)}
                          disabled={deleteProfileMutation.isPending}
                          title="Delete profile"
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        <Separator />

        {/* Conversations Section */}
        <div className="py-4">
          <ConversationList />
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user && typeof user === 'object' && 'firstName' in user && user.firstName
                  ? user.firstName.charAt(0).toUpperCase()
                  : user && typeof user === 'object' && 'email' in user && user.email
                  ? user.email.charAt(0).toUpperCase()
                  : "U"}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user && typeof user === 'object' && 'firstName' in user && user.firstName
                  ? `${user.firstName}${user && 'lastName' in user && user.lastName ? ` ${user.lastName}` : ''}`
                  : user && typeof user === 'object' && 'email' in user && user.email
                  ? user.email
                  : "User"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user && typeof user === 'object' && 'email' in user && user.email ? user.email : "No email"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => {
                window.location.href = "/api/logout";
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <DetailedVoiceProfileModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          profile={selectedProfile}
        />
      )}
    </div>
  );
}