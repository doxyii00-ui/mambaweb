import { z } from "zod";

// Bot schema - stored in memory
export const botSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Bot name is required"),
  token: z.string().min(1, "Token is required"),
  status: z.enum(["online", "offline", "connecting"]).default("offline"),
});

export const insertBotSchema = botSchema.pick({
  name: true,
  token: true,
});

export type Bot = z.infer<typeof botSchema>;
export type InsertBot = z.infer<typeof insertBotSchema>;

// Discord Guild (Server) - from Discord API
export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  memberCount?: number;
}

// Discord Channel - from Discord API
export interface DiscordChannel {
  id: string;
  name: string;
  type: number; // 0 = text channel
  parentId: string | null;
  position: number;
}

// Discord Message - from Discord API
export interface DiscordMessage {
  id: string;
  content: string;
  author: {
    id: string;
    username: string;
    avatar: string | null;
    bot?: boolean;
  };
  timestamp: string;
  attachments?: Array<{
    id: string;
    url: string;
    filename: string;
  }>;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Message send request
export const sendMessageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty").max(2000, "Message too long (max 2000 characters)"),
});

export type SendMessageRequest = z.infer<typeof sendMessageSchema>;
