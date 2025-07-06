import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || ""
});

export interface ChatCompletionOptions {
  model: "gpt-4o" | "gpt-3.5-turbo";
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export async function createChatCompletion(options: ChatCompletionOptions): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: options.model,
      messages: options.messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 1000,
      stream: options.stream || false,
    });

    return response.choices[0].message.content || "";
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error(`OpenAI API error: ${error.message}`);
  }
}

export async function createChatCompletionStream(options: ChatCompletionOptions): Promise<ReadableStream> {
  try {
    const response = await openai.chat.completions.create({
      model: options.model,
      messages: options.messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 1000,
      stream: true,
    });

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
            }
          }
          controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return stream;
  } catch (error) {
    console.error("OpenAI streaming error:", error);
    throw new Error(`OpenAI streaming error: ${error.message}`);
  }
}

export async function createEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error("OpenAI embedding error:", error);
    throw new Error(`OpenAI embedding error: ${error.message}`);
  }
}

export function buildVoiceStylePrompt(userMessage: string, voiceContext: string): string {
  return `You are an AI assistant that adapts your writing style to match the user's voice profile. 

Based on the following writing samples and style context, respond to the user's message using the same tone, vocabulary, sentence structure, and stylistic patterns:

VOICE CONTEXT:
${voiceContext}

USER MESSAGE:
${userMessage}

Please respond in the established voice and style, maintaining consistency with the provided samples.`;
}
