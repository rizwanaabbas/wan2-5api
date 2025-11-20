# VideoForge - AI Video Generation Platform

## Overview
VideoForge is an AI video generation platform leveraging Alibaba Cloud's Wan API via DashScope to create videos. It supports 13 Wan models across six generation categories (text-to-video, image-to-video, text-to-image, image-to-image, animation, keyframe-to-video), offering features like negative prompts, custom audio, and optimized resolutions. The platform provides a modern workspace for managing video generation projects, tracking real-time progress, and organizing content, aiming to simplify AI-driven video creation for users.

## Recent Changes (November 20, 2025)

**UI/UX Improvements (Latest)**
1. **Image Upload Fix**: ImageUploader component now syncs preview state with value prop using useEffect, ensuring image previews appear immediately on first upload without requiring retry attempts.

2. **Audio Filename Display**: Video tiles now display the original filename of custom audio files in a badge at the bottom of the thumbnail with music icon and truncated text. Added `audioFilename` field to videos schema to store original filename.

**Previous Updates (November 18, 2025)**

**New Features: Project Management & Video Storage**
1. **Dashboard Statistics**: Welcome page now displays total project and video stats across all projects (total projects, total videos, completed videos, success rate, total duration).

2. **Project Image Upload**: Projects can now have a default image that's used automatically for image-based models when no image is provided during video generation.

3. **Default Model Selection**: Projects can specify a default model that's pre-selected on the video generation page, streamlining the workflow.

4. **Automatic Video Storage**: Videos are now automatically downloaded from Wan API and stored in object storage after generation completes, preventing issues with 24-hour URL expiry.
   - Preserves original MIME type from Wan API (supports video/mp4, image/gif, etc.)
   - Stored videos accessed via `/objects/:path` route
   - Frontend automatically constructs full URLs for relative paths
   - Works seamlessly in both playback and download

**Base64 Media Encoding for Wan API (November 14)**
- **Problem**: Wan API had timeout issues accessing uploaded files from Replit server.
- **Solution**: Convert uploaded media files to Base64 data URLs before sending to Wan API, eliminating network latency and authorization issues.
- **Implementation**: 
  - New `/api/objects/base64/:objectPath` endpoint converts stored files to Base64
  - Video generation automatically converts image/audio URLs to Base64 before API submission
  - Fallback to public URLs if Base64 conversion fails
- **Benefits**: Eliminates timeout errors, works for all file types (images, audio, keyframes)

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
- **Data Models**: 
  - `projects` (id, name, globalPrompt, imageUrl, defaultModel, createdAt)
  - `videos` (id, projectId, name, prompt, model, generationType, resolution, status, progress, videoUrl, thumbnailUrl, sourceImageUrl, duration, errorMessage, createdAt, firstKeyframeUrl, lastKeyframeUrl)
- **Persistence**: Currently uses `DbStorage` with PostgreSQL, `MemStorage` for development/testing.

### UI/UX Decisions
- Modern workspace interface with comprehensive dashboard statistics.
- Intelligent model selector displaying speed, quality, and cost metadata.
- Project-based organization with global prompts, default images, and default models.
- Configurable video generation settings (size, duration, audio).
- Real-time progress tracking with visual feedback.
- Edit and regenerate videos with modified prompts.
- Persistent video storage eliminating 24-hour URL expiry issues.

### Technical Implementations
- Asynchronous task polling for video generation completion.
- Configurable video size (13 resolutions) with platform-specific labels.
- Support for negative prompts and various audio modes (auto, custom, silent).
- Automatic model switching based on generation requirements.
- Backend validation for all input parameters.
- Robust error handling and recovery for video generation tasks.
- Base64 encoding for media uploads to Wan API (prevents timeout issues).
- Automatic video download and storage after generation (prevents 24h URL expiry).
- MIME type preservation for all stored videos/images.

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