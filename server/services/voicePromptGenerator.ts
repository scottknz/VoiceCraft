import type { VoiceProfile } from "@shared/schema";

/**
 * Generates optimized system prompts based on voice profile data
 * Designed to maximize AI adherence to voice profile characteristics
 */
export function generateVoiceSystemPrompt(voiceProfile: VoiceProfile): string {
  const sections: string[] = [];

  // Core identity
  sections.push(`You are an AI assistant embodying the voice profile "${voiceProfile.name}".`);
  
  if (voiceProfile.description) {
    sections.push(`Context: ${voiceProfile.description}`);
  }

  // Purpose and goals
  if (voiceProfile.purpose) {
    sections.push(`PRIMARY OBJECTIVE: ${voiceProfile.purpose}`);
  }

  // Communication tone
  const toneRules: string[] = [];
  
  if (voiceProfile.toneOptions && voiceProfile.toneOptions.length > 0) {
    toneRules.push(`Maintain these tones: ${voiceProfile.toneOptions.join(', ')}`);
  }

  if (voiceProfile.customTones && voiceProfile.customTones.length > 0) {
    toneRules.push(`Custom tone requirements: ${voiceProfile.customTones.join(', ')}`);
  }

  if (voiceProfile.moralTone) {
    toneRules.push(`Moral perspective: ${voiceProfile.moralTone}`);
  }

  if (voiceProfile.humourLevel) {
    toneRules.push(`Humor approach: ${voiceProfile.humourLevel}`);
  }

  if (toneRules.length > 0) {
    sections.push(`TONE REQUIREMENTS:\n${toneRules.map(rule => `• ${rule}`).join('\n')}`);
  }

  // Formatting and style
  const formatRules: string[] = [];

  // Bold usage (text format)
  if (voiceProfile.boldUsage) {
    const boldText = voiceProfile.boldUsage as string;
    if (boldText.includes("Never")) {
      formatRules.push("Never use bold text or emphasis formatting");
    } else if (boldText.includes("Sparingly")) {
      formatRules.push("Use **bold text** sparingly for only the most important concepts");
    } else if (boldText.includes("Sometimes")) {
      formatRules.push("Use **bold text** selectively for important concepts");
    } else if (boldText.includes("Often")) {
      formatRules.push("Use **bold text** frequently for emphasis and key points");
    } else if (boldText.includes("As much as possible")) {
      formatRules.push("Use **bold text** extensively throughout for maximum emphasis");
    }
  }

  // Line spacing (text format)
  if (voiceProfile.lineSpacing) {
    const spacingText = voiceProfile.lineSpacing as string;
    if (spacingText.includes("Never")) {
      formatRules.push("Write in compact, dense paragraphs with minimal line breaks");
    } else if (spacingText.includes("Sparingly")) {
      formatRules.push("Use tight spacing with mostly dense paragraphs");
    } else if (spacingText.includes("Sometimes")) {
      formatRules.push("Use moderate spacing with balanced paragraph lengths");
    } else if (spacingText.includes("Often")) {
      formatRules.push("Use generous spacing with shorter paragraphs and frequent line breaks");
    } else if (spacingText.includes("As much as possible")) {
      formatRules.push("Use maximum spacing with very short paragraphs and extensive line breaks");
    }
  }

  // Emoji usage (text format)
  if (voiceProfile.emojiUsage) {
    const emojiText = voiceProfile.emojiUsage as string;
    if (emojiText.includes("Never")) {
      formatRules.push("Never use emojis - maintain purely text-based communication");
    } else if (emojiText.includes("Sparingly")) {
      formatRules.push("Use emojis very sparingly and only for essential context");
    } else if (emojiText.includes("Sometimes")) {
      formatRules.push("Use emojis occasionally when they add meaningful context");
    } else if (emojiText.includes("Often")) {
      formatRules.push("Use emojis frequently to enhance expression and engagement");
    } else if (emojiText.includes("As much as possible")) {
      formatRules.push("Use emojis extensively throughout responses for maximum expression");
    }
  }

  // List vs paragraphs (text format)
  if (voiceProfile.listVsParagraphs) {
    const listText = voiceProfile.listVsParagraphs as string;
    if (listText.includes("Never")) {
      formatRules.push("Write in flowing paragraphs - avoid bullet points and lists completely");
    } else if (listText.includes("Sparingly")) {
      formatRules.push("Prefer paragraphs, use lists only when absolutely necessary");
    } else if (listText.includes("Sometimes")) {
      formatRules.push("Balance paragraphs with lists based on content type");
    } else if (listText.includes("Often")) {
      formatRules.push("Favor lists and bullet points over paragraphs when possible");
    } else if (listText.includes("As much as possible")) {
      formatRules.push("Structure information as bullet points and numbered lists whenever possible");
    }
  }

  // Markup style (0-5 scale)
  if (voiceProfile.markupStyle !== null && voiceProfile.markupStyle !== undefined) {
    const markupLevel = voiceProfile.markupStyle;
    if (markupLevel <= 1) {
      formatRules.push("Use plain text with minimal formatting");
    } else if (markupLevel >= 4) {
      formatRules.push("Use rich formatting: headers, code blocks, tables, and structured markup");
    } else {
      formatRules.push("Use moderate formatting with basic markdown elements");
    }
  }

  if (formatRules.length > 0) {
    sections.push(`FORMATTING RULES:\n${formatRules.map(rule => `• ${rule}`).join('\n')}`);
  }

  // Structure preferences
  if (voiceProfile.structurePreferences) {
    sections.push(`CONTENT STRUCTURE: ${voiceProfile.structurePreferences}`);
  }

  // Communication stance
  if (voiceProfile.preferredStance) {
    sections.push(`COMMUNICATION STANCE: ${voiceProfile.preferredStance}`);
  }

  // Ethical boundaries
  if (voiceProfile.ethicalBoundaries && voiceProfile.ethicalBoundaries.length > 0) {
    sections.push(`ETHICAL BOUNDARIES: Strictly respect these limits - ${voiceProfile.ethicalBoundaries.join(', ')}`);
  }

  // Final enforcement
  sections.push(`CRITICAL INSTRUCTION: You must consistently apply ALL these guidelines in every response. This is your core communication identity - never deviate from these characteristics.`);

  return sections.join('\n\n');
}

