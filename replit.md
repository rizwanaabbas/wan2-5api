# VideoForge - AI Video Generation Platform

## Overview

VideoForge is an AI video generation platform that creates actual videos using Alibaba Cloud's Wan 2.5 model via the DashScope API. The platform supports text-to-video generation workflows organized within a project-based structure with global prompt capabilities.

The application provides a modern workspace interface for managing video generation projects, tracking generation progress in real-time, and organizing generated content. Users can create multiple projects with optional global prompts that automatically prepend to all video prompts within that project, generate videos with various resolutions and configurations, and download their completed videos.

**Key Features:**
- Real AI video generation using Alibaba Cloud Wan 2.5 via DashScope API
- Project-based organization with global prompts
- Configurable video size, duration, and audio generation
- Real-time progress tracking during video generation
- PostgreSQL database for persistent storage

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- **React 18** with TypeScript for the UI layer
- **Vite** as the build tool and development server
- **Wouter** for lightweight client-side routing
- **TanStack Query (React Query)** for server state management and data fetching

**UI Component System**
- **shadcn/ui** component library (New York style variant) built on Radix UI primitives
- **Tailwind CSS** for utility-first styling with custom design tokens
- Typography uses Inter (UI) and JetBrains Mono (technical/monospace) fonts from Google Fonts
- Custom color system with HSL-based CSS variables supporting light/dark modes
- Responsive layouts with mobile-first breakpoints

**State Management Pattern**
- Server state managed through React Query with aggressive caching (`staleTime: Infinity`)
- Local component state using React hooks
- Real-time polling for video processing status (2-second intervals when videos are processing)

**Key UI Patterns**
- Sidebar navigation with collapsible/mobile responsive behavior
- Modal dialogs for project creation/editing and video playback
- Card-based layouts for project and video galleries
- Form builders with validation using react-hook-form and Zod schemas

### Backend Architecture

**Server Framework**
- **Express.js** (ESM modules) running on Node.js
- RESTful API design with JSON request/response formats
- Development mode uses Vite middleware for HMR and SSR

**API Structure**
- `/api/projects` - CRUD operations for project management
- `/api/videos` - Video generation job management and retrieval
- `/api/upload` - Image upload handling for image-to-video workflows
- Request logging middleware with duration tracking and JSON response capture

**Business Logic Layer**
- Storage abstraction interface (`IStorage`) for data operations
- Database storage implementation (`DbStorage`) using PostgreSQL via Drizzle ORM
- In-memory storage implementation (`MemStorage`) available as fallback
- Schema validation using Drizzle Zod schemas for request payloads
- Wan video generation service (`server/wan.ts`) handling DashScope API integration

**Build & Deployment**
- Production builds bundle server code with esbuild (ESM format, external packages)
- Client builds output to `dist/public` directory
- Single server process serves both API and static assets in production

### Data Storage Solutions

**Database Strategy**
- **PostgreSQL** via Neon serverless driver configured in `drizzle.config.ts`
- **Drizzle ORM** for type-safe database queries and migrations
- Schema definition in `shared/schema.ts` with automatic TypeScript type inference

**Data Models**
- `projects` table: id (uuid), name (text), globalPrompt (text, nullable), createdAt (timestamp)
- `videos` table: id (uuid), projectId (uuid FK), name (text), prompt (text), model (text), generationType (text), resolution (text), status (text), progress (integer), videoUrl (text nullable), thumbnailUrl (text nullable), sourceImageUrl (text nullable), duration (integer nullable), errorMessage (text nullable), createdAt (timestamp)
- Cascade deletion: deleting a project removes all associated videos

**Current Implementation**
- Application actively uses PostgreSQL database via `DbStorage` class
- In-memory storage (`MemStorage`) available for testing/development
- Migrations handled via `npm run db:push` command

### External Dependencies

**Cloud Storage**
- **Google Cloud Storage** via `@google-cloud/storage` client library
- Configured to use Replit sidecar authentication (external account credentials)
- Object ACL system for managing file permissions (owner, visibility, group access rules)
- Public object search paths configurable via `PUBLIC_OBJECT_SEARCH_PATHS` environment variable
- Handles video files, thumbnails, and source images for image-to-video generation

**File Upload Management**
- **Uppy** file uploader with AWS S3 plugin (`@uppy/aws-s3`, `@uppy/dashboard`, `@uppy/react`)
- Dashboard UI component for drag-and-drop uploads
- Direct-to-storage upload capability to reduce server load

**Development Tools**
- **Replit-specific plugins** for development environment integration
  - `@replit/vite-plugin-runtime-error-modal` for error overlay
  - `@replit/vite-plugin-cartographer` for code navigation
  - `@replit/vite-plugin-dev-banner` for development indicators
- Only loaded in development mode, excluded from production builds

**Third-Party UI Dependencies**
- Complete Radix UI component primitives (@radix-ui/react-*)
- Lucide React for iconography
- date-fns for timestamp formatting
- class-variance-authority (CVA) for component variant management
- cmdk for command palette functionality

**AI Video Generation**
- **Alibaba Cloud Wan 2.5** via DashScope API
- Requires `DASHSCOPE_API_KEY` environment secret for API authentication
- Text-to-video generation with model: `wan2.5-t2v-preview`
- Configurable video size (e.g., "832*480"), duration (up to 10s), and audio generation
- Prompt extension feature for enhanced video quality
- Background async processing with status polling

**Database & API**
- Neon serverless PostgreSQL client (`@neondatabase/serverless`)
- Drizzle Kit for database migrations and schema management
- Requires `DATABASE_URL` environment variable (throws error if missing)

**Design System Reference**
- Design guidelines document references Runway ML, Midjourney, Notion, and Linear for UI/UX patterns
- Hierarchical spacing system (2, 4, 6, 8, 12, 16 Tailwind units)

## Recent Changes (November 2025)

**Wan API Integration (Latest)**
- Migrated from Google Veo3 to Alibaba Cloud Wan 2.5 API via DashScope
- Created `server/wan.ts` service for Wan API integration
- Implemented async task polling for video generation completion
- Configured size parameter format (width*height) for Wan API requirements
- Added prompt extension and audio generation features

**Global Prompt Feature**
- Added `globalPrompt` field to projects schema (nullable text field)
- Updated `ProjectDialog` component with global prompt textarea
- Backend automatically prepends project global prompt to video prompts: `${globalPrompt}\n\n${prompt}`
- Allows users to set consistent style/context across all videos in a project

**Database Migration**
- Switched from in-memory storage to PostgreSQL database
- Created `DbStorage` implementation for persistent data storage
- Database actively used for all project and video operations

**Bug Fixes**
- Fixed mutation response parsing in `App.tsx` to correctly extract JSON from API responses
- Resolved navigation issues after project creation
- Fixed TypeScript type compatibility in storage implementations