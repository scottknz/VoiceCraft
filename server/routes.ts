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
      const userId = req.user.id;
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

      const profileData = { ...result.data, userId, isActive: true };
      const profile = await storage.createVoiceProfile(profileData);
      
      await storage.setActiveVoiceProfile(userId, profile.id);
      
      res.status(201).json(profile);
    } catch (error) {
      console.error("Error creating voice profile:", error);
      res.status(500).json({ message: "Failed to create voice profile" });
    }
  });

  app.patch("/api/voice-profiles/:id", requireAuth, async (req: any, res) => {
    try {
      const profileId = parseInt(req.params.id);
      const userId = req.user.id;
      
      const existingProfile = await storage.getVoiceProfile(profileId);
      if (!existingProfile || existingProfile.userId !== userId) {
        return res.status(404).json({ message: "Voice profile not found or access denied" });
      }

      const result = insertVoiceProfileSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid voice profile data", errors: result.error.errors });
      }

      const updatedProfile = await storage.updateVoiceProfile(profileId, result.data);
      res.json(updatedProfile);
    } catch (error) {
      console.error("Error updating voice profile:", error);
      res.status(500).json({ message: "Failed to update voice profile" });
    }
  });

  app.delete("/api/voice-profiles/:id", requireAuth, async (req: any, res) => {
    try {
      const profileId = parseInt(req.params.id);
      const userId = req.user.id;
      
      const profile = await storage.getVoiceProfile(profileId);
      if (!profile || profile.userId !== userId) {
        return res.status(404).json({ message: "Voice profile not found or access denied" });
      }

      await storage.deleteVoiceProfile(profileId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting voice profile:", error);
      res.status(500).json({ message: "Failed to delete voice profile" });
    }
  });

  // Conversation routes
  app.get("/api/conversations", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const conversations = await storage.getUserConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post("/api/conversations", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const result = insertConversationSchema.safeParse({ ...req.body, userId });
      
      if (!result.success) {
        return res.status(400).json({ message: "Invalid conversation data", errors: result.error.errors });
      }

      const conversation = await storage.createConversation(result.data);
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  app.delete("/api/conversations/:id", requireAuth, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const userId = req.user.id;
      
      const conversation = await storage.getConversation(conversationId);
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({ message: "Conversation not found or access denied" });
      }

      await storage.deleteConversation(conversationId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ message: "Failed to delete conversation" });
    }
  });

  // Message routes
  app.get("/api/conversations/:id/messages", requireAuth, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const userId = req.user.id;
      
      const conversation = await storage.getConversation(conversationId);
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({ message: "Conversation not found or access denied" });
      }

      const messages = await storage.getConversationMessages(conversationId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", requireAuth, async (req: any, res) => {
    try {
      const { conversationId, role, content, model, voiceProfileId } = req.body;
      const userId = req.user.id;

      if (!conversationId || !role || !content) {
        return res.status(400).json({ message: "Conversation ID, role, and content are required" });
      }

      const conversation = await storage.getConversation(conversationId);
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({ message: "Conversation not found or access denied" });
      }

      const message = await storage.addMessage({
        conversationId,
        role: role as "user" | "assistant",
        content,
        model: model || null,
        voiceProfileId: voiceProfileId || null,
      });

      res.json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  // **FIXED STREAMING ENDPOINT** - Complete clean implementation
  app.post("/api/chat/stream", requireAuth, async (req: any, res) => {
    try {
      const { conversationId, message, model, voiceProfileId } = req.body;
      console.log("Streaming chat request:", JSON.stringify({ conversationId, message, model, voiceProfileId }, null, 2));
      
      const userId = req.user.id;
      
      // Validate conversation access
      const conversation = await storage.getConversation(conversationId);
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({ message: "Conversation not found or access denied" });
      }
      
      // Save user message immediately and start streaming
      await storage.addMessage({
        conversationId,
        role: "user",
        content: message,
        model: null,
        voiceProfileId: null
      });

      // Get conversation history in parallel with voice profile loading
      const [conversationMessages, voiceProfile] = await Promise.all([
        storage.getConversationMessages(conversationId),
        voiceProfileId ? storage.getVoiceProfile(voiceProfileId) : Promise.resolve(null)
      ]);
      
      // Build messages array from conversation history (now includes the new user message)
      const messages = conversationMessages.map(msg => ({
        role: msg.role as "user" | "assistant",
        content: msg.content
      }));

      // Set up streaming headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      const { stream, fullResponse } = await createChatStream({
        model: model || "gemini-2.5-flash",
        messages,
        voiceProfile
      });

      // Stream the response
      const reader = stream.getReader();
      let accumulatedResponse = "";
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = new TextDecoder().decode(value);
          accumulatedResponse += chunk;
          
          // Send SSE formatted chunk with 'content' key to match frontend expectations
          res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
        }
        
        // Send completion signal
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        
        // Save to database - use accumulated response after streaming completes
        if (accumulatedResponse.trim()) {
          await storage.addMessage({
            conversationId,
            role: "assistant",
            content: accumulatedResponse,
            model: model || "gemini-2.5-flash",
            voiceProfileId: voiceProfileId || null
          });
        }

        // Auto-generate title if needed
        const updatedConversation = await storage.getConversation(conversationId);
        if (updatedConversation && !updatedConversation.title) {
          const allMessages = await storage.getConversationMessages(conversationId);
          if (allMessages.length >= 2) {
            try {
              const firstUserMessage = allMessages.find(m => m.role === "user");
              if (firstUserMessage) {
                const titlePrompt = `Generate a concise, descriptive title (2-6 words) for this conversation based on the user's question and AI response:

User: ${firstUserMessage.content}

AI: ${accumulatedResponse.substring(0, 200)}...

Respond with only the title, no quotes or additional text.`;

                const titleResponse = await createChatResponse({
                  model: "gemini-2.5-flash",
                  messages: [{ role: "user", content: titlePrompt }],
                });

                const cleanTitle = titleResponse.replace(/['"]/g, '').trim().substring(0, 60);
                await storage.updateConversation(conversationId, { title: cleanTitle });
                console.log(`Auto-generated title for conversation ${conversationId}: ${cleanTitle}`);
              }
            } catch (titleError) {
              console.error("Failed to auto-generate title:", titleError);
            }
          }
        }

      } catch (streamError) {
        console.error("Streaming error:", streamError);
        res.write(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`);
      } finally {
        reader.releaseLock();
        res.end();
      }
      
    } catch (error) {
      console.error("Error in streaming chat:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to process streaming chat request" });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}