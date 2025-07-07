# AI Voice Assistant

## Overview

An AI-powered voice assistant application that allows users to create custom voice profiles by uploading writing samples and interact with AI models that adapt to their unique writing style. The application uses vector embeddings to analyze writing patterns and provides personalized AI responses that match the user's voice and tone.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: React Context API for chat state, TanStack Query for server state
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: Express sessions with PostgreSQL store

### AI Integration
- **Primary AI Provider**: OpenAI (GPT-4o, GPT-3.5-turbo)
- **Secondary AI Provider**: Google Gemini (2.5-pro, 2.5-flash)
- **Embeddings**: OpenAI embeddings for text analysis and similarity matching
- **Vector Search**: Cosine similarity for finding relevant writing samples

## Key Components

### Voice Profile System
- **Voice Profiles**: Custom user profiles containing writing style characteristics
- **Writing Samples**: User-uploaded text samples for training the AI
- **Embeddings**: Vector representations of writing samples for similarity matching
- **Voice Style Analysis**: AI-powered analysis of writing patterns and tone

### Chat System
- **Conversations**: Persistent chat sessions with AI
- **Messages**: User and AI messages with metadata
- **Streaming**: Real-time response streaming for better user experience
- **Model Selection**: Support for multiple AI models (OpenAI, Gemini)

### UI Components
- **Chat Interface**: Real-time messaging with streaming responses
- **Voice Profile Management**: CRUD operations for voice profiles
- **Sidebar Navigation**: Voice profile selection and management
- **Comparison View**: Side-by-side comparison of standard vs voice-adapted responses

## Data Flow

1. **User Authentication**: Replit Auth handles user login and session management
2. **Voice Profile Creation**: Users create profiles and upload writing samples
3. **Text Processing**: Writing samples are chunked and converted to embeddings
4. **Chat Interaction**: User sends message, system finds relevant voice context
5. **AI Response**: AI generates response using voice profile context and embeddings
6. **Response Streaming**: AI response is streamed back to the client in real-time

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: Type-safe database queries and migrations
- **@google/genai**: Google Gemini AI integration
- **openai**: OpenAI API integration
- **@tanstack/react-query**: Server state management
- **@radix-ui/react-***: Headless UI components

### Authentication
- **openid-client**: OpenID Connect authentication
- **passport**: Authentication middleware
- **express-session**: Session management
- **connect-pg-simple**: PostgreSQL session store

### File Upload
- **multer**: File upload handling for writing samples

## Deployment Strategy

### Development
- **Environment**: NODE_ENV=development
- **Server**: tsx for TypeScript execution
- **Client**: Vite dev server with HMR
- **Database**: Drizzle push for schema changes

### Production
- **Build Process**: Vite build for client, esbuild for server
- **Server Bundle**: ESM format with external packages
- **Static Assets**: Served from dist/public directory
- **Database**: Drizzle migrations for schema management

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: OpenAI API key
- `GEMINI_API_KEY`: Google Gemini API key
- `SESSION_SECRET`: Session encryption key
- `REPLIT_DOMAINS`: Allowed domains for Replit Auth

## User Preferences

Preferred communication style: Simple, everyday language.

## Changelog

