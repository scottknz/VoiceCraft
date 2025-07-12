import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import VoiceProfileSidebar from "@/components/sidebar/VoiceProfileSidebar";
import ChatInterface from "@/components/chat/ChatInterface";
import { Button } from "@/components/ui/button";
import { ChatProvider } from "@/contexts/ChatContext";
import { Link } from "wouter";
import { Moon, Sun, Menu, LogOut, FileText, User, Sparkles } from "lucide-react";

export default function Home() {
  const { user } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle("dark");
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <ChatProvider>
      <div className={`flex h-screen overflow-hidden ${isDarkMode ? "dark" : ""}`}>
        {/* Sidebar */}
        <div className={`${sidebarOpen ? "w-80" : "w-0"} transition-all duration-300 ease-in-out overflow-hidden`}>
          <VoiceProfileSidebar onClose={() => setSidebarOpen(false)} />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  AI Voice Assistant
                </h2>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Templates */}
                <Link href="/templates">
                  <Button variant="ghost" size="sm" className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Templates
                  </Button>
                </Link>
                
                {/* Profile */}
                <Link href="/profile">
                  <Button variant="ghost" size="sm" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Profile
                  </Button>
                </Link>
                
                {/* Theme Toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleTheme}
                >
                  {isDarkMode ? (
                    <Sun className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <Moon className="h-5 w-5 text-slate-600" />
                  )}
                </Button>
                
                {/* Logout */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.location.href = '/api/logout'}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Main View */}
          <div className="flex-1 overflow-hidden">
            <ChatInterface />
          </div>
        </div>
      </div>
    </ChatProvider>
  );
}
