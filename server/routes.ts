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
import { createChatCompletion, createChatCompletionStream, buildVoiceStylePrompt } from "./services/openai";
import { createGeminiChat, createGeminiChatStream, buildGeminiVoiceStylePrompt } from "./services/gemini";
import { generateEmbeddings, chunkText, findMostSimilarChunks, buildVoiceContext } from "./services/embeddings";
import multer from "multer";
import { z } from "zod";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

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

  app.put('/api/voice-profiles/:id', isAuthenticated, async (req: any, res) => {
    try {
      const profileId = parseInt(req.params.id);
      const profile = await storage.updateVoiceProfile(profileId, req.body);
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
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting voice profile:", error);
      res.status(500).json({ message: "Failed to delete voice profile" });
    }
  });

  app.post('/api/voice-profiles/:id/activate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profileId = parseInt(req.params.id);
      await storage.setActiveVoiceProfile(userId, profileId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error activating voice profile:", error);
      res.status(500).json({ message: "Failed to activate voice profile" });
    }
  });

  // Writing sample and embedding routes
  app.post('/api/voice-profiles/:id/samples', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const profileId = parseInt(req.params.id);
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Extract text content from file
      let content = "";
      if (file.mimetype === 'text/plain') {
        content = file.buffer.toString('utf-8');
      } else {
        return res.status(400).json({ message: "Unsupported file type. Please upload .txt files." });
      }

      // Save writing sample
      const sample = await storage.addWritingSample({
        voiceProfileId: profileId,
        fileName: file.originalname,
        content
      });

      // Generate embeddings for the content
      const chunks = chunkText(content);
      const embeddings = await generateEmbeddings(chunks);
      
      // Save embeddings
      for (let i = 0; i < chunks.length; i++) {
        await storage.addEmbedding({
          voiceProfileId: profileId,
          embedding: embeddings[i],
          textChunk: chunks[i]
        });
      }

      res.json(sample);
    } catch (error) {
      console.error("Error uploading writing sample:", error);
      res.status(500).json({ message: "Failed to upload writing sample" });
    }
  });

  app.get('/api/voice-profiles/:id/samples', isAuthenticated, async (req: any, res) => {
    try {
      const profileId = parseInt(req.params.id);
      const samples = await storage.getVoiceProfileSamples(profileId);
      res.json(samples);
    } catch (error) {
      console.error("Error fetching writing samples:", error);
      res.status(500).json({ message: "Failed to fetch writing samples" });
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
      const { message, model, conversationId, voiceProfileId, stream } = chatSchema.parse(req.body);
      
      // Save user message
      const userMessage = await storage.addMessage({
        conversationId,
        role: "user",
        content: message,
        model,
        voiceProfileId
      });

      let systemPrompt = "";
      let responseContent = "";

      // If voice profile is selected, build context from embeddings
      if (voiceProfileId) {
        const embeddings = await storage.getVoiceProfileEmbeddings(voiceProfileId);
        if (embeddings.length > 0) {
          // Generate embedding for user message to find similar chunks
          const userEmbedding = await generateEmbeddings([message]);
          const similarChunks = findMostSimilarChunks(
            userEmbedding[0], 
            embeddings.map(e => ({ embedding: e.embedding, textChunk: e.textChunk }))
          );
          const voiceContext = buildVoiceContext(similarChunks);
          systemPrompt = buildVoiceStylePrompt(message, voiceContext);
        }
      }

      // Generate AI response
      if (model.startsWith("gpt")) {
        const messages = systemPrompt 
          ? [{ role: "system" as const, content: systemPrompt }, { role: "user" as const, content: message }]
          : [{ role: "user" as const, content: message }];

        if (stream) {
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');
          
          const responseStream = await createChatCompletionStream({
            model: model as "gpt-4o" | "gpt-3.5-turbo",
            messages
          });
          
          const reader = responseStream.getReader();
          let fullResponse = "";
          
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              const chunk = new TextDecoder().decode(value);
              const lines = chunk.split('\n');
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') {
                    // Save complete response
                    await storage.addMessage({
                      conversationId,
                      role: "assistant",
                      content: fullResponse,
                      model,
                      voiceProfileId
                    });
                    res.write(`data: [DONE]\n\n`);
                    res.end();
                    return;
                  }
                  
                  try {
                    const parsed = JSON.parse(data);
                    if (parsed.content) {
                      fullResponse += parsed.content;
                    }
                  } catch (e) {
                    // Ignore parsing errors
                  }
                  
                  res.write(line + '\n');
                }
              }
            }
          } catch (error) {
            console.error("Streaming error:", error);
            res.write(`data: {"error": "Stream error"}\n\n`);
            res.end();
          }
        } else {
          responseContent = await createChatCompletion({
            model: model as "gpt-4o" | "gpt-3.5-turbo",
            messages
          });
        }
      } else {
        // Gemini models
        const messages = [{ role: "user" as const, parts: [{ text: message }] }];
        
        if (stream) {
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');
          
          const responseStream = await createGeminiChatStream({
            model: model as "gemini-2.5-pro" | "gemini-2.5-flash",
            messages,
            systemInstruction: systemPrompt
          });
          
          const reader = responseStream.getReader();
          let fullResponse = "";
          
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              const chunk = new TextDecoder().decode(value);
              const lines = chunk.split('\n');
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') {
                    // Save complete response
                    await storage.addMessage({
                      conversationId,
                      role: "assistant",
                      content: fullResponse,
                      model,
                      voiceProfileId
                    });
                    res.write(`data: [DONE]\n\n`);
                    res.end();
                    return;
                  }
                  
                  try {
                    const parsed = JSON.parse(data);
                    if (parsed.content) {
                      fullResponse += parsed.content;
                    }
                  } catch (e) {
                    // Ignore parsing errors
                  }
                  
                  res.write(line + '\n');
                }
              }
            }
          } catch (error) {
            console.error("Streaming error:", error);
            res.write(`data: {"error": "Stream error"}\n\n`);
            res.end();
          }
        } else {
          responseContent = await createGeminiChat({
            model: model as "gemini-2.5-pro" | "gemini-2.5-flash",
            messages,
            systemInstruction: systemPrompt
          });
        }
      }

      if (!stream) {
        // Save assistant message
        const assistantMessage = await storage.addMessage({
          conversationId,
          role: "assistant",
          content: responseContent,
          model,
          voiceProfileId
        });

        res.json({
          userMessage,
          assistantMessage,
          response: responseContent
        });
      }
    } catch (error) {
      console.error("Error in chat completion:", error);
      if (req.headers.accept === 'text/event-stream') {
        res.write(`data: {"error": "Chat completion failed"}\n\n`);
        res.end();
      } else {
        res.status(500).json({ message: "Chat completion failed" });
      }
    }
  });

  // Comparison route for side-by-side comparison
  app.post('/api/chat/compare', isAuthenticated, async (req: any, res) => {
    try {
      const { message, model, voiceProfileId } = chatSchema.parse(req.body);
      
      // Generate standard response
      const standardMessages = [{ role: "user" as const, content: message }];
      let standardResponse = "";
      
      if (model.startsWith("gpt")) {
        standardResponse = await createChatCompletion({
          model: model as "gpt-4o" | "gpt-3.5-turbo",
          messages: standardMessages
        });
      } else {
        standardResponse = await createGeminiChat({
          model: model as "gemini-2.5-pro" | "gemini-2.5-flash",
          messages: [{ role: "user", parts: [{ text: message }] }]
        });
      }

      // Generate voice-styled response
      let voiceResponse = "";
      if (voiceProfileId) {
        const embeddings = await storage.getVoiceProfileEmbeddings(voiceProfileId);
        if (embeddings.length > 0) {
          const userEmbedding = await generateEmbeddings([message]);
          const similarChunks = findMostSimilarChunks(
            userEmbedding[0], 
            embeddings.map(e => ({ embedding: e.embedding, textChunk: e.textChunk }))
          );
          const voiceContext = buildVoiceContext(similarChunks);
          
          if (model.startsWith("gpt")) {
            const systemPrompt = buildVoiceStylePrompt(message, voiceContext);
            voiceResponse = await createChatCompletion({
              model: model as "gpt-4o" | "gpt-3.5-turbo",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: message }
              ]
            });
          } else {
            const systemPrompt = buildGeminiVoiceStylePrompt(message, voiceContext);
            voiceResponse = await createGeminiChat({
              model: model as "gemini-2.5-pro" | "gemini-2.5-flash",
              messages: [{ role: "user", parts: [{ text: message }] }],
              systemInstruction: systemPrompt
            });
          }
        }
      }

      res.json({
        standardResponse,
        voiceResponse,
        model,
        voiceProfileId
      });
    } catch (error) {
      console.error("Error in comparison:", error);
      res.status(500).json({ message: "Comparison failed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
