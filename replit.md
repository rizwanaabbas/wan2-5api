# VideoForge - AI Video Generation Platform

## Overview
VideoForge is an AI video generation platform leveraging Alibaba Cloud's Wan API via DashScope to create videos. It supports 13 Wan models across six generation categories (text-to-video, image-to-video, text-to-image, image-to-image, animation, keyframe-to-video), offering features like negative prompts, custom audio, and optimized resolutions. The platform provides a modern workspace for managing video generation projects, tracking real-time progress, and organizing content, aiming to simplify AI-driven video creation for users.

## Recent Changes (November 14, 2025)

**Object Storage Fix for Wan API Access (Latest)**
- **Problem**: Wan API could not access uploaded media files, returning authorization error: "Don't have authorization to access the media resource during the data inspection process."
- **Root Cause**: Files were uploaded to Google Cloud Storage with restricted access. We were sending direct GCS URLs to Wan API, but those URLs required public access at the storage level.
- **Solution**: 
  - Server now constructs full public URLs for uploaded files using request headers (protocol, host)
  - `/api/objects/upload` endpoint returns both `uploadURL` (for uploading to GCS) and `publicUrl` (for accessing through our server)
  - Frontend uses `publicUrl` directly, sending it to Wan API
  - Wan API now accesses files through our server's `/objects/:objectPath` route which serves files publicly
  - Example flow: Upload to GCS → Get public URL `https://myapp.replit.dev/objects/uploads/uuid` → Send to Wan API
- **Benefits**:
  - No browser-specific code (`window.location`) - works in SSR/testing
  - Server controls URL construction with proper proxy header handling
  - Works in both dev and production environments

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Frameworks**: React 18 with TypeScript, Vite (build tool), Wouter (routing), TanStack Query (server state).
- **UI Components**: shadcn/ui (New York style), Tailwind CSS, Inter/JetBrains Mono fonts, HSL-based CSS variables for light/dark modes, responsive mobile-first layouts.
- **State Management**: React Query for server state (aggressive caching), React hooks for local component state, real-time polling for video processing.
- **Key UI Patterns**: Sidebar navigation, modal dialogs, card-based layouts, form builders with react-hook-form and Zod.

### Backend
- **Framework**: Express.js (ESM) on Node.js, RESTful API design (JSON).
- **API Structure**: `/api/projects`, `/api/videos`, `/api/upload`.
- **Business Logic**: Storage abstraction (IStorage) with PostgreSQL via Drizzle ORM (DbStorage), in-memory fallback (MemStorage), Drizzle Zod for schema validation, Wan video generation service (`server/wan.ts`) for DashScope API integration.
- **Build**: esbuild for production server bundling, client builds to `dist/public`, single server process for API and static assets.

### Data Storage
- **Database**: PostgreSQL via Neon serverless driver.
- **ORM**: Drizzle ORM for type-safe queries and migrations.
- **Data Models**: `projects` (id, name, globalPrompt, createdAt), `videos` (id, projectId, name, prompt, model, generationType, resolution, status, progress, videoUrl, thumbnailUrl, sourceImageUrl, duration, errorMessage, createdAt, firstKeyframeUrl, lastKeyframeUrl).
- **Persistence**: Currently uses `DbStorage` with PostgreSQL, `MemStorage` for development/testing.

### UI/UX Decisions
- Modern workspace interface.
- Intelligent model selector displaying speed, quality, and cost metadata.
- Project-based organization with global prompts.
- Configurable video generation settings (size, duration, audio).
- Real-time progress tracking.
- Edit and regenerate videos with modified prompts.

### Technical Implementations
- Asynchronous task polling for video generation completion.
- Configurable video size (13 resolutions) with platform-specific labels.
- Support for negative prompts and various audio modes (auto, custom, silent).
- Automatic model switching based on generation requirements.
- Backend validation for all input parameters.
- Robust error handling and recovery for video generation tasks.

## External Dependencies

### Cloud Services
- **Google Cloud Storage**: For storing video files, thumbnails, and source images, using Replit sidecar authentication.

### File Upload
- **Uppy**: File uploader with AWS S3 plugin for direct-to-storage uploads.

### AI Video Generation
- **Alibaba Cloud Wan API via DashScope**: Core AI video generation engine.
  - Requires `DASHSCOPE_API_KEY`.
  - Supports 13 models across 6 generation types (Text-to-Video, Image-to-Video, Text-to-Image, Image-to-Image, Animation, Keyframe-to-Video).
  - Features include configurable resolution, negative prompts, and audio generation.

### Database
- **Neon serverless PostgreSQL**: Database service.
- **Drizzle Kit**: For database migrations and schema management.
  - Requires `DATABASE_URL`.

### Frontend Libraries
- **Radix UI**: Component primitives.
- **Lucide React**: Iconography.
- **date-fns**: Date formatting.
- **class-variance-authority (CVA)**: Component variant management.
- **cmdk**: Command palette functionality.

### Development Tools (Replit-specific)
- `@replit/vite-plugin-runtime-error-modal`
- `@replit/vite-plugin-cartographer`
- `@replit/vite-plugin-dev-banner`