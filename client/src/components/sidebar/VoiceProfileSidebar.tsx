import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import VoiceProfileModal from "./VoiceProfileModal";
import { Plus, FileText, Calendar, MoreVertical, User, Settings, LogOut, X } from "lucide-react";
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
      }
    },
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      <div className="w-full bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Voice Profiles</h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="lg:hidden"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          <Button
            onClick={() => setShowModal(true)}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Voice Profile
          </Button>
        </div>

        {/* Profiles List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-3">
                    <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded mb-2"></div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-600 rounded mb-2"></div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-600 rounded w-3/4"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-500 dark:text-slate-400 mb-2">No voice profiles yet</p>
              <p className="text-sm text-slate-400 dark:text-slate-500">
                Create your first voice profile to get started
              </p>
            </div>
          ) : (
            profiles.map((profile) => (
              <Card
                key={profile.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  profile.isActive 
                    ? "border-green-500 bg-green-50 dark:bg-green-900/20" 
                    : "hover:border-green-300"
                }`}
                onClick={() => handleProfileClick(profile)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-slate-900 dark:text-white">{profile.name}</h3>
                    <div className="flex items-center gap-1">
                      {profile.isActive && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          Active
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProfile(profile);
                        }}
                      >
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {profile.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">
                      {profile.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <FileText className="h-3 w-3" />
                    <span>{profile.samplesCount || 0} samples</span>
                    <Calendar className="h-3 w-3 ml-2" />
                    <span>Updated {formatDate(profile.updatedAt || profile.createdAt)}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white font-medium">
              {user?.firstName?.[0] || user?.email?.[0] || "U"}
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm text-slate-900 dark:text-white">
                {user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : user?.email}
              </p>
              {user?.email && user?.firstName && (
                <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
              )}
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            onClick={() => window.location.href = "/api/logout"}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Voice Profile Modal */}
      <VoiceProfileModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        profile={selectedProfile}
      />
    </>
  );
}
