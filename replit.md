# VideoForge - AI Video Generation Platform

## Overview

VideoForge is a dual-model AI video generation platform that allows users to create videos using two different AI models: Ovi (character AI with audio generation) and Wan2.1 (cinematic video generation). The platform supports both text-to-video and image-to-video generation workflows, organized within a project-based structure.

The application provides a modern workspace interface for managing video generation projects, tracking generation progress in real-time, and organizing generated content. Users can create multiple projects, generate videos with various resolutions and configurations, and download their completed videos.

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
- In-memory storage implementation (`MemStorage`) as default
- Schema validation using Drizzle Zod schemas for request payloads

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
- `projects` table: id, name, createdAt
- `videos` table: id, projectId (FK), name, prompt, model, generationType, resolution, status, progress, videoUrl, thumbnailUrl, sourceImageUrl, duration, errorMessage, createdAt
- Cascade deletion: deleting a project removes all associated videos

**Current Implementation**
- Application currently uses in-memory storage (`MemStorage` class)
- Database schema and migrations are defined but not actively used
- Ready for database migration by swapping storage implementation

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

**Database & API**
- Neon serverless PostgreSQL client (`@neondatabase/serverless`)
- Drizzle Kit for database migrations and schema management
- Requires `DATABASE_URL` environment variable (throws error if missing)

**Design System Reference**
- Design guidelines document references Runway ML, Midjourney, Notion, and Linear for UI/UX patterns
- Hierarchical spacing system (2, 4, 6, 8, 12, 16 Tailwind units)
- Two-model architecture with visual distinction between Ovi and Wan2.1 models