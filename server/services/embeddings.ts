import { createEmbedding } from "./openai";
import { createGeminiEmbedding } from "./gemini";

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

export function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end);
    chunks.push(chunk);
    
    if (end === text.length) break;
    start = end - overlap;
  }

  return chunks;
}

export async function generateEmbeddings(texts: string[], provider: "openai" | "gemini" = "openai"): Promise<number[][]> {
  const embeddings: number[][] = [];
  
  for (const text of texts) {
    try {
      let embedding: number[];
      
      if (provider === "openai") {
        embedding = await createEmbedding(text);
      } else {
        embedding = await createGeminiEmbedding(text);
      }
      
      embeddings.push(embedding);
    } catch (error) {
      console.error(`Error generating embedding for text: ${text.substring(0, 50)}...`, error);
      // Continue with other texts even if one fails
    }
  }

  return embeddings;
}

export function findMostSimilarChunks(
  queryEmbedding: number[], 
  embeddings: Array<{ embedding: number[]; textChunk: string }>, 
  topK: number = 3
): Array<{ textChunk: string; similarity: number }> {
  const similarities = embeddings.map(({ embedding, textChunk }) => ({
    textChunk,
    similarity: cosineSimilarity(queryEmbedding, embedding),
  }));

  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

export function buildVoiceContext(similarChunks: Array<{ textChunk: string; similarity: number }>): string {
  return similarChunks
    .map(({ textChunk, similarity }) => `[Similarity: ${similarity.toFixed(3)}]\n${textChunk}`)
    .join('\n\n---\n\n');
}
