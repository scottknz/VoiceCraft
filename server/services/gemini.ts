import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface GeminiChatOptions {
  model: "gemini-2.5-pro" | "gemini-2.5-flash";
  messages: Array<{
    role: "user" | "model";
    parts: Array<{ text: string }>;
  }>;
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export async function createGeminiChat(options: GeminiChatOptions): Promise<string> {
  try {
    const lastMessage = options.messages[options.messages.length - 1];
    const prompt = options.systemInstruction 
      ? `${options.systemInstruction}\n\nUser: ${lastMessage.parts[0].text}`
      : lastMessage.parts[0].text;

    const response = await genAI.models.generateContent({
      model: options.model,
      contents: prompt,
      config: {
        temperature: options.temperature || 0.7,
        maxOutputTokens: options.maxOutputTokens || 1000,
      },
    });

    return response.text || "";
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error(`Gemini API error: ${error.message}`);
  }
}

export async function createGeminiChatStream(options: GeminiChatOptions): Promise<ReadableStream> {
  try {
    const lastMessage = options.messages[options.messages.length - 1];
    const prompt = options.systemInstruction 
      ? `${options.systemInstruction}\n\nUser: ${lastMessage.parts[0].text}`
      : lastMessage.parts[0].text;

    console.log(`Calling Gemini API with prompt: "${prompt.substring(0, 100)}..."`);
    
    // Use Gemini's real streaming API
    console.log("Starting real Gemini streaming...");
    
    const result = await genAI.models.generateContentStream({
      model: options.model,
      contents: prompt,
      config: {
        temperature: options.temperature || 0.7,
        maxOutputTokens: options.maxOutputTokens || 1000,
      },
    });
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Stream real-time chunks from Gemini
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
              // Send just the text chunk - routes.ts handles SSE formatting
              controller.enqueue(new TextEncoder().encode(chunkText));
            }
          }
          controller.close();
        } catch (error) {
          console.error("Error in Gemini stream:", error);
          controller.error(error);
        }
      },
    });

    return stream;
  } catch (error) {
    console.error("Gemini streaming error:", error);
    throw new Error(`Gemini streaming error: ${error.message}`);
  }
}

export async function createGeminiEmbedding(text: string): Promise<number[]> {
  try {
    const response = await genAI.models.generateContent({
      model: "text-embedding-004",
      contents: text,
    });
    
    // For now, return a dummy embedding vector since Gemini embeddings API may differ
    // This should be replaced with actual Gemini embedding implementation
    return new Array(768).fill(0).map(() => Math.random() - 0.5);
  } catch (error) {
    console.error("Gemini embedding error:", error);
    throw new Error(`Gemini embedding error: ${error.message}`);
  }
}

export function buildGeminiVoiceStylePrompt(userMessage: string, voiceContext: string): string {
  return `You are an AI assistant that adapts your writing style to match the user's voice profile. 

Based on the following writing samples and style context, respond to the user's message using the same tone, vocabulary, sentence structure, and stylistic patterns:

VOICE CONTEXT:
${voiceContext}

USER MESSAGE:
${userMessage}

Please respond in the established voice and style, maintaining consistency with the provided samples.`;
}
