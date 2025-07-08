import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  real,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Voice profiles table
export const voiceProfiles = pgTable("voice_profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  description: text("description"),
  
  // Purpose
  purpose: text("purpose"),
  
  // Tone - array of selected tone options plus custom tones
  toneOptions: text("tone_options").array(),
  customTones: text("custom_tones").array(),
  
  // Structure
  structurePreferences: text("structure_preferences"),
  
  // Formatting - sliders (0-5)
  boldUsage: integer("bold_usage").default(2), // 0-5
  lineSpacing: integer("line_spacing").default(2), // 0=dense, 5=spacious
  emojiUsage: integer("emoji_usage").default(1), // 0=never, 2=sparingly, 5=expressively
  listVsParagraphs: integer("list_vs_paragraphs").default(2), // 0=all paragraphs, 5=all lists
  markupStyle: integer("markup_style").default(2), // 0=plain text, 2=markdown, 5=HTML
  
  // Personality & Values
  moralTone: text("moral_tone"),
  preferredStance: varchar("preferred_stance"), // Challenger/Coach/Collaborator/Curator
  ethicalBoundaries: text("ethical_boundaries").array(),
  humourLevel: varchar("humour_level"), // None/Dry/Occasional/Bold
  
  isActive: boolean("is_active").default(false),
  samplesCount: integer("samples_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Writing samples table
export const writingSamples = pgTable("writing_samples", {
  id: serial("id").primaryKey(),
  voiceProfileId: integer("voice_profile_id").notNull().references(() => voiceProfiles.id, { onDelete: "cascade" }),
  fileName: varchar("file_name").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Embeddings table
export const embeddings = pgTable("embeddings", {
  id: serial("id").primaryKey(),
  voiceProfileId: integer("voice_profile_id").notNull().references(() => voiceProfiles.id, { onDelete: "cascade" }),
  embedding: real("embedding").array().notNull(),
  textChunk: text("text_chunk").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Chat conversations table
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat messages table
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: varchar("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  model: varchar("model"), // 'gpt-4', 'gpt-3.5-turbo', 'gemini-pro', 'gemini-flash'
  voiceProfileId: integer("voice_profile_id").references(() => voiceProfiles.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  voiceProfiles: many(voiceProfiles),
  conversations: many(conversations),
}));

export const voiceProfilesRelations = relations(voiceProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [voiceProfiles.userId],
    references: [users.id],
  }),
  writingSamples: many(writingSamples),
  embeddings: many(embeddings),
  messages: many(messages),
}));

export const writingSamplesRelations = relations(writingSamples, ({ one }) => ({
  voiceProfile: one(voiceProfiles, {
    fields: [writingSamples.voiceProfileId],
    references: [voiceProfiles.id],
  }),
}));

export const embeddingsRelations = relations(embeddings, ({ one }) => ({
  voiceProfile: one(voiceProfiles, {
    fields: [embeddings.voiceProfileId],
    references: [voiceProfiles.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  voiceProfile: one(voiceProfiles, {
    fields: [messages.voiceProfileId],
    references: [voiceProfiles.id],
  }),
}));

// Insert schemas
export const insertVoiceProfileSchema = createInsertSchema(voiceProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWritingSampleSchema = createInsertSchema(writingSamples).omit({
  id: true,
  createdAt: true,
});

export const insertEmbeddingSchema = createInsertSchema(embeddings).omit({
  id: true,
  createdAt: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type VoiceProfile = typeof voiceProfiles.$inferSelect;
export type InsertVoiceProfile = z.infer<typeof insertVoiceProfileSchema>;
export type WritingSample = typeof writingSamples.$inferSelect;
export type InsertWritingSample = z.infer<typeof insertWritingSampleSchema>;
export type Embedding = typeof embeddings.$inferSelect;
export type InsertEmbedding = z.infer<typeof insertEmbeddingSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
