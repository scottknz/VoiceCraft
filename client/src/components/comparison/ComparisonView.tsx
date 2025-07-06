import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useChatContext } from "@/contexts/ChatContext";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Bot, User, Send, Zap } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

interface ComparisonResult {
  standardResponse: string;
  voiceResponse: string;
  model: string;
  voiceProfileId?: number;
}

export default function ComparisonView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { selectedModel, setSelectedModel, activeVoiceProfile } = useChatContext();
  const [message, setMessage] = useState("");
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);

  const compareMutation = useMutation({
    mutationFn: async (data: { message: string; model: string; voiceProfileId?: number }) => {
      const response = await apiRequest("POST", "/api/chat/compare", data);
      return response.json();
    },
    onSuccess: (result) => {
      setComparisonResult(result);
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
        description: "Failed to generate comparison",
        variant: "destructive",
      });
    },
  });

  const handleCompare = () => {
    if (!message.trim()) return;

    compareMutation.mutate({
      message: message.trim(),
      model: selectedModel,
      voiceProfileId: activeVoiceProfile?.id,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleCompare();
    }
  };

  const modelOptions = [
    { value: "gpt-4o", label: "GPT-4 (OpenAI)" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
    { value: "gemini-2.5-pro", label: "Gemini Pro" },
    { value: "gemini-2.5-flash", label: "Gemini Flash" },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
            Side-by-Side Comparison
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Compare responses between your custom voice profile and standard AI output
          </p>
          
          <div className="flex items-center gap-4">
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
            
            {activeVoiceProfile && (
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                <User className="h-3 w-3 mr-1" />
                {activeVoiceProfile.name}
              </Badge>
            )}
            
            {!activeVoiceProfile && (
              <div className="text-sm text-amber-600 dark:text-amber-400">
                ⚠️ No voice profile selected. Comparison will show standard vs standard.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex gap-3">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter your message to compare responses..."
              className="flex-1 min-h-[80px] resize-none border-slate-200 dark:border-slate-600 focus:ring-green-500 focus:border-green-500"
              disabled={compareMutation.isPending}
            />
            <Button
              onClick={handleCompare}
              disabled={!message.trim() || compareMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white px-6"
            >
              {compareMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Comparing...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Compare
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Comparison Results */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-6xl mx-auto">
          {comparisonResult ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Voice Profile Response */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                    <User className="h-5 w-5 text-green-600" />
                    {activeVoiceProfile?.name || "Voice Profile"} Style
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {comparisonResult.model}
                    </Badge>
                    {activeVoiceProfile && (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        Voice Enhanced
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="prose dark:prose-invert max-w-none text-sm">
                    <div className="whitespace-pre-wrap text-slate-700 dark:text-slate-300 leading-relaxed">
                      {comparisonResult.voiceResponse}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Standard Response */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                    <Bot className="h-5 w-5 text-blue-500" />
                    Standard AI Response
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {comparisonResult.model}
                    </Badge>
                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      Default
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="prose dark:prose-invert max-w-none text-sm">
                    <div className="whitespace-pre-wrap text-slate-700 dark:text-slate-300 leading-relaxed">
                      {comparisonResult.standardResponse}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <div className="flex items-center justify-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-slate-400">VS</div>
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <Bot className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
                
                <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Ready to Compare
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  Enter a message above to see how your voice profile compares to standard AI responses.
                </p>
                
                <div className="mt-6 p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Zap className="h-4 w-4 text-amber-500 mt-0.5" />
                    <div className="text-left">
                      <h4 className="font-medium text-slate-700 dark:text-slate-300 text-sm mb-1">
                        Pro Tip
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Try asking the same question in different ways to see how your voice profile adapts and maintains consistency.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
