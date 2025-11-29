import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBotSchema, sendMessageSchema } from "@shared/schema";
import { Client, GatewayIntentBits, ChannelType } from "discord.js";

// Store Discord clients for each bot
const discordClients: Map<string, Client> = new Map();

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Get all bots
  app.get("/api/bots", async (req, res) => {
    try {
      const bots = await storage.getBots();
      // Don't send tokens to frontend
      const safeBots = bots.map(({ token, ...rest }) => rest);
      res.json(safeBots);
    } catch (error) {
      res.status(500).json({ error: "Failed to get bots" });
    }
  });

  // Create a new bot
  app.post("/api/bots", async (req, res) => {
    try {
      const parsed = insertBotSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const bot = await storage.createBot(parsed.data);
      // Don't send token back
      const { token, ...safeBot } = bot;
      res.json(safeBot);
    } catch (error) {
      res.status(500).json({ error: "Failed to create bot" });
    }
  });

  // Delete a bot
  app.delete("/api/bots/:botId", async (req, res) => {
    try {
      const { botId } = req.params;
      
      // Disconnect if connected
      const client = discordClients.get(botId);
      if (client) {
        client.destroy();
        discordClients.delete(botId);
      }
      
      const deleted = await storage.deleteBot(botId);
      if (!deleted) {
        return res.status(404).json({ error: "Bot not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete bot" });
    }
  });

  // Connect bot to Discord
  app.post("/api/bots/:botId/connect", async (req, res) => {
    try {
      const { botId } = req.params;
      const bot = await storage.getBot(botId);
      
      if (!bot) {
        return res.status(404).json({ error: "Bot not found" });
      }

      // Check if already connected
      if (discordClients.has(botId)) {
        const existingClient = discordClients.get(botId);
        if (existingClient?.isReady()) {
          return res.json({ success: true, message: "Already connected" });
        }
      }

      // Update status to connecting
      await storage.updateBot(botId, { status: "connecting" });

      // Create new Discord client
      const client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent,
          GatewayIntentBits.GuildMembers,
        ],
      });

      // Handle ready event
      client.once("ready", async () => {
        console.log(`Bot ${bot.name} connected as ${client.user?.tag}`);
        await storage.updateBot(botId, { status: "online" });
      });

      // Handle disconnect
      client.on("disconnect", async () => {
        console.log(`Bot ${bot.name} disconnected`);
        await storage.updateBot(botId, { status: "offline" });
        discordClients.delete(botId);
      });

      // Handle errors
      client.on("error", async (error) => {
        console.error(`Bot ${bot.name} error:`, error);
      });

      // Login
      try {
        await client.login(bot.token);
        discordClients.set(botId, client);
        res.json({ success: true });
      } catch (loginError: any) {
        await storage.updateBot(botId, { status: "offline" });
        console.error("Login error:", loginError);
        res.status(400).json({ error: "Nieprawidlowy token lub blad logowania" });
      }
    } catch (error) {
      console.error("Connect error:", error);
      res.status(500).json({ error: "Failed to connect bot" });
    }
  });

  // Disconnect bot
  app.post("/api/bots/:botId/disconnect", async (req, res) => {
    try {
      const { botId } = req.params;
      const client = discordClients.get(botId);
      
      if (client) {
        client.destroy();
        discordClients.delete(botId);
      }
      
      await storage.updateBot(botId, { status: "offline" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to disconnect bot" });
    }
  });

  // Get guilds for a bot - use fetch instead of cache
  app.get("/api/bots/:botId/guilds", async (req, res) => {
    try {
      const { botId } = req.params;
      const client = discordClients.get(botId);
      
      if (!client || !client.isReady()) {
        return res.status(400).json({ error: "Bot not connected" });
      }

      // Fetch guilds from API instead of cache
      const fetchedGuilds = await client.guilds.fetch();
      const guilds = await Promise.all(
        fetchedGuilds.map(async (partialGuild) => {
          try {
            const guild = await partialGuild.fetch();
            return {
              id: guild.id,
              name: guild.name,
              icon: guild.icon,
              memberCount: guild.memberCount,
            };
          } catch (e) {
            // Fallback to partial data if full fetch fails
            return {
              id: partialGuild.id,
              name: partialGuild.name,
              icon: null,
              memberCount: undefined,
            };
          }
        })
      );

      res.json(guilds);
    } catch (error) {
      console.error("Get guilds error:", error);
      res.status(500).json({ error: "Failed to get guilds" });
    }
  });

  // Get channels for a guild - use fetch instead of cache
  app.get("/api/bots/:botId/guilds/:guildId/channels", async (req, res) => {
    try {
      const { botId, guildId } = req.params;
      const client = discordClients.get(botId);
      
      if (!client || !client.isReady()) {
        return res.status(400).json({ error: "Bot not connected" });
      }

      // Fetch guild from API
      let guild;
      try {
        guild = await client.guilds.fetch(guildId);
      } catch (e) {
        return res.status(404).json({ error: "Guild not found or bot doesn't have access" });
      }

      // Fetch channels from API
      const fetchedChannels = await guild.channels.fetch();
      const channels = fetchedChannels
        .filter(channel => channel !== null && channel.type === ChannelType.GuildText)
        .map(channel => ({
          id: channel!.id,
          name: channel!.name,
          type: channel!.type,
          parentId: channel!.parentId,
          position: channel!.position,
        }))
        .sort((a, b) => a.position - b.position);

      res.json(channels);
    } catch (error) {
      console.error("Get channels error:", error);
      res.status(500).json({ error: "Failed to get channels" });
    }
  });

  // Get messages from a channel - use fetch
  app.get("/api/bots/:botId/channels/:channelId/messages", async (req, res) => {
    try {
      const { botId, channelId } = req.params;
      const client = discordClients.get(botId);
      
      if (!client || !client.isReady()) {
        return res.status(400).json({ error: "Bot not connected" });
      }

      // Fetch channel from API
      let channel;
      try {
        channel = await client.channels.fetch(channelId);
      } catch (e) {
        return res.status(404).json({ error: "Channel not found" });
      }

      if (!channel || !channel.isTextBased() || channel.type !== ChannelType.GuildText) {
        return res.status(400).json({ error: "Not a text channel" });
      }

      const fetchedMessages = await channel.messages.fetch({ limit: 50 });
      const messages = fetchedMessages.map(msg => ({
        id: msg.id,
        content: msg.content,
        author: {
          id: msg.author.id,
          username: msg.author.username,
          avatar: msg.author.avatar,
          bot: msg.author.bot,
        },
        timestamp: msg.createdAt.toISOString(),
        attachments: msg.attachments.map(att => ({
          id: att.id,
          url: att.url,
          filename: att.name || "file",
        })),
      }));

      // Reverse to show oldest first
      res.json(messages.reverse());
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ error: "Failed to get messages" });
    }
  });

  // Send a message to a channel
  app.post("/api/bots/:botId/channels/:channelId/messages", async (req, res) => {
    try {
      const { botId, channelId } = req.params;
      const parsed = sendMessageSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const client = discordClients.get(botId);
      if (!client || !client.isReady()) {
        return res.status(400).json({ error: "Bot not connected" });
      }

      // Fetch channel from API
      let channel;
      try {
        channel = await client.channels.fetch(channelId);
      } catch (e) {
        return res.status(404).json({ error: "Channel not found" });
      }

      if (!channel || !channel.isTextBased() || channel.type !== ChannelType.GuildText) {
        return res.status(400).json({ error: "Not a text channel" });
      }

      const sentMessage = await channel.send(parsed.data.content);
      
      res.json({
        id: sentMessage.id,
        content: sentMessage.content,
        author: {
          id: sentMessage.author.id,
          username: sentMessage.author.username,
          avatar: sentMessage.author.avatar,
          bot: sentMessage.author.bot,
        },
        timestamp: sentMessage.createdAt.toISOString(),
      });
    } catch (error: any) {
      console.error("Send message error:", error);
      if (error.code === 50013) {
        return res.status(403).json({ error: "Bot nie ma uprawnien do wysylania wiadomosci na tym kanale" });
      }
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Execute bot commands
  app.post("/api/bots/:botId/commands", async (req, res) => {
    try {
      const { botId } = req.params;
      const { command } = req.body;

      if (!command || typeof command !== "string") {
        return res.status(400).json({ error: "Invalid command" });
      }

      const client = discordClients.get(botId);
      if (!client || !client.isReady()) {
        return res.status(400).json({ error: "Bot not connected" });
      }

      const bot = await storage.getBot(botId);
      if (!bot) {
        return res.status(404).json({ error: "Bot not found" });
      }

      const parts = command.trim().split(" ");
      const cmd = parts[0].toLowerCase();

      let result = "";

      if (cmd === "/ping") {
        result = `Pong! Latency: ${client.ws.ping}ms`;
      } else if (cmd === "/status") {
        result = `Bot: ${bot.name}\nStatus: ${bot.status}\nGuilds: ${client.guilds.cache.size}\nLatency: ${client.ws.ping}ms`;
      } else if (cmd === "/uptime") {
        const uptime = client.uptime || 0;
        const hours = Math.floor(uptime / 3600000);
        const minutes = Math.floor((uptime % 3600000) / 60000);
        result = `Uptime: ${hours}h ${minutes}m`;
      } else if (cmd === "/help") {
        result = `/ping - Test bot latency\n/status - Show bot status\n/uptime - Show bot uptime\n/help - Show this message`;
      } else {
        result = `Unknown command: ${cmd}. Type /help for available commands.`;
      }

      res.json({ result });
    } catch (error: any) {
      console.error("Command error:", error);
      res.status(500).json({ error: "Failed to execute command" });
    }
  });

  return httpServer;
}
