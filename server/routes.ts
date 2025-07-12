import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth } from "./auth";
import { 
  insertVoiceProfileSchema, 
  insertWritingSampleSchema, 
  insertConversationSchema, 
  insertMessageSchema,
  insertStructureTemplateSchema 
} from "@shared/schema";
import { createChatStream, createChatResponse } from "./services/chat";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  setupAuth(app);

  // Voice profile routes
  app.get("/api/voice-profiles", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const profiles = await storage.getUserVoiceProfiles(userId);
      res.json(profiles);
    } catch (error) {
      console.error("Error fetching voice profiles:", error);
      res.status(500).json({ message: "Failed to fetch voice profiles" });
    }
  });

  app.post("/api/voice-profiles", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      
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
      const userId = req.user?.id;
      
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

  // Voice profile activation endpoint
  app.post("/api/voice-profiles/:id/activate", requireAuth, async (req: any, res) => {
    try {
      const profileId = parseInt(req.params.id);
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "User authentication failed" });
      }
      
      await storage.setActiveVoiceProfile(userId, profileId);
      res.json({ message: "Voice profile activated successfully" });
    } catch (error) {
      console.error("Error activating voice profile:", error);
      res.status(500).json({ message: "Failed to activate voice profile" });
    }
  });

  app.delete("/api/voice-profiles/:id", requireAuth, async (req: any, res) => {
    try {
      const profileId = parseInt(req.params.id);
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "User authentication failed" });
      }
      
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
      const userId = req.user?.id;
      const conversations = await storage.getUserConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post("/api/conversations", requireAuth, async (req: any, res) => {
    try {
      console.log("req.user:", req.user);
      const userId = req.user?.id;
      
      if (!userId) {
        console.error("No user ID found in request");
        return res.status(401).json({ message: "User authentication failed" });
      }
      
      const conversationData = {
        title: req.body.title || "New Conversation",
        userId: userId
      };
      
      console.log("Creating conversation with data:", conversationData);
      const result = insertConversationSchema.safeParse(conversationData);
      
      if (!result.success) {
        console.error("Validation error:", result.error.errors);
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
      const userId = req.user?.id;
      
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
      const userId = req.user?.id;

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
      
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "User authentication failed" });
      }
      
      // Validate conversation access
      const conversation = await storage.getConversation(conversationId);
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({ message: "Conversation not found or access denied" });
      }
      
      // Set up streaming headers immediately - no waiting for any database operations
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      // Send immediate start signal for instant response
      res.write(`data: ${JSON.stringify({ type: "start" })}\n\n`);

      // Save user message in background (completely non-blocking)
      storage.addMessage({
        conversationId,
        role: "user",
        content: message,
        model: null,
        voiceProfileId: null
      }).catch(error => {
        console.error("Background user message save failed:", error);
      });

      // Get conversation history and active voice profile from database
      const [conversationMessages, activeVoiceProfile] = await Promise.all([
        storage.getConversationMessages(conversationId),
        storage.getActiveVoiceProfile(userId)
      ]);
      
      // Use active voice profile from database, not from client request
      const voiceProfile = activeVoiceProfile;
      
      // Build messages array from conversation history (now includes the new user message)
      const messages = conversationMessages.map(msg => ({
        role: msg.role as "user" | "assistant",
        content: msg.content
      }));

      // Start AI streaming immediately - database operations happen in parallel
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
          
          // Send SSE formatted chunk with 'content' key - flush immediately for real-time streaming
          res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
          res.flushHeaders ? res.flushHeaders() : undefined;
        }
        
        // Send completion signal to match reference
        res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
        
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
        // Send error message to client
        res.write(`data: ${JSON.stringify({ error: "I apologize, but I encountered an error generating a response. Please try again." })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
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

  // Structure template routes
  app.get("/api/structure-templates", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const defaultTemplates = await storage.getDefaultStructureTemplates();
      const userTemplates = await storage.getUserStructureTemplates(userId);
      
      res.json({
        default: defaultTemplates,
        user: userTemplates
      });
    } catch (error) {
      console.error("Error fetching structure templates:", error);
      res.status(500).json({ message: "Failed to fetch structure templates" });
    }
  });

  app.post("/api/structure-templates", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      
      const result = insertStructureTemplateSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid structure template data", errors: result.error.errors });
      }

      const templateData = { ...result.data, userId, isDefault: false };
      const template = await storage.createStructureTemplate(templateData);
      
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating structure template:", error);
      res.status(500).json({ message: "Failed to create structure template" });
    }
  });

  app.patch("/api/structure-templates/:id", requireAuth, async (req: any, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const userId = req.user?.id;
      
      const existingTemplate = await storage.getStructureTemplate(templateId);
      if (!existingTemplate || existingTemplate.userId !== userId) {
        return res.status(404).json({ message: "Structure template not found or access denied" });
      }

      const result = insertStructureTemplateSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid structure template data", errors: result.error.errors });
      }

      const updatedTemplate = await storage.updateStructureTemplate(templateId, result.data);
      res.json(updatedTemplate);
    } catch (error) {
      console.error("Error updating structure template:", error);
      res.status(500).json({ message: "Failed to update structure template" });
    }
  });

  app.delete("/api/structure-templates/:id", requireAuth, async (req: any, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const userId = req.user?.id;
      
      const existingTemplate = await storage.getStructureTemplate(templateId);
      if (!existingTemplate || existingTemplate.userId !== userId) {
        return res.status(404).json({ message: "Structure template not found or access denied" });
      }

      await storage.deleteStructureTemplate(templateId);
      res.json({ message: "Structure template deleted successfully" });
    } catch (error) {
      console.error("Error deleting structure template:", error);
      res.status(500).json({ message: "Failed to delete structure template" });
    }
  });

  // Generate template description endpoint
  app.post("/api/generate-template-description", requireAuth, async (req: any, res) => {
    try {
      const { content, templateType, model, currentDescription } = req.body;
      
      if (!content) {
        return res.status(400).json({ message: "Content is required" });
      }

      console.log("Generating template description with model:", model);

      // Generate AI description based on template content
      const prompt = currentDescription ? 
        `You have a template with an existing description. Analyze the template content and update ONLY the parts of the description that have changed or need to be added based on the new content. Keep unchanged information exactly as it is.

Current Description: ${currentDescription}

Template Type: ${templateType || 'custom'}
New Template Content: ${content}

Instructions:
1. Compare the new template content with the current description
2. Keep all accurate existing information unchanged
3. Only update or add information that has changed or is new
4. Maintain the same professional tone and format
5. Focus on structure, purpose, and key formatting elements

Updated Description:` :
        `Analyze the following template content and generate a concise, AI-optimized description that explains what this template is for and how it should be used. Focus on the structure, purpose, and key formatting elements.

Template Type: ${templateType || 'custom'}
Template Content: ${content}

Generate a description that is:
1. Clear and concise (2-3 sentences)
2. Focused on the template's purpose and structure
3. Useful for AI systems to understand how to use this template
4. Professional and actionable

Description:`;

      const response = await createChatResponse({
        model: model || "deepseek-r1t2-chimera",
        messages: [
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        maxTokens: 200
      });

      res.json({
        description: response.trim()
      });
    } catch (error) {
      console.error("Error generating template description:", error);
      res.status(500).json({ message: "Failed to generate template description" });
    }
  });

  // Generate template example endpoint
  app.post("/api/generate-template-example", requireAuth, async (req: any, res) => {
    try {
      const { description, templateType, model } = req.body;
      
      if (!description) {
        return res.status(400).json({ message: "Description is required" });
      }

      // Generate random rich text content based on template description
      const prompt = `Based on the following template description, create a realistic example with proper rich text formatting using HTML tags. Make the content engaging and varied, not generic.

Template Type: ${templateType || 'custom'}
Description: ${description}

Create content that:
1. Uses proper HTML formatting (<h1>, <h2>, <p>, <strong>, <em>, <ul>, <li>, etc.)
2. Includes realistic, varied content (names, dates, companies, etc.)
3. Demonstrates the structure and purpose described
4. Is professional and well-formatted
5. Shows different formatting elements where appropriate

Generate only the HTML content without explanations:`;

      console.log("Generating template example with model:", model);
      
      const response = await createChatResponse({
        model: model || "deepseek-r1t2-chimera",
        messages: [
          { role: "user", content: prompt }
        ],
        temperature: 0.8,
        maxTokens: 600
      });

      res.json({
        content: response.trim()
      });
    } catch (error) {
      console.error("Error generating template example:", error);
      res.status(500).json({ message: "Failed to generate template example" });
    }
  });

  // AI User Session endpoint with DeepSeek R1T2 Chimera
  app.post("/api/ai-session", requireAuth, async (req, res) => {
    try {
      const { message, context } = req.body;
      const userId = req.user?.id;

      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      // Create AI session using DeepSeek R1T2 Chimera
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.ROUTER_API_KEY}`,
          "HTTP-Referer": `${req.protocol}://${req.get('host')}`,
          "X-Title": "AI Voice Assistant - User Session",
        },
        body: JSON.stringify({
          model: "tngtech/deepseek-r1t2-chimera:free",
          messages: [
            {
              role: "system",
              content: context || "You are a helpful AI assistant. Provide clear, concise, and accurate responses."
            },
            {
              role: "user",
              content: message
            }
          ],
          temperature: 0.7,
          max_tokens: 1000,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`DeepSeek API error: ${response.status} ${response.statusText}`, errorText);
        
        if (response.status === 401) {
          return res.status(503).json({ 
            message: "DeepSeek AI service unavailable. Please check API configuration.",
            error: "authentication_failed"
          });
        }
        
        return res.status(503).json({ 
          message: "AI service temporarily unavailable. Please try again later.",
          error: "service_error"
        });
      }

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content || "No response generated";

      // Log the session for analytics
      console.log(`AI Session - User ${userId}: ${message.substring(0, 50)}... -> ${aiResponse.substring(0, 50)}...`);

      res.json({
        response: aiResponse,
        model: "tngtech/deepseek-r1t2-chimera:free",
        userId: userId,
        timestamp: new Date().toISOString(),
        usage: data.usage || null
      });

    } catch (error) {
      console.error("AI session error:", error);
      res.status(500).json({ 
        message: "Failed to process AI session",
        error: "internal_error"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}