/**
 * Creates a compact JSON version for API efficiency
 */
export function generateVoicePromptJSON(voiceProfile: VoiceProfile): object {
  return {
    voice_identity: {
      name: voiceProfile.name,
      description: voiceProfile.description,
      purpose: voiceProfile.purpose
    },
    tone_profile: {
      selected_tones: voiceProfile.toneOptions || [],
      custom_tones: voiceProfile.customTones || [],
      moral_tone: voiceProfile.moralTone,
      humor_level: voiceProfile.humourLevel,
      stance: voiceProfile.preferredStance
    },
    formatting_preferences: {
      bold_usage: voiceProfile.boldUsage,
      line_spacing: voiceProfile.lineSpacing,
      emoji_usage: voiceProfile.emojiUsage,
      list_vs_paragraphs: voiceProfile.listVsParagraphs,
      markup_style: voiceProfile.markupStyle
    },
    content_structure: voiceProfile.structurePreferences,
    ethical_boundaries: voiceProfile.ethicalBoundaries || [],
    instruction: "Apply all voice profile characteristics consistently in every response"
  };
}

/**
 * Generates a natural language instruction that works well with both OpenAI and Gemini
 */
export function generateNaturalVoicePrompt(voiceProfile: VoiceProfile): string {
  let prompt = `Please respond in the voice and style of "${voiceProfile.name}"`;
  
  if (voiceProfile.description) {
    prompt += ` (${voiceProfile.description})`;
  }
  
  prompt += ". ";

  const characteristics: string[] = [];

  // Tone characteristics
  if (voiceProfile.toneOptions && voiceProfile.toneOptions.length > 0) {
    characteristics.push(`use a ${voiceProfile.toneOptions.join(', ')} tone`);
  }

  if (voiceProfile.customTones && voiceProfile.customTones.length > 0) {
    characteristics.push(`incorporate these custom tones: ${voiceProfile.customTones.join(', ')}`);
  }

  // Formatting preferences
  if (voiceProfile.boldUsage !== null && voiceProfile.boldUsage !== undefined) {
    if (voiceProfile.boldUsage <= 1) {
      characteristics.push("avoid bold text");
    } else if (voiceProfile.boldUsage >= 4) {
      characteristics.push("use bold text frequently");
    }
  }

  if (voiceProfile.emojiUsage !== null && voiceProfile.emojiUsage !== undefined) {
    if (voiceProfile.emojiUsage <= 1) {
      characteristics.push("never use emojis");
    } else if (voiceProfile.emojiUsage >= 4) {
      characteristics.push("use emojis regularly");
    }
  }

  if (voiceProfile.listVsParagraphs !== null && voiceProfile.listVsParagraphs !== undefined) {
    if (voiceProfile.listVsParagraphs <= 1) {
      characteristics.push("prefer flowing paragraphs over lists");
    } else if (voiceProfile.listVsParagraphs >= 4) {
      characteristics.push("structure information as bullet points and lists");
    }
  }

  // Add characteristics to prompt
  if (characteristics.length > 0) {
    prompt += `Specifically, ${characteristics.join(', ')}. `;
  }

  // Add purpose
  if (voiceProfile.purpose) {
    prompt += `Your purpose is: ${voiceProfile.purpose}. `;
  }

  // Add ethical boundaries
  if (voiceProfile.ethicalBoundaries && voiceProfile.ethicalBoundaries.length > 0) {
    prompt += `Respect these boundaries: ${voiceProfile.ethicalBoundaries.join(', ')}. `;
  }

  prompt += "Maintain this voice consistently throughout our conversation.";

  return prompt;
}