// Script to show Scott's voice profile format as submitted to AI models
import { generateNaturalVoicePrompt, generateVoiceSystemPrompt, generateVoicePromptJSON } from './server/services/voicePromptGenerator.js';

// Mock Scott's profile data (based on the actual profile in the database)
const scottProfile = {
  id: 1,
  userId: "44644849",
  name: "Scott",
  description: "Professional writing style for business communications and technical content",
  purpose: "Create clear, concise, and professional content for business and technical documentation",
  toneOptions: ["professional", "authoritative", "direct"],
  customTones: ["business-focused", "no-nonsense"],
  moralTone: "pragmatic",
  humourLevel: "minimal",
  structurePreferences: "Start with clear objectives, provide logical flow, include actionable takeaways",
  boldUsage: 2,
  lineSpacing: 2,
  emojiUsage: 0,
  listVsParagraphs: 3,
  markupStyle: 2,
  preferredStance: "Challenger",
  ethicalBoundaries: ["avoid personal opinions", "stick to facts"],
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  samplesCount: 0
};

console.log("=== SCOTT VOICE PROFILE - SUBMITTED TO AI MODELS ===\n");

console.log("1. NATURAL LANGUAGE PROMPT (Used by default):");
console.log("-----------------------------------------------");
console.log(generateNaturalVoicePrompt(scottProfile));

console.log("\n\n2. SYSTEM PROMPT FORMAT (Detailed version):");
console.log("-------------------------------------------");
console.log(generateVoiceSystemPrompt(scottProfile));

console.log("\n\n3. JSON FORMAT (Compact version):");
console.log("----------------------------------");
console.log(JSON.stringify(generateVoicePromptJSON(scottProfile), null, 2));

console.log("\n=== END OF SCOTT PROFILE FORMATS ===");