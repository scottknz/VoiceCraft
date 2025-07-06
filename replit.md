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
- July 06, 2025. **REBUILT CHAT WINDOW**: Changed to server-first display (Option 2)
  - User messages: save to database first, then display from database
  - AI responses: stream in memory while processing, save to database when complete, then display database version
  - System messages filtered out from UI
  - Database-first consistency ensures no message loss
  - Proper message ordering with timestamps
  - Copy-to-clipboard functionality with hover effects