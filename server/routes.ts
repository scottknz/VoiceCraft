import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth } from "./auth";
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
  setupAuth(app);

  // Voice profile routes
  app.get("/api/voice-profiles", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      const profiles = await storage.getUserVoiceProfiles(userId);
      res.json(profiles);
    } catch (error) {
      console.error("Error fetching voice profiles:", error);
      res.status(500).json({ message: "Failed to fetch voice profiles" });
    }
  });

  app.post("/api/voice-profiles", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      
      const result = insertVoiceProfileSchema.safeParse(req.body);
      if (!result.success) {
        console.log("Validation errors:", JSON.stringify(result.error.errors, null, 2));
        return res.status(400).json({ message: "Invalid voice profile data", errors: result.error.errors });
      }

      // Create the profile with isActive set to true by default
      const profileData = { ...result.data, userId, isActive: true };
      const profile = await storage.createVoiceProfile(profileData);
      
      // Set this as the active profile for the user
      await storage.setActiveVoiceProfile(userId.toString(), profile.id);
      
      res.status(201).json(profile);
    } catch (error) {
      console.error("Error creating voice profile:", error);
      res.status(500).json({ message: "Failed to create voice profile" });
    }
  });

  app.patch("/api/voice-profiles/:id", requireAuth, async (req: any, res) => {
    try {
      const profileId = parseInt(req.params.id);
      const updates = req.body;
      
      const profile = await storage.updateVoiceProfile(profileId, updates);
      res.json(profile);
    } catch (error) {
      console.error("Error updating voice profile:", error);
      res.status(500).json({ message: "Failed to update voice profile" });
    }
  });

  app.delete("/api/voice-profiles/:id", requireAuth, async (req: any, res) => {
    try {
      const profileId = parseInt(req.params.id);
      await storage.deleteVoiceProfile(profileId);
      res.json({ message: "Voice profile deleted successfully" });
    } catch (error) {
      console.error("Error deleting voice profile:", error);
      res.status(500).json({ message: "Failed to delete voice profile" });
    }
  });

  // Chat conversation routes
  app.get("/api/conversations", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      const conversations = await storage.getUserConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post("/api/conversations", requireAuth, async (req, res) => {
    try {
      const result = insertConversationSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid conversation data", errors: result.error.errors });
      }

      const userId = (req.user as any).id;
      const conversationData = { ...result.data, userId };
      const conversation = await storage.createConversation(conversationData);
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  app.get("/api/conversations/:id/messages", requireAuth, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const messages = await storage.getConversationMessages(conversationId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/conversations/:id/messages", requireAuth, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const result = insertMessageSchema.safeParse({ ...req.body, conversationId });
      
      if (!result.success) {
        return res.status(400).json({ message: "Invalid message data", errors: result.error.errors });
      }

      const message = await storage.addMessage(result.data);
      res.status(201).json(message);
    } catch (error) {
      console.error("Error adding message:", error);
      res.status(500).json({ message: "Failed to add message" });
    }
  });

  // Chat streaming endpoint
  app.post("/api/chat/stream", requireAuth, async (req: any, res) => {
    try {
      const { messages, model, voiceProfileId } = req.body;
      const userId = req.user.id.toString();
      
      let voiceProfile = null;
      if (voiceProfileId) {
        voiceProfile = await storage.getVoiceProfile(voiceProfileId);
      }

      const { stream } = await createChatStream({
        model: model || "gemini-2.5-flash",
        messages,
        voiceProfile
      });

      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Transfer-Encoding', 'chunked');
      
      const reader = stream.getReader();
      const pump = async (): Promise<void> => {
        const { done, value } = await reader.read();
        if (done) {
          res.end();
          return;
        }
        res.write(value);
        return pump();
      };
      
      await pump();
    } catch (error) {
      console.error("Error in chat stream:", error);
      res.status(500).json({ message: "Failed to process chat request" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}