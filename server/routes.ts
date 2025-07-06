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
import { createChatStream } from "./services/chat";
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
      const messages = await storage.getConversationMessages(conversationId);
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

      console.log(`Starting chat for model: ${model}`);
      console.log(`Conversation history: ${chatMessages.length} messages loaded`);
      
      // Set up streaming response
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      const { stream: responseStream, fullResponse } = await createChatStream({
        model: model as "gemini-2.5-flash" | "gemini-2.5-pro" | "gpt-4o" | "gpt-3.5-turbo",
        messages: chatMessages,
        systemInstruction: "You are a helpful AI assistant."
      });
      
      // Save the complete response to database immediately
      console.log(`Saving AI response: "${fullResponse.substring(0, 100)}..." (length: ${fullResponse.length})`);
      const savedMessage = await storage.addMessage({
        conversationId: conversationId,
        role: 'assistant',
        content: fullResponse
      });
      console.log(`Message saved with ID: ${savedMessage.id}`);
      
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