Changelog:
- July 06, 2025. Initial setup - AI Voice Assistant application created
- July 06, 2025. Fixed infinite loop bug in conversation creation
- July 06, 2025. Implemented complete voice profile system with file upload
- July 06, 2025. Added side-by-side comparison feature for voice vs standard responses
- July 06, 2025. Database schema deployed with PostgreSQL tables
- July 06, 2025. OpenAI and Gemini API integration completed
- July 06, 2025. Real-time streaming chat responses implemented
- July 06, 2025. Restructured sidebar: Voice Profiles on top, Conversations underneath
- July 06, 2025. Fixed automatic conversation creation - now only via user plus button
- July 06, 2025. Improved chat system with proper message persistence and streaming
- July 06, 2025. Simplified conversation list to minimalist ChatGPT-style interface
- July 06, 2025. Added auto-conversation creation only when NO conversations exist (not just none selected)
- July 06, 2025. Implemented conversation auto-selection and AI-generated titles
- July 06, 2025. Added delete conversation functionality with red X hover buttons
- July 06, 2025. **REBUILT CHAT WINDOW**: Fixed disappearing messages with proper chat history state
  - Implemented React state array to accumulate messages (chatHistory)
  - User messages: appear immediately in UI, then saved to database
  - AI responses: stream in memory while processing, save to database when complete, refresh state
  - System messages filtered out from UI
  - Proper message ordering with timestamps and state management
  - Copy-to-clipboard functionality with hover effects
  - Fixed root cause: missing chat history accumulation in React state
  - Fixed stale closure issue with local content tracking during streaming
  - Added scroll bar to chat window for message overflow handling
  - Fixed message persistence by disabling automatic database refresh after saves
  - Simplified merge logic to prevent race conditions between temp and database messages
  - Fixed conversation history loading by correcting API query URL construction
  - Conversation switching now properly displays full chat history for each session
- July 06, 2025. **COMPREHENSIVE VOICE PROFILE SYSTEM**: Implemented detailed 5-dimensional voice profile configuration
  - Purpose: Define intended use cases and goals
  - Tone: 15 checkbox options in 3x5 grid plus custom tone fields
  - Structure: Content organization and flow preferences
  - Formatting: 5 slider controls (0-5 scale) for bold usage, line spacing, emojis, lists vs paragraphs, markup style
  - Personality & Values: Moral tone, preferred stance (Challenger/Coach/Collaborator/Curator), ethical boundaries, humor level
  - Tabbed interface with comprehensive form validation and dynamic field management
  - Database schema expanded with all voice profile dimensions stored as structured data
- July 07, 2025. **FIXED MESSAGE PERSISTENCE**: Resolved disappearing user messages in new conversations
  - Simplified conversation switching logic to prevent clearing chat history prematurely
  - Messages now persist properly when starting new conversations
  - Fixed race condition between user message display and conversation changes
  - Chat history now always reflects the most current database state
- July 07, 2025. **IMPLEMENTED VOICE PROFILE BACKEND**: Added complete CRUD API for voice profile management
  - POST /api/voice-profiles - Create new voice profile with all 5 dimensions
  - PATCH /api/voice-profiles/:id - Update existing voice profile
  - DELETE /api/voice-profiles/:id - Delete voice profile
  - Fixed DetailedVoiceProfileModal mutation to use correct apiRequest syntax
  - Voice profile creation now saves all form data to database properly
- July 07, 2025. **VOICE PROFILE SYSTEM COMPLETE**: Fully integrated voice profile AI enhancement system
  - Fixed form validation issue preventing voice profile creation (userId field conflict)
  - Created comprehensive voice prompt generator with 3 optimized formats
  - Integrated voice profiles into chat system - AI responses now automatically adapt to user voice characteristics
  - Scott profile test successful: AI avoids emojis, uses professional tone, selective bold text
  - Voice profile prompts automatically appended to system instructions for consistent AI behavior
  - All 5 voice dimensions (Purpose, Tone, Structure, Formatting, Personality) now functional
  - Complete end-to-end flow: Profile creation → Database storage → AI prompt generation → Enhanced responses
- July 07, 2025. **ENHANCED AUTHENTICATION SYSTEM**: Comprehensive user profile management and security features
  - Extended Replit Auth with enhanced user profile fields (login tracking, security preferences, account status)
  - Added PostgreSQL tables: user_sessions, security_events with proper relationships and audit logging
  - Built comprehensive Profile page with 3 tabs: Profile (personal info + email updates), Security (password changes), Sessions (device management)
  - Implemented session tracking with IP address, device info, and session termination capabilities
  - Added security event logging for profile updates, login attempts, and password changes
  - Created API endpoints for profile updates, password changes, email verification, and session management
  - Profile page includes account statistics, email verification status, and 2FA management
  - Integrated Profile link in main navigation with logout functionality
  - Password changes handled with Replit Auth integration and user guidance for external account settings