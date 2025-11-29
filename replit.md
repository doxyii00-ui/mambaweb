# Discord Bot Manager

## Overview
A web application for managing multiple Discord bots from a single dashboard. Users can add, connect/disconnect bots, browse servers and channels, and send messages through their bots.

## Current State
The MVP is complete with full functionality:
- Multi-bot management with add/delete capabilities
- Discord connection with proper status tracking (online/offline/connecting)
- Three-panel layout showing servers, channels, and messages simultaneously
- Real-time message display with auto-refresh
- Message sending functionality

## Architecture

### Frontend
- React with TypeScript
- Tailwind CSS for styling
- Shadcn UI components
- React Query for data fetching
- Wouter for routing

### Backend
- Express.js server
- Discord.js for Discord API integration
- In-memory storage for bot data

### Key Files
- `client/src/pages/home.tsx` - Main UI component with three-panel layout
- `server/routes.ts` - API endpoints for bot management and Discord operations
- `server/storage.ts` - In-memory storage interface for bots
- `shared/schema.ts` - TypeScript types and Zod schemas

## API Endpoints
- `GET /api/bots` - List all bots (without tokens)
- `POST /api/bots` - Create a new bot
- `DELETE /api/bots/:botId` - Delete a bot
- `POST /api/bots/:botId/connect` - Connect bot to Discord
- `POST /api/bots/:botId/disconnect` - Disconnect bot from Discord
- `GET /api/bots/:botId/guilds` - Get servers for a bot
- `GET /api/bots/:botId/guilds/:guildId/channels` - Get channels for a server
- `GET /api/bots/:botId/channels/:channelId/messages` - Get messages from a channel
- `POST /api/bots/:botId/channels/:channelId/messages` - Send a message

## User Preferences
- Polish language for UI text
- Inter font family for typography
- Discord-inspired design with professional polish
