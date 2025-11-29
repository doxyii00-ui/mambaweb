# Discord Bot Manager - Design Guidelines

## Design Approach
**System-Based with Discord/Linear Inspiration**
This is a productivity dashboard requiring clarity and efficiency. We'll use a modern design system approach inspired by Discord's interface patterns and Linear's clean aesthetics—familiar to users managing Discord bots while maintaining professional polish.

## Core Design Principles
1. **Functional Clarity**: Every element serves a purpose; no decorative bloat
2. **Information Density**: Maximize useful data without overwhelming
3. **Quick Access**: Minimal clicks to common actions
4. **Status Awareness**: Always visible bot connection states

## Typography
- **Primary Font**: Inter (Google Fonts)
- **Monospace**: JetBrains Mono (for tokens/IDs)
- **Hierarchy**:
  - Page titles: text-2xl font-bold
  - Section headers: text-lg font-semibold
  - Bot names: text-base font-medium
  - Body text: text-sm
  - Labels/metadata: text-xs text-gray-500

## Layout System
**Spacing Primitives**: Use Tailwind units of 2, 4, 6, and 8 consistently
- Component padding: p-4 or p-6
- Section gaps: gap-4 or gap-6
- Margins: m-2, m-4, m-6

**Structure**: Three-panel layout
1. **Left Sidebar** (w-64): Bot list + add bot button
2. **Middle Panel** (flex-1): Server/channel navigation
3. **Right Panel** (flex-1): Message view + send interface

## Component Library

### Navigation & Structure
- **Sidebar**: Fixed left panel with scrollable bot list
- **Bot Cards**: Compact items showing name, status dot (green/red), hover highlight
- **Active State**: Subtle background highlight for selected bot
- **Add Bot Button**: Prominent at sidebar top with "+" icon

### Bot Management
- **Add Bot Modal**: Centered overlay (max-w-md)
  - Fields: Bot name (text input), Token (password input with show/hide toggle)
  - Actions: Cancel (ghost), Add Bot (primary)
- **Status Indicator**: Small colored dot (8px) - green (online), red (offline), gray (disconnected)
- **Delete Action**: Small trash icon on bot card hover, confirm modal before deletion

### Server/Channel Navigation
- **Server List**: Grid of server cards (grid-cols-2 md:grid-cols-3)
  - Server icon placeholder or first letter
  - Server name below
  - Member count badge
- **Channel List**: Vertical list with # prefix for text channels
  - Grouped by category (collapsible)
  - Active channel highlighted

### Message Interface
- **Message Feed**: Scrollable container showing recent messages
  - Author avatar (small circle), username, timestamp
  - Message content with proper text wrapping
  - Scroll to bottom button when not at latest
- **Send Message Box**: Fixed at bottom
  - Multi-line textarea (min-h-[80px])
  - Send button (right-aligned, primary)
  - Character count indicator

### Forms & Inputs
- **Text Inputs**: Rounded corners (rounded-lg), border focus states
- **Buttons**: 
  - Primary: Solid background, medium weight
  - Secondary: Outline style
  - Ghost: Transparent with hover state
  - Sizes: text-sm px-4 py-2
- **Icons**: Heroicons (via CDN), size-5 or size-4

## Accessibility
- All interactive elements must have focus states (ring-2 ring-offset-2)
- Form inputs with associated labels
- Status indicators include aria-labels
- Keyboard navigation throughout

## Interactions
- **Minimal Animations**: Smooth transitions (transition-colors duration-200) on hover/focus only
- **Loading States**: Spinner for bot connection, skeleton screens for message loading
- **Error Handling**: Toast notifications (top-right) for failures, inline validation for forms

## Key UX Patterns
- Auto-select first bot on load if available
- Remember last viewed channel per bot (session storage)
- Real-time message updates when viewing channel
- Token masking by default with reveal option
- Empty states: Clear CTAs when no bots added or no servers accessible

## Images
No images required—this is a purely functional dashboard. Use icon placeholders for server avatars and user avatars in messages.