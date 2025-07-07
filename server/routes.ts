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
      const userId = req.user.id; // Keep as integer
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

  // Voice profile activation endpoint
  app.post("/api/voice-profiles/:id/activate", requireAuth, async (req: any, res) => {
    try {
      const profileId = parseInt(req.params.id);
      const userId = req.user.id;
      
      await storage.setActiveVoiceProfile(userId, profileId);
      res.json({ message: "Voice profile activated successfully" });
    } catch (error) {
      console.error("Error activating voice profile:", error);
      res.status(500).json({ message: "Failed to activate voice profile" });
    }
  });

  // Chat conversation routes
  app.get("/api/conversations", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id; // Keep as integer
      const conversations = await storage.getUserConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post("/api/conversations", requireAuth, async (req, res) => {
    try {
      console.log("Conversation request body:", JSON.stringify(req.body, null, 2));
      
      const result = insertConversationSchema.safeParse(req.body);
      if (!result.success) {
        console.log("Conversation validation errors:", JSON.stringify(result.error.errors, null, 2));
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

  // Delete conversation endpoint
  app.delete("/api/conversations/:id", requireAuth, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const userId = req.user.id;

      // Validate user owns the conversation
      const conversation = await storage.getConversation(conversationId);
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({ message: "Conversation not found or access denied" });
      }

      // Delete the conversation (this will also delete associated messages)
      await storage.deleteConversation(conversationId);
      res.json({ message: "Conversation deleted successfully" });
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ message: "Failed to delete conversation" });
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

  // Messages endpoint - creates a new message
  app.post("/api/messages", requireAuth, async (req: any, res) => {
    try {
      const { conversationId, role, content, model, voiceProfileId } = req.body;
      const userId = req.user.id; // Keep as integer

      // Validate required fields
      if (!conversationId || !role || !content) {
        return res.status(400).json({ message: "Conversation ID, role, and content are required" });
      }

      // Validate user owns the conversation
      const conversation = await storage.getConversation(conversationId);
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({ message: "Conversation not found or access denied" });
      }

      // Create message
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

  // Streaming chat endpoint
  app.post("/api/chat/stream", requireAuth, async (req: any, res) => {
    try {
      const { conversationId, message, model, voiceProfileId } = req.body;
      console.log("Streaming chat request:", JSON.stringify({ conversationId, message, model, voiceProfileId }, null, 2));
      
      const userId = req.user.id;
      
      // Validate required fields
      if (!conversationId || !message) {
        return res.status(400).json({ message: "Conversation ID and message are required" });
      }
      
      // Get conversation history to build messages array
      const conversationMessages = await storage.getConversationMessages(conversationId);
      
      // Build messages array from conversation history + current message
      const messages = [
        ...conversationMessages.map(msg => ({
          role: msg.role as "user" | "assistant",
          content: msg.content
        })),
        {
          role: "user" as const,
          content: message
        }
      ];
      
      let voiceProfile = null;
      if (voiceProfileId) {
        voiceProfile = await storage.getVoiceProfile(voiceProfileId);
        console.log("Voice profile loaded:", JSON.stringify(voiceProfile, null, 2));
      }

      const response = await createChatResponse({
        model: model || "gemini-2.5-flash",
        messages,
        voiceProfile
      });

      // Save AI response to database
      await storage.addMessage({
        conversationId,
        role: "assistant",
        content: response,
        model: model || "gemini-2.5-flash",
        voiceProfileId: voiceProfileId || null
      });

      // Auto-generate title if conversation doesn't have one and this is first AI response
      const conversation = await storage.getConversation(conversationId);
      if (conversation && !conversation.title) {
        const allMessages = await storage.getConversationMessages(conversationId);
        // Only generate title if we have both user and AI messages
        if (allMessages.length >= 2) {
          try {
            const firstUserMessage = allMessages.find(m => m.role === "user");
            if (firstUserMessage) {
              const titlePrompt = `Generate a concise, descriptive title (2-6 words) for this conversation based on the user's question and AI response:

User: ${firstUserMessage.content}

AI: ${response.substring(0, 200)}...

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

      res.json({ response });
    } catch (error) {
      console.error("Error in chat:", error);
      res.status(500).json({ message: "Failed to process chat request" });
    }
  });

  // Improved streaming endpoint
  app.post("/api/chat/stream", requireAuth, async (req: any, res) => {
    try {
      const { conversationId, message, model, voiceProfileId } = req.body;
      const userId = req.user.id;
      
      // Validate conversation access
      const conversation = await storage.getConversation(conversationId);
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Save user message first
      await storage.addMessage({
        conversationId,
        role: "user",
        content: message,
        model: model || "gemini-2.5-flash",
        voiceProfileId: voiceProfileId || null,
      });

      // Get conversation history
      const conversationMessages = await storage.getConversationMessages(conversationId);
      const messages = conversationMessages.map(msg => ({
        role: msg.role as "user" | "assistant",
        content: msg.content
      }));
      
      let voiceProfile = null;
      if (voiceProfileId) {
        voiceProfile = await storage.getVoiceProfile(voiceProfileId);
      }

      // Set up SSE headers
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

      const reader = stream.getReader();
      let accumulatedResponse = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = new TextDecoder().decode(value);
          accumulatedResponse += chunk;
          
          // Send chunk to client
          res.write(`data: ${JSON.stringify({ chunk, done: false })}\n\n`);
        }

        // Send completion signal
        res.write(`data: ${JSON.stringify({ chunk: "", done: true })}\n\n`);
        
        // Save final AI response to database
        await storage.addMessage({
          conversationId,
          role: "assistant", 
          content: accumulatedResponse,
          model: model || "gemini-2.5-flash",
          voiceProfileId: voiceProfileId || null,
        });

        // Auto-generate title if conversation doesn't have one and this is first AI response
        const conversation = await storage.getConversation(conversationId);
        if (conversation && !conversation.title) {
          const allMessages = await storage.getConversationMessages(conversationId);
          // Only generate title if we have both user and AI messages
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
        res.end();
      }

    } catch (error) {
      console.error("Error in streaming chat:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to process streaming chat request" });
      }
    }
  });

  // Generate conversation title
  app.post("/api/conversations/:id/generate-title", requireAuth, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const userId = req.user.id;
      
      // Validate conversation ownership
      const conversation = await storage.getConversation(conversationId);
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({ message: "Conversation not found or access denied" });
      }
      
      // Get conversation messages
      const messages = await storage.getConversationMessages(conversationId);
      if (messages.length === 0) {
        return res.status(400).json({ message: "Cannot generate title for empty conversation" });
      }
      
      // Get first user message and first AI response to create title
      const firstUserMessage = messages.find(m => m.role === "user");
      const firstAIMessage = messages.find(m => m.role === "assistant");
      
      if (!firstUserMessage) {
        return res.status(400).json({ message: "No user message found" });
      }
      
      let titlePrompt = `Generate a concise, descriptive title (2-6 words) for this conversation based on the user's question`;
      if (firstAIMessage) {
        titlePrompt += ` and AI response`;
      }
      titlePrompt += `:\n\nUser: ${firstUserMessage.content}`;
      if (firstAIMessage) {
        titlePrompt += `\n\nAI: ${firstAIMessage.content.substring(0, 200)}...`;
      }
      titlePrompt += `\n\nRespond with only the title, no quotes or additional text.`;
      
      // Generate title using AI
      const titleResponse = await createChatResponse({
        model: "gemini-2.5-flash",
        messages: [{ role: "user", content: titlePrompt }],
      });
      
      // Clean up the title (remove quotes, trim, limit length)
      const cleanTitle = titleResponse.replace(/['"]/g, '').trim().substring(0, 60);
      
      // Update conversation with generated title
      await storage.updateConversation(conversationId, { title: cleanTitle });
      
      res.json({ title: cleanTitle });
      
    } catch (error) {
      console.error("Error generating title:", error);
      res.status(500).json({ message: "Failed to generate title" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}