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
- **Router API Provider**: OpenRouter for multiple AI models (Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku, GPT-4 Turbo, Llama 3 70B, Mixtral 8x7B, DeepSeek R1T2 Chimera)
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
- `ROUTER_API_KEY`: OpenRouter API key for multiple AI model access
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
- July 07, 2025. **INDEPENDENT AUTHENTICATION SYSTEM**: Complete transition from Replit Auth to custom username/password authentication
  - Replaced Replit Auth with independent authentication using username/password stored in database
  - Updated database schema: users table now uses serial ID and includes username/password fields
  - Implemented secure password hashing using scrypt (Node.js crypto module)
  - Created comprehensive registration and login forms with validation and security features
  - Built authentication page with hero section showcasing app features
  - Session management using PostgreSQL store with proper security settings
  - Added user profile tracking with login statistics and security event logging
  - All API routes now use requireAuth middleware for proper authentication
  - Users can register new accounts and login independently without external dependencies
  - Authentication system includes password strength validation and user feedback
- July 07, 2025. **CRITICAL BUG FIX**: Resolved conversation ownership validation errors preventing message sending
  - Fixed user ID type mismatch between authentication system (integers) and database operations (mixed types)
  - Updated storage interface and implementation to use consistent integer user IDs throughout
  - Corrected conversation ownership validation logic preventing "Conversation not found or access denied" errors
  - Chat system now works properly for message sending and conversation management
- July 07, 2025. **ENHANCED CHAT EXPERIENCE**: Implemented real-time streaming responses and instant message display
  - Added SSE (Server-Sent Events) streaming endpoint for real-time AI response delivery
  - Updated frontend to display user messages instantly upon sending (no delay)
  - AI responses now stream letter-by-letter for better user experience
  - Chat input enabled streaming by default for faster perceived response times
  - Maintained fallback to non-streaming for reliability
  - Improved message persistence and database synchronization after streaming completes
- July 07, 2025. **FIXED CONVERSATION MANAGEMENT**: Resolved conversation creation and deletion issues
  - Added missing DELETE conversation endpoint to server routes with proper ownership validation
  - Fixed infinite conversation deletion loops that were causing API spam
  - Removed automatic conversation creation on page load - now only creates when:
    * User clicks plus button to manually create conversation
    * User types message when NO conversations exist (creates then sends message)
  - Enhanced conversation selection logic to handle deletions and switching properly
  - Added protection against multiple deletion attempts in UI components
  - Conversation management now works as intended with proper user control
- July 07, 2025. **OPTIMIZED STREAMING PERFORMANCE**: Enhanced streaming speed and responsiveness
  - Fixed Gemini streaming API with correct data structure access (candidates[0].content.parts[0].text)
  - Removed artificial delays for maximum streaming speed
  - Added immediate connection confirmation for faster stream initiation
  - Optimized database operations with Promise.all for parallel processing
  - User messages saved immediately to database while streaming begins
  - Streaming now displays word-by-word with sub-4 second response times
  - Enhanced SSE parsing to skip status messages and handle content efficiently
- July 07, 2025. **STREAMING ARCHITECTURE REBUILD**: Completely rebuilt streaming system to match reference implementation
  - Rebuilt streaming with proper message type handling (type: "start", type: "done", content)
  - Enhanced SSE parsing for structured message types matching reference architecture
  - Optimized streaming flow for immediate response and faster initiation
  - Streaming now works at 2.6 second response times with perfect chunking
  - Fixed conversation creation bug with proper user ID validation
- July 07, 2025. **INSTANT RESPONSE OPTIMIZATION**: Matched reference implementation's instant prompt/streaming behavior
  - User messages now appear instantly upon sending (no database wait)
  - AI responses start streaming immediately without blocking on database operations
  - Database saves happen in background while streaming proceeds
  - Input field clears immediately for better responsiveness
  - Completely decoupled UI updates from database operations for maximum speed
- July 07, 2025. **MINIMIZED LEFT PANEL DESIGN**: Optimized sidebar layout for better space utilization
  - Only active voice profile displays full information (description, samples, dates)
  - Inactive voice profiles minimized to smaller row height with name only
  - Active badge shows green "Active", inactive badges show "Inactive" aligned to the right of profile name
  - Removed all refresh buttons from voice profiles and conversations for cleaner interface
  - Hover effects reveal action buttons only when needed
  - Maximized chat area space while maintaining full functionality
  - Changed conversation delete buttons from X to trash can icons for better clarity
