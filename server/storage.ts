import { type Bot, type InsertBot } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Bot CRUD
  getBots(): Promise<Bot[]>;
  getBot(id: string): Promise<Bot | undefined>;
  createBot(bot: InsertBot): Promise<Bot>;
  updateBot(id: string, updates: Partial<Bot>): Promise<Bot | undefined>;
  deleteBot(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private bots: Map<string, Bot>;

  constructor() {
    this.bots = new Map();
  }

  async getBots(): Promise<Bot[]> {
    return Array.from(this.bots.values());
  }

  async getBot(id: string): Promise<Bot | undefined> {
    return this.bots.get(id);
  }

  async createBot(insertBot: InsertBot): Promise<Bot> {
    const id = randomUUID();
    const bot: Bot = { 
      ...insertBot, 
      id, 
      status: "offline" 
    };
    this.bots.set(id, bot);
    return bot;
  }

  async updateBot(id: string, updates: Partial<Bot>): Promise<Bot | undefined> {
    const bot = this.bots.get(id);
    if (!bot) return undefined;
    
    const updatedBot = { ...bot, ...updates };
    this.bots.set(id, updatedBot);
    return updatedBot;
  }

  async deleteBot(id: string): Promise<boolean> {
    return this.bots.delete(id);
  }
}

export const storage = new MemStorage();
