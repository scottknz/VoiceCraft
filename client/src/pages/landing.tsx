import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, User, Zap, Shield } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-slate-900 dark:text-white mb-6">
            AI Voice Assistant
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-2xl mx-auto">
            Create custom voice profiles and chat with AI that adapts to your unique writing style. 
            Upload your writing samples and watch as AI learns to communicate just like you.
          </p>
          <Button 
            size="lg" 
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg"
            onClick={() => window.location.href = '/api/login'}
          >
            Get Started
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                <User className="h-5 w-5 text-green-600" />
                Custom Voice Profiles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 dark:text-slate-300">
                Upload your writing samples and create unique voice profiles that capture your tone, style, and personality.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                <MessageCircle className="h-5 w-5 text-green-600" />
                Adaptive AI Chat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 dark:text-slate-300">
                Chat with AI that learns from your writing style and responds in your voice using advanced embeddings.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                <Zap className="h-5 w-5 text-green-600" />
                Multiple AI Models
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 dark:text-slate-300">
                Choose between OpenAI's GPT-4 and Google's Gemini models for the best AI experience.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2 text-slate-900 dark:text-white">
                <Shield className="h-5 w-5 text-green-600" />
                Secure & Private
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 dark:text-slate-300">
                Your data is secure with encrypted storage and private voice profiles. 
                Only you have access to your custom writing styles and chat history.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
