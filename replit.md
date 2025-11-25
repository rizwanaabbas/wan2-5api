# VideoForge - AI Video Generation Platform

## Overview
VideoForge is an AI video generation platform leveraging Alibaba Cloud's Wan API via DashScope to create videos. It supports 13 Wan models across six generation categories (text-to-video, image-to-video, text-to-image, image-to-image, animation, keyframe-to-video), offering features like negative prompts, custom audio, and optimized resolutions. The platform provides a modern workspace for managing video generation projects, tracking real-time progress, organizing content, and creating storyboards with preview images before video generation, aiming to simplify AI-driven video creation for users.

## Recent Changes (November 25, 2025)

**Storyboard System with Image Generation & Persistence (Latest)**
1. **Text-to-Image Generation**: Uses DashScope `wan2.5-t2i-preview` API to generate preview images from text prompts
2. **Image-to-Image Generation**: Uses DashScope `wan2.5-i2i-preview` API supporting multiple source images for transformation
3. **Storyboard Builder UI**: 
   - Multi-prompt storyboard builder with preview image generation
   - T2I: Simple text prompt input
   - I2I: Upload multiple source images + transformation prompt
4. **Image Preview Display**: Generated images shown side-by-side with prompts for easy review
5. **Download Individual Images**: Each preview image can be downloaded via server proxy (bypasses CORS)
6. **Storyboard Persistence**:
   - Save complete storyboards to database with all generated images
   - Each image stored with metadata (prompt, source images, generation order)
   - Storyboards attached to projects for easy reference and reuse
   - Storyboard names and creation dates tracked
7. **View and Edit Existing Storyboards**:
   - List all saved storyboards for a project
   - Click to view and edit any storyboard
   - Load existing images with proper ordering
   - Add new prompts and generate additional images
   - Save new images to existing storyboard
   - Delete storyboards with confirmation dialog
8. **Database Tables**: 
   - `storyboards`: Stores storyboard metadata (id, projectId, name, generationType, createdAt)
   - `storyboard_images`: Stores individual images (id, storyboardId, prompt, sourceImages, generatedImageUrl, order, createdAt)

**Previous Updates (November 20, 2025)**

**UI/UX Improvements**
1. **Image Upload Fix**: ImageUploader component now syncs preview state with value prop using useEffect, ensuring image previews appear immediately on first upload without requiring retry attempts.
2. **Audio Filename Display**: Video tiles now display the original filename of custom audio files in a badge at the bottom of the thumbnail with music icon and truncated text. Added `audioFilename` field to videos schema to store original filename.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Frameworks**: React 18 with TypeScript, Vite (build tool), Wouter (routing), TanStack Query (server state).
- **UI Components**: shadcn/ui (New York style), Tailwind CSS, Inter/JetBrains Mono fonts, HSL-based CSS variables for light/dark modes, responsive mobile-first layouts.
- **State Management**: React Query for server state (aggressive caching), React hooks for local component state, real-time polling for video processing.
- **Key UI Patterns**: Sidebar navigation, modal dialogs, card-based layouts, form builders with react-hook-form and Zod, storyboard builder with image generation and preview.

### Backend
- **Framework**: Express.js (ESM) on Node.js, RESTful API design (JSON).
- **API Structure**: `/api/projects`, `/api/videos`, `/api/generate/text-to-image`, `/api/generate/image-to-image`, `/api/storyboards`.
- **Business Logic**: Storage abstraction (IStorage) with PostgreSQL via Drizzle ORM (DbStorage), in-memory fallback (MemStorage), Drizzle Zod for schema validation, Wan generation services (`server/wan.ts`) for DashScope API integration (video, T2I, I2I).
- **Build**: esbuild for production server bundling, client builds to `dist/public`, single server process for API and static assets.

### Data Storage
- **Database**: PostgreSQL via Neon serverless driver.
- **ORM**: Drizzle ORM for type-safe queries and migrations.
- **Data Models**: 
  - `projects` (id, name, globalPrompt, imageUrl, defaultModel, createdAt)
  - `videos` (id, projectId, name, prompt, model, generationType, resolution, status, progress, videoUrl, thumbnailUrl, sourceImageUrl, duration, errorMessage, createdAt, firstKeyframeUrl, lastKeyframeUrl, audioMode, audioUrl, audioFilename)
  - `storyboards` (id, projectId, name, generationType, createdAt)
  - `storyboard_images` (id, storyboardId, prompt, sourceImages, generatedImageUrl, order, createdAt)
- **Persistence**: Uses `DbStorage` with PostgreSQL, `MemStorage` for development/testing.

### UI/UX Decisions
- Modern workspace interface with comprehensive dashboard statistics.
- Intelligent model selector displaying speed, quality, and cost metadata.
- Project-based organization with global prompts, default images, and default models.
- Configurable video generation settings (size, duration, audio).
- Real-time progress tracking with visual feedback.
- Storyboard creation with preview image generation (T2I and I2I).
- Side-by-side image and prompt preview for easy review.
- Image download capabilities for individual previews.
- Persistent storyboard storage for future reference and reuse.
- Edit and regenerate videos with modified prompts.
- Persistent video storage eliminating 24-hour URL expiry issues.

### Technical Implementations
- Asynchronous task polling for video, T2I, and I2I generation completion.
- DashScope Wan API integration for video and image generation.
- Text-to-Image generation using `wan2.5-t2i-preview` model.
- Image-to-Image generation using `wan2.5-i2i-preview` model with multiple image support.
- Configurable video size (13 resolutions) with platform-specific labels.
- Support for negative prompts and various audio modes (auto, custom, silent).
- Automatic model switching based on generation requirements.
- Backend validation for all input parameters.
- Robust error handling and recovery for generation tasks.
- Base64 encoding for media uploads to Wan API (prevents timeout issues).
- Automatic video download and storage after generation (prevents 24h URL expiry).
- MIME type preservation for all stored videos/images.
- Storyboard metadata persistence with image storage and retrieval.

## External Dependencies

### Cloud Services
- **Google Cloud Storage**: For storing video files, thumbnails, source images, and storyboard preview images, using Replit sidecar authentication.

### File Upload
- **Uppy**: File uploader with AWS S3 plugin for direct-to-storage uploads.

### AI Image & Video Generation
- **Alibaba Cloud Wan API via DashScope**: Core AI generation engine.
  - Requires `DASHSCOPE_API_KEY`.
  - Supports 13 models across 6 generation types (Text-to-Video, Image-to-Video, Text-to-Image, Image-to-Image, Animation, Keyframe-to-Video).
  - Features include configurable resolution, negative prompts, audio generation, and image transformations.

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
