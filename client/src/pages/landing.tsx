import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, MessageSquare, Zap, Shield, Users, ArrowRight } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-600 rounded-lg">
                <Bot className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                AI Voice Assistant
              </h1>
            </div>
            <Link href="/auth">
              <Button className="bg-green-600 hover:bg-green-700">
                Sign In
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Create Your Perfect
            <span className="text-green-600"> AI Voice</span>
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-3xl mx-auto">
            Upload your writing samples to train AI models that respond in your unique voice and style. 
            Experience personalized conversations that match your tone, structure, and personality.
          </p>
          <Link href="/auth">
            <Button size="lg" className="bg-green-600 hover:bg-green-700 text-lg px-8 py-4">
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg w-fit mb-4">
                <MessageSquare className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle>Smart Voice Profiles</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Upload writing samples to create detailed voice profiles that capture your unique style, 
                tone, and personality for authentic AI conversations.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg w-fit mb-4">
                <Zap className="h-8 w-8 text-purple-600" />
              </div>
              <CardTitle>Multiple AI Models</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Choose between OpenAI GPT-4o and Google Gemini models for optimal results 
                tailored to your specific needs and preferences.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto p-3 bg-green-100 dark:bg-green-900/30 rounded-lg w-fit mb-4">
                <Shield className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle>Secure & Private</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Your writing samples and conversations are securely stored with enterprise-grade 
                encryption and complete privacy protection.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <div className="text-center mb-16">
          <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-12">
            How It Works
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="mx-auto w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                1
              </div>
              <h4 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Upload Writing Samples
              </h4>
              <p className="text-slate-600 dark:text-slate-300">
                Provide examples of your writing to train the AI on your unique voice and style.
              </p>
            </div>
            <div className="space-y-4">
              <div className="mx-auto w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                2
              </div>
              <h4 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Create Voice Profile
              </h4>
              <p className="text-slate-600 dark:text-slate-300">
                Configure tone, structure, formatting preferences and personality traits.
              </p>
            </div>
            <div className="space-y-4">
              <div className="mx-auto w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                3
              </div>
              <h4 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Chat with Your Voice
              </h4>
              <p className="text-slate-600 dark:text-slate-300">
                Enjoy personalized AI conversations that match your writing style perfectly.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-white/50 dark:bg-slate-800/50 rounded-2xl p-12">
          <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Ready to Create Your AI Voice?
          </h3>
          <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">
            Join users who are already experiencing personalized AI conversations.
          </p>
          <Link href="/auth">
            <Button size="lg" className="bg-green-600 hover:bg-green-700 text-lg px-8 py-4">
              Start Building Your Voice Profile
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-slate-600 dark:text-slate-300">
            <p>&copy; 2025 AI Voice Assistant. Create your perfect AI voice experience.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}