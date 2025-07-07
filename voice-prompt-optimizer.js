// Voice Profile Prompt Optimizer
// Creates optimized system prompts based on voice profile data

function createVoicePrompt(voiceProfile) {
  // Base voice instruction template
  const basePrompt = `You are an AI assistant that must adapt your communication style to match the user's voice profile. Follow these guidelines strictly:

VOICE PROFILE: "${voiceProfile.name}" ${voiceProfile.description ? `(${voiceProfile.description})` : ''}

COMMUNICATION STYLE:
`;

  let styleInstructions = [];

  // Formatting preferences (0-5 scale)
  if (voiceProfile.boldUsage !== undefined) {
    const boldLevel = voiceProfile.boldUsage;
    if (boldLevel <= 1) {
      styleInstructions.push("• Avoid bold text and emphasis formatting");
    } else if (boldLevel >= 4) {
      styleInstructions.push("• Use **bold text** frequently for emphasis and key points");
    } else {
      styleInstructions.push("• Use **bold text** selectively for important concepts");
    }
  }

  if (voiceProfile.lineSpacing !== undefined) {
    const spacing = voiceProfile.lineSpacing;
    if (spacing <= 1) {
      styleInstructions.push("• Write in compact, dense paragraphs with minimal line breaks");
    } else if (spacing >= 4) {
      styleInstructions.push("• Use generous spacing with short paragraphs and frequent line breaks");
    } else {
      styleInstructions.push("• Use moderate spacing with balanced paragraph lengths");
    }
  }

  if (voiceProfile.emojiUsage !== undefined) {
    const emojiLevel = voiceProfile.emojiUsage;
    if (emojiLevel <= 1) {
      styleInstructions.push("• Never use emojis - maintain purely text-based communication");
    } else if (emojiLevel >= 4) {
      styleInstructions.push("• Use emojis regularly to enhance expression and engagement 🎯");
    } else {
      styleInstructions.push("• Use emojis sparingly and only when they add meaningful context");
    }
  }

  if (voiceProfile.listVsParagraphs !== undefined) {
    const listPreference = voiceProfile.listVsParagraphs;
    if (listPreference <= 1) {
      styleInstructions.push("• Write in flowing paragraphs - avoid bullet points and lists");
    } else if (listPreference >= 4) {
      styleInstructions.push("• Structure information as bullet points and numbered lists whenever possible");
    } else {
      styleInstructions.push("• Balance paragraphs with lists based on content type");
    }
  }

  if (voiceProfile.markupStyle !== undefined) {
    const markupLevel = voiceProfile.markupStyle;
    if (markupLevel <= 1) {
      styleInstructions.push("• Use plain text with minimal formatting");
    } else if (markupLevel >= 4) {
      styleInstructions.push("• Use rich formatting: headers, code blocks, tables, and structured markup");
    } else {
      styleInstructions.push("• Use moderate formatting with basic markdown elements");
    }
  }

  // Tone and personality
  if (voiceProfile.toneOptions && voiceProfile.toneOptions.length > 0) {
    styleInstructions.push(`• Maintain these tones: ${voiceProfile.toneOptions.join(', ')}`);
  }

  if (voiceProfile.customTones && voiceProfile.customTones.length > 0) {
    styleInstructions.push(`• Custom tone requirements: ${voiceProfile.customTones.join(', ')}`);
  }

  if (voiceProfile.moralTone) {
    styleInstructions.push(`• Moral perspective: ${voiceProfile.moralTone}`);
  }

  if (voiceProfile.preferredStance) {
    styleInstructions.push(`• Communication stance: ${voiceProfile.preferredStance}`);
  }

  if (voiceProfile.humourLevel) {
    styleInstructions.push(`• Humor level: ${voiceProfile.humourLevel}`);
  }

  // Purpose and structure
  if (voiceProfile.purpose) {
    styleInstructions.push(`• Purpose/Goal: ${voiceProfile.purpose}`);
  }

  if (voiceProfile.structurePreferences) {
    styleInstructions.push(`• Structure preferences: ${voiceProfile.structurePreferences}`);
  }

  // Ethical boundaries
  if (voiceProfile.ethicalBoundaries && voiceProfile.ethicalBoundaries.length > 0) {
    styleInstructions.push(`• Ethical boundaries: Respect these limits - ${voiceProfile.ethicalBoundaries.join(', ')}`);
  }

  // Combine all instructions
  const fullPrompt = basePrompt + styleInstructions.join('\n') + `

CRITICAL: You must consistently apply ALL these style guidelines in every response. This is not optional - it defines your core communication identity for this conversation.`;

  return fullPrompt;
}

// Example usage with Scott profile
const scottProfile = {
  name: "Scott",
  description: "Linkedin",
  boldUsage: 2,
  lineSpacing: 2,
  emojiUsage: 1,
  listVsParagraphs: 2,
  markupStyle: 2,
  toneOptions: [],
  customTones: [],
  purpose: "",
  structurePreferences: "",
  moralTone: "",
  preferredStance: "",
  ethicalBoundaries: [],
  humourLevel: ""
};

console.log("=== OPTIMIZED VOICE PROMPT FOR SCOTT ===");
console.log(createVoicePrompt(scottProfile));