import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { generateNaturalVoicePrompt } from "./voicePromptGenerator";
import type { VoiceProfile } from "@shared/schema";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  model: "gemini-2.5-flash" | "gemini-2.5-pro" | "gpt-4o" | "gpt-3.5-turbo";
  messages: ChatMessage[];
  systemInstruction?: string;
  voiceProfile?: VoiceProfile;
  temperature?: number;
  maxTokens?: number;
}

export async function createChatResponse(options: ChatOptions): Promise<string> {
  try {
    // Create voice-enhanced options
    const enhancedOptions = { ...options };
    
    if (options.voiceProfile) {
      const voicePrompt = generateNaturalVoicePrompt(options.voiceProfile);
      const baseInstruction = options.systemInstruction || "You are a helpful AI assistant.";
      enhancedOptions.systemInstruction = `${baseInstruction}\n\nVOICE PROFILE INSTRUCTIONS:\n${voicePrompt}`;
    }

    if (options.model.startsWith("gemini")) {
      return await createGeminiResponse(enhancedOptions);
    } else {
      return await createOpenAIResponse(enhancedOptions);
    }
  } catch (error) {
    console.error("Chat API error:", error);
    throw new Error("Failed to generate response");
  }
}

async function createGeminiResponse(options: ChatOptions): Promise<string> {
  // Validate messages array
  if (!options.messages || !Array.isArray(options.messages) || options.messages.length === 0) {
    throw new Error("Messages array is required and must not be empty");
  }

  const lastMessage = options.messages[options.messages.length - 1];
  const prompt = options.systemInstruction 
    ? `${options.systemInstruction}\n\n${lastMessage.content}`
    : lastMessage.content;

  // Generate voice profile instructions if profile exists
  let voiceInstructions = "";
  if (options.voiceProfile) {
    const { generateVoiceSystemPrompt } = await import('./voicePromptGenerator');
    voiceInstructions = generateVoiceSystemPrompt(options.voiceProfile);
    console.log("Generated voice instructions:", voiceInstructions);
  }
  
  const fullPrompt = voiceInstructions ? `${voiceInstructions}\n\nUser: ${lastMessage.content}` : prompt;
  console.log(`Calling Gemini with full prompt: "${fullPrompt.substring(0, 200)}..."`);

  const response = await genAI.models.generateContent({
    model: options.model,
    contents: fullPrompt,
  });

  const text = response.text || "";
  console.log(`Gemini response: "${text.substring(0, 100)}..." (length: ${text.length})`);
  
  return text;
  if (!text.trim()) {
    throw new Error("Gemini returned empty response");
  }
  
  return text;
}

async function createOpenAIResponse(options: ChatOptions): Promise<string> {
  const messages: Array<{role: "system" | "user" | "assistant", content: string}> = [];
  
  if (options.systemInstruction) {
    messages.push({
      role: "system",
      content: options.systemInstruction
    });
  }
  
  messages.push(...options.messages.map(msg => ({
    role: msg.role as "user" | "assistant",
    content: msg.content
  })));

  const response = await openai.chat.completions.create({
    model: options.model as "gpt-4o" | "gpt-3.5-turbo",
    messages,
    temperature: options.temperature || 0.7,
    max_tokens: options.maxTokens || 1000,
  });

  const text = response.choices[0]?.message?.content || "";
  
  if (!text.trim()) {
    throw new Error("OpenAI returned empty response");
  }
  
  return text;
}

export async function createChatStream(options: ChatOptions): Promise<{ stream: ReadableStream, fullResponse: Promise<string> }> {
  try {
    let fullResponseText = '';
    
    if (options.model.startsWith('gemini')) {
      // Use real Gemini streaming
      const geminiOptions: import('./gemini').GeminiChatOptions = {
        model: options.model as "gemini-2.5-pro" | "gemini-2.5-flash",
        messages: options.messages.map(msg => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }]
        })),
        systemInstruction: options.systemInstruction,
        temperature: options.temperature,
        maxOutputTokens: options.maxTokens,
      };
      
      const geminiStream = await import('./gemini').then(m => m.createGeminiChatStream(geminiOptions));
      
      // Create a new stream that captures the full response
      let fullResponsePromiseResolve: (value: string) => void;
      const fullResponsePromise = new Promise<string>((resolve) => {
        fullResponsePromiseResolve = resolve;
      });
      
      const stream = new ReadableStream({
        async start(controller) {
          const reader = geminiStream.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              const chunk = new TextDecoder().decode(value);
              fullResponseText += chunk;
              controller.enqueue(value);
            }
            controller.close();
            fullResponsePromiseResolve(fullResponseText);
          } catch (error) {
            controller.error(error);
            fullResponsePromiseResolve(fullResponseText || "Error occurred during streaming");
          } finally {
            reader.releaseLock();
          }
        }
      });
      
      return { stream, fullResponse: fullResponsePromise };
      
    } else {
      // Use OpenAI streaming
      const openaiOptions: import('./openai').ChatCompletionOptions = {
        model: options.model as "gpt-4o" | "gpt-3.5-turbo",
        messages: options.messages.map(msg => ({
          role: msg.role as "system" | "user" | "assistant",
          content: msg.content
        })),
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        stream: true,
      };
      
      const openaiStream = await import('./openai').then(m => m.createChatCompletionStream(openaiOptions));
      
      // Create a new stream that captures the full response
      const stream = new ReadableStream({
        async start(controller) {
          const reader = openaiStream.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              const chunk = new TextDecoder().decode(value);
              fullResponseText += chunk;
              controller.enqueue(value);
            }
            controller.close();
          } catch (error) {
            controller.error(error);
          } finally {
            reader.releaseLock();
          }
        }
      });
      
      return { stream, fullResponse: Promise.resolve(fullResponseText) };
    }
    
  } catch (error) {
    console.error("Chat stream error:", error);
    const errorMessage = "I apologize, but I encountered an error generating a response. Please try again.";
    
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(errorMessage));
        controller.close();
      }
    });
    
    return { stream, fullResponse: Promise.resolve(errorMessage) };
  }
}