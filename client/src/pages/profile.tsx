import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Settings, 
  Shield, 
  Activity, 
  Monitor, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Calendar,
  MapPin,
  Globe,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import type { User as UserType, UserSession, SecurityEvent } from "@shared/schema";

export default function Profile() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    preferredLanguage: 'en',
    timezone: ''
  });

  // Fetch user sessions
  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['/api/auth/sessions'],
    enabled: !!user,
  });

  // Fetch security events
  const { data: securityEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ['/api/auth/security-events'],
    enabled: !!user,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Terminate session mutation
  const terminateSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return await apiRequest(`/api/auth/sessions/${sessionId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: "Session Terminated",
        description: "The session has been terminated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/sessions'] });
    },
    onError: (error) => {
      toast({
        title: "Termination Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Terminate all sessions mutation
  const terminateAllSessionsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/auth/sessions', {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: "All Sessions Terminated",
        description: "All your sessions have been terminated.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/sessions'] });
    },
    onError: (error) => {
      toast({
        title: "Termination Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        preferredLanguage: user.preferredLanguage || 'en',
        timezone: user.timezone || ''
      });
    }
  }, [user]);

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData);
  };

  const handleTerminateSession = (sessionId: string) => {
    terminateSessionMutation.mutate(sessionId);
  };

  const handleTerminateAllSessions = () => {
    terminateAllSessionsMutation.mutate();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'info': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'login': return <CheckCircle className="h-4 w-4" />;
      case 'logout': return <XCircle className="h-4 w-4" />;
      case 'session_terminated': return <Monitor className="h-4 w-4" />;
      case 'profile_update': return <Settings className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-300">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Account Settings
          </h1>
          <p className="text-slate-600 dark:text-slate-300">
            Manage your account information, security settings, and activity.
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="sessions" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Sessions
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={profileData.firstName}
                        onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                        placeholder="Your first name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={profileData.lastName}
                        onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                        placeholder="Your last name"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      value={user.email || ''}
                      disabled
                      className="bg-slate-100 dark:bg-slate-800"
                    />
                    <p className="text-sm text-slate-500 mt-1">
                      Email cannot be changed through this interface.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="language">Preferred Language</Label>
                      <Select
                        value={profileData.preferredLanguage}
                        onValueChange={(value) => setProfileData({ ...profileData, preferredLanguage: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Spanish</SelectItem>
                          <SelectItem value="fr">French</SelectItem>
                          <SelectItem value="de">German</SelectItem>
                          <SelectItem value="it">Italian</SelectItem>
                          <SelectItem value="pt">Portuguese</SelectItem>
                          <SelectItem value="ru">Russian</SelectItem>
                          <SelectItem value="ja">Japanese</SelectItem>
                          <SelectItem value="ko">Korean</SelectItem>
                          <SelectItem value="zh">Chinese</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="timezone">Timezone</Label>
                      <Input
                        id="timezone"
                        value={profileData.timezone}
                        onChange={(e) => setProfileData({ ...profileData, timezone: e.target.value })}
                        placeholder="e.g., America/New_York"
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={updateProfileMutation.isPending}
                    className="w-full md:w-auto"
                  >
                    {updateProfileMutation.isPending ? 'Updating...' : 'Update Profile'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Login Count</span>
                    </div>
                    <p className="text-2xl font-bold">{user.loginCount || 0}</p>
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">Last Login</span>
                    </div>
                    <p className="text-sm">
                      {user.lastLoginAt 
                        ? format(new Date(user.lastLoginAt), 'MMM d, yyyy HH:mm') 
                        : 'Never'}
                    </p>
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Account Status</span>
                    </div>
                    <Badge variant={user.accountStatus === 'active' ? 'default' : 'destructive'}>
                      {user.accountStatus || 'active'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Email Verification</h3>
                  <div className="flex items-center gap-2">
                    {user.emailVerified ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                    )}
                    <span className="text-sm">
                      {user.emailVerified ? 'Email verified' : 'Email not verified'}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Two-Factor Authentication</h3>
                  <div className="flex items-center gap-2">
                    {user.twoFactorEnabled ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm">
                      {user.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sessions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-5 w-5" />
                    Active Sessions
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={handleTerminateAllSessions}
                    disabled={terminateAllSessionsMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Terminate All
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sessionsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                    <p className="text-slate-600 dark:text-slate-300">Loading sessions...</p>
                  </div>
                ) : sessions && sessions.length > 0 ? (
                  <div className="space-y-4">
                    {sessions.map((session: UserSession) => (
                      <div key={session.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Monitor className="h-4 w-4 text-slate-500" />
                              <span className="font-medium">Session {session.id}</span>
                              <Badge variant={session.isActive ? 'default' : 'secondary'}>
                                {session.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            <div className="text-sm text-slate-500 space-y-1">
                              <div className="flex items-center gap-2">
                                <Globe className="h-3 w-3" />
                                <span>{session.ipAddress || 'Unknown IP'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3" />
                                <span>Created: {format(new Date(session.createdAt), 'MMM d, yyyy HH:mm')}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3" />
                                <span>Expires: {format(new Date(session.expiresAt), 'MMM d, yyyy HH:mm')}</span>
                              </div>
                            </div>
                          </div>
                          {session.isActive && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleTerminateSession(session.sessionId)}
                              disabled={terminateSessionMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Terminate
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Monitor className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600 dark:text-slate-300">No active sessions found.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Security Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {eventsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                    <p className="text-slate-600 dark:text-slate-300">Loading activity...</p>
                  </div>
                ) : securityEvents && securityEvents.length > 0 ? (
                  <div className="space-y-4">
                    {securityEvents.map((event: SecurityEvent) => (
                      <div key={event.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="text-slate-500 mt-1">
                              {getEventIcon(event.eventType)}
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium capitalize">
                                  {event.eventType.replace('_', ' ')}
                                </span>
                                <Badge className={getSeverityColor(event.severity)}>
                                  {event.severity}
                                </Badge>
                              </div>
                              <div className="text-sm text-slate-500 space-y-1">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-3 w-3" />
                                  <span>{format(new Date(event.createdAt), 'MMM d, yyyy HH:mm:ss')}</span>
                                </div>
                                {event.ipAddress && (
                                  <div className="flex items-center gap-2">
                                    <Globe className="h-3 w-3" />
                                    <span>{event.ipAddress}</span>
                                  </div>
                                )}
                                {event.details && (
                                  <div className="mt-2 text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded">
                                    {event.details}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600 dark:text-slate-300">No security events found.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}