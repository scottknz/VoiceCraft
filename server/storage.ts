import {
  users,
  voiceProfiles,
  writingSamples,
  embeddings,
  conversations,
  messages,
  type User,
  type UpsertUser,
  type VoiceProfile,
  type InsertVoiceProfile,
  type WritingSample,
  type InsertWritingSample,
  type Embedding,
  type InsertEmbedding,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, count } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Voice profile operations
  getUserVoiceProfiles(userId: string): Promise<VoiceProfile[]>;
  createVoiceProfile(profile: InsertVoiceProfile): Promise<VoiceProfile>;
  updateVoiceProfile(id: number, profile: Partial<InsertVoiceProfile>): Promise<VoiceProfile>;
  deleteVoiceProfile(id: number): Promise<void>;
  getVoiceProfile(id: number): Promise<VoiceProfile | undefined>;
  setActiveVoiceProfile(userId: string, profileId: number): Promise<void>;

  // Writing sample operations
  addWritingSample(sample: InsertWritingSample): Promise<WritingSample>;
  getVoiceProfileSamples(voiceProfileId: number): Promise<WritingSample[]>;
  deleteWritingSample(id: number): Promise<void>;

  // Embedding operations
  addEmbedding(embedding: InsertEmbedding): Promise<Embedding>;
  getVoiceProfileEmbeddings(voiceProfileId: number): Promise<Embedding[]>;
  deleteVoiceProfileEmbeddings(voiceProfileId: number): Promise<void>;

  // Conversation operations
  getUserConversations(userId: string): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getConversation(id: number): Promise<Conversation | undefined>;
  updateConversation(id: number, conversation: Partial<InsertConversation>): Promise<Conversation>;

  // Message operations
  getConversationMessages(conversationId: number): Promise<Message[]>;
  addMessage(message: InsertMessage): Promise<Message>;
  updateMessage(id: number, message: Partial<InsertMessage>): Promise<Message>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Voice profile operations
  async getUserVoiceProfiles(userId: string): Promise<VoiceProfile[]> {
    return await db
      .select()
      .from(voiceProfiles)
      .where(eq(voiceProfiles.userId, userId))
      .orderBy(desc(voiceProfiles.updatedAt));
  }

  async createVoiceProfile(profile: InsertVoiceProfile): Promise<VoiceProfile> {
    const [newProfile] = await db
      .insert(voiceProfiles)
      .values(profile)
      .returning();
    return newProfile;
  }

  async updateVoiceProfile(id: number, profile: Partial<InsertVoiceProfile>): Promise<VoiceProfile> {
    const [updatedProfile] = await db
      .update(voiceProfiles)
      .set({ ...profile, updatedAt: new Date() })
      .where(eq(voiceProfiles.id, id))
      .returning();
    return updatedProfile;
  }

  async deleteVoiceProfile(id: number): Promise<void> {
    await db.delete(voiceProfiles).where(eq(voiceProfiles.id, id));
  }

  async getVoiceProfile(id: number): Promise<VoiceProfile | undefined> {
    const [profile] = await db
      .select()
      .from(voiceProfiles)
      .where(eq(voiceProfiles.id, id));
    return profile;
  }

  async setActiveVoiceProfile(userId: string, profileId: number): Promise<void> {
    // First, deactivate all profiles for the user
    await db
      .update(voiceProfiles)
      .set({ isActive: false })
      .where(eq(voiceProfiles.userId, userId));

    // Then activate the selected profile
    await db
      .update(voiceProfiles)
      .set({ isActive: true })
      .where(and(eq(voiceProfiles.id, profileId), eq(voiceProfiles.userId, userId)));
  }

  // Writing sample operations
  async addWritingSample(sample: InsertWritingSample): Promise<WritingSample> {
    const [newSample] = await db
      .insert(writingSamples)
      .values(sample)
      .returning();

    // Update sample count
    const [sampleCount] = await db
      .select({ count: count(writingSamples.id) })
      .from(writingSamples)
      .where(eq(writingSamples.voiceProfileId, sample.voiceProfileId));
    
    await db
      .update(voiceProfiles)
      .set({ 
        samplesCount: sampleCount.count,
        updatedAt: new Date()
      })
      .where(eq(voiceProfiles.id, sample.voiceProfileId));

    return newSample;
  }

  async getVoiceProfileSamples(voiceProfileId: number): Promise<WritingSample[]> {
    return await db
      .select()
      .from(writingSamples)
      .where(eq(writingSamples.voiceProfileId, voiceProfileId))
      .orderBy(desc(writingSamples.createdAt));
  }

  async deleteWritingSample(id: number): Promise<void> {
    await db.delete(writingSamples).where(eq(writingSamples.id, id));
  }

  // Embedding operations
  async addEmbedding(embedding: InsertEmbedding): Promise<Embedding> {
    const [newEmbedding] = await db
      .insert(embeddings)
      .values(embedding)
      .returning();
    return newEmbedding;
  }

  async getVoiceProfileEmbeddings(voiceProfileId: number): Promise<Embedding[]> {
    return await db
      .select()
      .from(embeddings)
      .where(eq(embeddings.voiceProfileId, voiceProfileId));
  }

  async deleteVoiceProfileEmbeddings(voiceProfileId: number): Promise<void> {
    await db.delete(embeddings).where(eq(embeddings.voiceProfileId, voiceProfileId));
  }

  // Conversation operations
  async getUserConversations(userId: string): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt));
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [newConversation] = await db
      .insert(conversations)
      .values(conversation)
      .returning();
    return newConversation;
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    return conversation;
  }

  async updateConversation(id: number, conversation: Partial<InsertConversation>): Promise<Conversation> {
    const [updatedConversation] = await db
      .update(conversations)
      .set({ ...conversation, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return updatedConversation;
  }

  // Message operations
  async getConversationMessages(conversationId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  async addMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db
      .insert(messages)
      .values(message)
      .returning();
    return newMessage;
  }

  async updateMessage(id: number, message: Partial<InsertMessage>): Promise<Message> {
    const [updatedMessage] = await db
      .update(messages)
      .set(message)
      .where(eq(messages.id, id))
      .returning();
    return updatedMessage;
  }
}

export const storage = new DatabaseStorage();
