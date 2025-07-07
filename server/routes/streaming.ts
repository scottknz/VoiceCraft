import type { Express } from "express";
import { storage } from "../storage";
import { createChatStream } from "../services/chat";
import { requireAuth } from "../auth";

export function registerStreamingRoutes(app: Express) {
  // Streaming endpoint - completely rebuilt to match reference implementation
  app.post('/api/chat/stream', requireAuth, async (req: any, res) => {
    try {
      const { conversationId, message, model, voiceProfileId } = req.body;
      console.log("Streaming request:", { conversationId, message, model, voiceProfileId });
      
      const userId = req.user.id;
      
      // Validate conversation access
      const conversation = await storage.getConversation(conversationId);
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Set streaming headers immediately
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });
      
      // Send start signal
      res.write(`data: ${JSON.stringify({ type: "start" })}\n\n`);
      
      try {
        // Save user message and get context in parallel
        const [userMsg, messages, voiceProfile] = await Promise.all([
          storage.addMessage({
            conversationId,
            role: "user",
            content: message,
            model: null,
            voiceProfileId: null
          }),
          storage.getConversationMessages(conversationId),
          voiceProfileId ? storage.getVoiceProfile(voiceProfileId) : null
        ]);
        
        // Build conversation context (exclude the new user message to avoid duplication)
        const conversationHistory = [
          ...messages.slice(0, -1).map(msg => ({
            role: msg.role as "user" | "assistant",
            content: msg.content
          })),
          { role: "user" as const, content: message }
        ];
        
        // Create AI stream
        const { stream } = await createChatStream({
          model: model || "gemini-2.5-flash",
          messages: conversationHistory,
          voiceProfile
        });
        
        const reader = stream.getReader();
        let fullResponse = "";
        
        // Stream response chunks
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = new TextDecoder().decode(value);
          fullResponse += chunk;
          
          // Send content chunk
          res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
        }
        
        // Send completion signal
        res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
        res.end();
        
        // Save AI response to database
        if (fullResponse.trim()) {
          await storage.addMessage({
            conversationId,
            role: "assistant",
            content: fullResponse,
            model: model || "gemini-2.5-flash",
            voiceProfileId
          });
        }
        
        console.log("Streaming completed successfully");
      } catch (streamError) {
        console.error("Streaming error:", streamError);
        res.write(`data: ${JSON.stringify({ type: "error", error: "Stream failed" })}\n\n`);
        res.end();
      }
    } catch (error) {
      console.error("Request error:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Server error" });
      }
    }
  });
}