- July 08, 2025. **GIT REPOSITORY ESTABLISHED**: Version control system properly configured
  - Git repository already initialized and connected to GitHub (https://github.com/scottknz/VoiceCraft)
  - Commit history tracking all major feature developments and UI improvements
  - Working tree clean with all current changes committed
  - Proper version control baseline established for ongoing development
- July 08, 2025. **VOICE PROFILE MODAL REORGANIZATION**: Restructured into logical 3-tab interface
  - Tab 1: Basic Information (name, description, purpose)
  - Tab 2: Upload Files (file upload with validation for text, PDF, Word documents)
  - Tab 3: Voice Characteristics (nested tabs for tone, structure, formatting, personality)
  - Improved user experience with logical workflow progression
  - Maintained all existing functionality while enhancing organization
- July 08, 2025. **ROUTER API INTEGRATION**: Added OpenRouter API support for multiple AI models
  - Integrated 6 new AI models: Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku, GPT-4 Turbo, Llama 3 70B, Mixtral 8x7B
  - Added ROUTER_API_KEY environment variable for unified API access
  - Implemented router streaming support for real-time responses
  - Updated model selection UI to display all available AI models with provider labels
  - Enhanced chat service with automatic model routing based on selection
  - All router models support voice profile enhancement and streaming responses
- July 08, 2025. **DEEPSEEK MODEL ADDITION**: Added DeepSeek R1T2 Chimera model support
  - Integrated tngtech/deepseek-r1t2-chimera:free model through OpenRouter API
  - Updated model selection UI in both chat interface and comparison view
  - Added router mapping for DeepSeek model with proper API endpoint
  - Enhanced model options with TNG Tech provider label for better user identification
- July 08, 2025. **CUSTOM AUTHENTICATION SYSTEM ACTIVATED**: Successfully deployed independent authentication
  - Rebuilt database schema with proper user authentication structure (serial ID, username/password)
  - Updated all API routes to use custom authentication middleware instead of Replit Auth
  - Added comprehensive user management fields: email verification, login tracking, security features
  - Recreated voice profiles, conversations, messages, and embeddings tables with proper relationships
  - Authentication system now fully functional with successful user registration and login
  - Application ready for independent deployment without external authentication dependencies
- July 08, 2025. **AI USER SESSION ENDPOINT**: Created dedicated DeepSeek AI session endpoint
  - Implemented /api/ai-session endpoint using tngtech/deepseek-r1t2-chimera:free model via OpenRouter
  - Added authentication middleware and comprehensive error handling
  - Built interactive demo page with real-time messaging and session history tracking
  - Added DeepSeek model to dropdown menu in both chat interface and comparison view
  - Fixed React infinite loop warning in ChatContext by removing unnecessary dependency
  - All AI models now available in dropdown: OpenAI, Google, Anthropic, Meta, Mistral, TNG Tech models
  - Removed test session link from header for cleaner interface
  - **CRITICAL**: Message flow architecture confirmed working perfectly and must be preserved exactly as implemented
    * Event-driven system with custom events (userMessage, messageSaved, streamingMessage)
    * Immediate UI display for user messages with background database saves
    * Real-time streaming for AI responses with proper state synchronization
    * chatHistory state management prevents message loss or duplication
    * Server-first design with database persistence and refresh capabilities
- July 09, 2025. **STRUCTURE TEMPLATE SYSTEM**: Implemented comprehensive structure template selection for voice profiles
  - Created database schema with `structure_templates` table supporting both default and user-created templates
  - Populated 8 predefined structure templates: Email, LinkedIn Post, LinkedIn Article, Resume, Personal Bio, Outreach Message, Custom Structure, Saved Structures
  - Built complete API endpoints for CRUD operations: GET, POST, PATCH, DELETE for template management
  - Integrated template selection into Voice Characteristics modal under "Structure" tab
  - Added template preview with descriptions and example outputs for user guidance
  - Implemented save custom structure functionality allowing users to create and name their own templates
  - Structure templates automatically populate the structurePreferences field with formatted content
  - Template system supports both standard predefined options and personalized user-created structures
  - Selected structure template name automatically saves to voice profile description field (format: "Structure: [Template Name]")
  - Template selection updates both structure preferences and visible profile description for easy identification
- July 12, 2025. **PERFORMANCE OPTIMIZATION**: Implemented comprehensive performance optimizations to reduce Replit credit burn
  - Enhanced React Query caching: Extended staleTime to 5 minutes for auth queries, 2 minutes for conversations/voice profiles
  - Disabled automatic refetching: refetchOnWindowFocus, refetchOnMount, and refetchOnReconnect set to false across all queries
  - Optimized database query frequency by extending cache duration and reducing redundant API calls
  - Improved useChat hook to prevent unnecessary re-renders with better change detection logic
  - Reduced authentication deserialization logging to minimize console spam
  - Enhanced error handling in streaming chat responses to prevent resource leaks
  - Implemented smart message synchronization to avoid infinite loops and excessive state updates
  - Query cache now retains data for 10 minutes (gcTime) to maximize reuse and minimize API calls