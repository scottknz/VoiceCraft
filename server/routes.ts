import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  insertVoiceProfileSchema, 
  insertWritingSampleSchema, 
  insertConversationSchema, 
  insertMessageSchema 
} from "@shared/schema";
import { createChatStream, createChatResponse } from "./services/chat";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Voice profile routes
  app.get('/api/voice-profiles', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profiles = await storage.getUserVoiceProfiles(userId);
      res.json(profiles);
    } catch (error) {
      console.error("Error fetching voice profiles:", error);
      res.status(500).json({ message: "Failed to fetch voice profiles" });
    }
  });

  app.post('/api/voice-profiles', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profileData = insertVoiceProfileSchema.parse({ 
        ...req.body, 
        userId 
      });
      const profile = await storage.createVoiceProfile(profileData);
      res.json(profile);
    } catch (error) {
      console.error("Error creating voice profile:", error);
      res.status(500).json({ message: "Failed to create voice profile" });
    }
  });

  app.patch('/api/voice-profiles/:id', isAuthenticated, async (req: any, res) => {
    try {
      const profileId = parseInt(req.params.id);
      const updateData = insertVoiceProfileSchema.partial().parse(req.body);
      const profile = await storage.updateVoiceProfile(profileId, updateData);
      res.json(profile);
    } catch (error) {
      console.error("Error updating voice profile:", error);
      res.status(500).json({ message: "Failed to update voice profile" });
    }
  });

  app.delete('/api/voice-profiles/:id', isAuthenticated, async (req: any, res) => {
    try {
      const profileId = parseInt(req.params.id);
      await storage.deleteVoiceProfile(profileId);
      res.json({ message: "Voice profile deleted successfully" });
    } catch (error) {
      console.error("Error deleting voice profile:", error);
      res.status(500).json({ message: "Failed to delete voice profile" });
    }
  });

  // Conversation routes
  app.get('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversations = await storage.getUserConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversationData = insertConversationSchema.parse({ 
        ...req.body, 
        userId 
      });
      const conversation = await storage.createConversation(conversationData);
      res.json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  app.get('/api/conversations/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      console.log(`Fetching messages for conversation ${conversationId}`);
      const messages = await storage.getConversationMessages(conversationId);
      console.log(`Found ${messages.length} messages:`, messages.map(m => ({id: m.id, role: m.role, content: m.content?.substring(0, 50) + '...'})));
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.delete('/api/conversations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      await storage.deleteConversation(conversationId);
      res.json({ message: "Conversation deleted successfully" });
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ message: "Failed to delete conversation" });
    }
  });

  app.post('/api/conversations/:id/generate-title', isAuthenticated, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const messages = await storage.getConversationMessages(conversationId);
      
      if (messages.length < 1) {
        res.status(400).json({ message: "Need at least 1 message to generate title" });
        return;
      }

      // Get first user message and AI response
      const userMessage = messages.find(m => m.role === 'user')?.content || "";
      const aiMessage = messages.find(m => m.role === 'assistant')?.content || "";
      
      // Generate title using AI
      let titlePrompt = `Based on this conversation, create a very short title (2-4 words maximum) that captures the main topic. No "chat", "conversation", or dates - just the core subject:

User: ${userMessage.substring(0, 200)}`;
      
      if (aiMessage) {
        titlePrompt += `\nAssistant: ${aiMessage.substring(0, 200)}`;
      }
      
      titlePrompt += `\n\nGenerate only the title, nothing else:`;

      const { createChatResponse } = await import('./services/chat');
      
      const title = await createChatResponse({
        model: "gemini-2.5-flash",
        messages: [{ role: "user", content: titlePrompt }],
        temperature: 0.7,
        maxTokens: 20
      });

      // Clean up the title - remove quotes and trim
      const cleanTitle = title.replace(/['"]/g, '').trim();
      
      // Update conversation with new title
      await storage.updateConversation(conversationId, { title: cleanTitle });
      
      res.json({ title: cleanTitle });
    } catch (error) {
      console.error("Error generating title:", error);
      res.status(500).json({ message: "Failed to generate title" });
    }
  });

  app.post('/api/messages', isAuthenticated, async (req: any, res) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      const message = await storage.addMessage(messageData);
      res.json(message);
    } catch (error) {
      console.error("Error saving message:", error);
      res.status(500).json({ message: "Failed to save message" });
    }
  });

  // Chat completion routes
  const chatSchema = z.object({
    message: z.string(),
    model: z.enum(["gpt-4o", "gpt-3.5-turbo", "gemini-2.5-pro", "gemini-2.5-flash"]),
    conversationId: z.number(),
    voiceProfileId: z.number().optional(),
    stream: z.boolean().optional()
  });

  app.post('/api/chat', isAuthenticated, async (req: any, res) => {
    try {
      const { message, model, conversationId, voiceProfileId, stream = true } = chatSchema.parse(req.body);
      
      // Save user message
      await storage.addMessage({
        conversationId,
        role: "user",
        content: message,
        model,
        voiceProfileId
      });

      // Get conversation history
      const conversationMessages = await storage.getConversationMessages(conversationId);
      
      // Prepare messages for chat service
      const chatMessages = conversationMessages
        .filter(msg => msg.role === 'user' || msg.role === 'assistant')
        .map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }));

      // Get voice profile if specified
      let voiceProfile = null;
      if (voiceProfileId) {
        voiceProfile = await storage.getVoiceProfile(voiceProfileId);
        console.log(`Using voice profile: ${voiceProfile?.name || 'Not found'}`);
      }

      console.log(`Starting chat for model: ${model}`);
      console.log(`Conversation history: ${chatMessages.length} messages loaded`);
      
      // Set up streaming response
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      const { stream: responseStream, fullResponse } = await createChatStream({
        model: model as "gemini-2.5-flash" | "gemini-2.5-pro" | "gpt-4o" | "gpt-3.5-turbo",
        messages: chatMessages,
        systemInstruction: "You are a helpful AI assistant.",
        voiceProfile: voiceProfile || undefined
      });
      
      // Save the complete response to database immediately
      console.log(`Saving AI response: "${fullResponse.substring(0, 100)}..." (length: ${fullResponse.length})`);
      const savedMessage = await storage.addMessage({
        conversationId: conversationId,
        role: 'assistant',
        content: fullResponse
      });
      console.log(`Message saved with ID: ${savedMessage.id}`);

      // Generate title if this is the first AI response (conversation needs a title)
      const conversation = await storage.getConversation(conversationId);
      console.log(`Checking conversation for title generation. Current title: "${conversation?.title}"`);
      
      if (conversation && (!conversation.title || conversation.title.startsWith('New Conversation') || conversation.title === 'New Chat' || conversation.title.includes('/'))) {
        console.log("Generating title for conversation...");
        try {
          const titlePrompt = `Based on this conversation, create a very short title (2-4 words maximum) that captures the main topic. No "chat", "conversation", or dates - just the core subject:

User: ${message.substring(0, 200)}
Assistant: ${fullResponse.substring(0, 200)}

Generate only the title, nothing else:`;

          console.log("Calling AI to generate title...");
          const title = await createChatResponse({
            model: "gemini-2.5-flash",
            messages: [{ role: "user", content: titlePrompt }],
            temperature: 0.7,
            maxTokens: 10
          });

          const cleanTitle = title.replace(/['"]/g, '').trim();
          console.log(`Generated raw title: "${title}", clean title: "${cleanTitle}"`);
          
          await storage.updateConversation(conversationId, { title: cleanTitle });
          console.log(`Title updated in database: "${cleanTitle}"`);
        } catch (error) {
          console.error("Failed to generate title:", error);
        }
      } else {
        console.log("Title generation skipped - conversation already has title or conditions not met");
      }
      
      const reader = responseStream.getReader();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = new TextDecoder().decode(value);
          res.write(chunk);
        }
      } catch (error) {
        console.error('Chat streaming error:', error);
        res.write(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`);
      } finally {
        res.end();
      }
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ error: "Failed to process chat request" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}