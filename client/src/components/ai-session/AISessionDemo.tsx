import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Bot, Send, Clock, User } from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";

interface AISessionResponse {
  response: string;
  model: string;
  userId: number;
  timestamp: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export default function AISessionDemo() {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [context, setContext] = useState("You are a helpful AI assistant specialized in explaining technology concepts.");
  const [sessionHistory, setSessionHistory] = useState<Array<{
    message: string;
    response: string;
    timestamp: string;
  }>>([]);

  const aiSessionMutation = useMutation({
    mutationFn: async (data: { message: string; context?: string }) => {
      const response = await apiRequest("POST", "/api/ai-session", data);
      return response.json() as Promise<AISessionResponse>;
    },
    onSuccess: (result) => {
      setSessionHistory(prev => [...prev, {
        message,
        response: result.response,
        timestamp: result.timestamp
      }]);
      setMessage("");
      toast({
        title: "AI Response Generated",
        description: `Response from ${result.model}`,
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
        title: "AI Session Error",
        description: error.message || "Failed to generate AI response",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    aiSessionMutation.mutate({
      message: message.trim(),
      context: context.trim() || undefined
    });
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-600" />
            AI Session Demo - DeepSeek R1T2 Chimera
          </CardTitle>
          <CardDescription>
            Test the AI session endpoint using the free DeepSeek R1T2 Chimera model through OpenRouter
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="context">System Context</Label>
            <Textarea
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Set the AI's role and behavior..."
              className="min-h-[80px]"
            />
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="message">Your Message</Label>
              <Input
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask the AI anything..."
                disabled={aiSessionMutation.isPending}
              />
            </div>
            
            <Button 
              type="submit" 
              disabled={aiSessionMutation.isPending || !message.trim()}
              className="w-full"
            >
              {aiSessionMutation.isPending ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Generating Response...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send to AI
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {sessionHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Session History</CardTitle>
            <CardDescription>
              Previous interactions with the AI
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {sessionHistory.map((session, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm text-gray-500 mb-1">
                        {formatTime(session.timestamp)}
                      </div>
                      <div className="text-sm bg-green-50 dark:bg-green-900/20 p-2 rounded">
                        {session.message}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Bot className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm text-gray-500 mb-1">
                        DeepSeek R1T2 Chimera
                      </div>
                      <div className="text-sm bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                        {session.response}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}