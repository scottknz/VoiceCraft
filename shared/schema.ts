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

// User storage table with independent authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username").unique().notNull(),
  email: varchar("email").unique().notNull(),
  password: varchar("password").notNull(), // Hashed password
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  emailVerified: boolean("email_verified").default(false),
  accountStatus: varchar("account_status").default("active"), // active, suspended, pending
  lastLoginAt: timestamp("last_login_at"),
  loginCount: integer("login_count").default(0),
  preferredLanguage: varchar("preferred_language").default("en"),
  timezone: varchar("timezone"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User sessions table for enhanced session tracking
export const userSessions = pgTable("user_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionId: varchar("session_id").notNull().unique(),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Security events table for audit logging
export const securityEvents = pgTable("security_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  eventType: varchar("event_type").notNull(), // login, logout, password_change, profile_update, etc.
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  details: text("details"), // JSON string for additional event data
  severity: varchar("severity").default("info"), // info, warning, critical
  createdAt: timestamp("created_at").defaultNow(),
});

// Voice profiles table
export const voiceProfiles = pgTable("voice_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
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
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
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
  sessions: many(userSessions),
  securityEvents: many(securityEvents),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));

export const securityEventsRelations = relations(securityEvents, ({ one }) => ({
  user: one(users, {
    fields: [securityEvents.userId],
    references: [users.id],
  }),
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
}).extend({
  // Transform empty strings to null for optional fields
  description: z.string().optional().transform(val => val === "" ? null : val),
  purpose: z.string().optional().transform(val => val === "" ? null : val),
  structurePreferences: z.string().optional().transform(val => val === "" ? null : val),
  moralTone: z.string().optional().transform(val => val === "" ? null : val),
  preferredStance: z.string().optional().transform(val => val === "" ? null : val),
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
export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = typeof userSessions.$inferInsert;
export type SecurityEvent = typeof securityEvents.$inferSelect;
export type InsertSecurityEvent = typeof securityEvents.$inferInsert;
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
