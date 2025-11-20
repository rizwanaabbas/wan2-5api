import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { insertProjectSchema, insertVideoSchema } from "@shared/schema";
import { generateWanVideo, getWanSize } from "./wan";

// Helper to get the public base URL from environment or default
function getPublicBaseUrl(): string {
  return process.env.APP_BASE_URL || 'http://127.0.0.1:5000';
}

// Helper to build full public asset URLs from relative paths
function buildPublicAssetUrl(pathOrUrl: string): string {
  // If it's already a full URL, return as-is
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl;
  }
  
  // If it's a relative path, construct full URL
  if (pathOrUrl.startsWith('/')) {
    return `${getPublicBaseUrl()}${pathOrUrl}`;
  }
  
  return pathOrUrl;
}

// Helper function to download and store video from Wan API URL
async function downloadAndStoreVideo(videoUrl: string): Promise<string | null> {
  try {
    console.log(`Downloading video from Wan API: ${videoUrl}`);
    
    // Download the video from Wan API
    const response = await fetch(videoUrl);
    if (!response.ok) {
      console.error(`Failed to download video: ${response.statusText}`);
      return null;
    }

    // Preserve the original content type from Wan API response
    const contentType = response.headers.get('content-type') || 'video/mp4';
    const buffer = Buffer.from(await response.arrayBuffer());
    console.log(`Downloaded video: ${buffer.length} bytes, type: ${contentType}`);

    // Upload to object storage
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    
    // Upload the video file with original content type
    const uploadResponse = await fetch(uploadURL, {
      method: "PUT",
      body: buffer,
      headers: {
        "Content-Type": contentType,
      },
    });

    if (!uploadResponse.ok) {
      console.error(`Failed to upload video to storage: ${uploadResponse.statusText}`);
      return null;
    }

    // Return the normalized path - the frontend will use /objects/:path route to access it
    const normalizedPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
    console.log(`Video stored at: ${normalizedPath}`);
    
    return normalizedPath;
  } catch (error) {
    console.error("Error downloading and storing video:", error);
    return null;
  }
}

// Helper function to start video generation job
async function startVideoGenerationJob(
  videoId: string,
  model: string,
  prompt: string,
  resolution: string,
  options: {
    negativePrompt?: string;
    audioMode?: string;
    audioUrl?: string;
    imageUrl?: string;
    firstKeyframeUrl?: string;
    lastKeyframeUrl?: string;
    duration?: number;
  } = {}
) {
  try {
    await storage.updateVideo(videoId, {
      status: "processing",
      progress: 10,
    });

    const size = getWanSize(resolution);

    // Track last updated progress to avoid excessive DB writes
    let lastUpdatedProgress = 10;

    // Convert public URLs to base64 data URLs to avoid network timeout issues
    let imageDataUrl = options.imageUrl;
    let audioDataUrl = options.audioUrl;
    let firstKeyframeDataUrl = options.firstKeyframeUrl;
    let lastKeyframeDataUrl = options.lastKeyframeUrl;

    // Helper to convert URL to base64
    const convertToBase64 = async (url: string | undefined): Promise<string | undefined> => {
      if (!url) return undefined;
      
      // Check if it's one of our object storage URLs (absolute or relative path)
      if (url.includes('/objects/uploads/')) {
        try {
          // Extract the object path - handle both absolute URLs and relative paths
          let objectPath: string;
          if (url.startsWith('http://') || url.startsWith('https://')) {
            // Absolute URL: extract pathname
            const urlObj = new URL(url);
            objectPath = urlObj.pathname.replace('/objects/', '');
          } else if (url.startsWith('/objects/')) {
            // Relative path: remove /objects/ prefix
            objectPath = url.replace('/objects/', '');
          } else {
            // Shouldn't happen, but fallback
            return url;
          }

          // Use the public base URL for internal server-to-server communication
          const baseUrl = getPublicBaseUrl();
          const response = await fetch(`${baseUrl}/api/objects/base64/${objectPath}`);
          if (response.ok) {
            const { dataUrl } = await response.json();
            console.log(`Converted ${objectPath} to base64 (size: ${dataUrl.length} chars)`);
            return dataUrl;
          } else {
            console.warn(`Failed to convert ${objectPath} to base64, using original URL`);
            return url;
          }
        } catch (error) {
          console.error(`Error converting URL to base64:`, error);
          return url; // Fallback to original URL
        }
      }
      
      return url; // External URL, keep as-is
    };

    // Convert all media URLs to base64 (except audio - Wan API doesn't support base64 for audio)
    if (options.imageUrl) {
      imageDataUrl = await convertToBase64(options.imageUrl);
    }
    // Keep audio URL as public URL - Wan API doesn't support base64 audio
    // audioDataUrl is already set to options.audioUrl
    if (options.firstKeyframeUrl) {
      firstKeyframeDataUrl = await convertToBase64(options.firstKeyframeUrl);
    }
    if (options.lastKeyframeUrl) {
      lastKeyframeDataUrl = await convertToBase64(options.lastKeyframeUrl);
    }

    const result = await generateWanVideo(
      {
        model,
        prompt,
        negativePrompt: options.negativePrompt,
        size,
        duration: options.duration || 10,
        promptExtend: true,
        audioMode: (options.audioMode as any) || "auto",
        audioUrl: audioDataUrl,
        imageUrl: imageDataUrl,
        firstKeyframeUrl: firstKeyframeDataUrl,
        lastKeyframeUrl: lastKeyframeDataUrl,
      },
      async (progress: number) => {
        // Only update DB if progress increased by at least 5%
        if (progress - lastUpdatedProgress >= 5 || progress === 100) {
          await storage.updateVideo(videoId, { progress });
          lastUpdatedProgress = progress;
          console.log(`Video ${videoId} progress: ${progress}%`);
        }
      }
    );

    // Download and store video on our server to avoid 24h URL expiry
    let storedVideoUrl = result.videoUrl;
    if (result.videoUrl) {
      console.log(`Downloading and storing video ${videoId} to prevent 24h expiry...`);
      const storedPath = await downloadAndStoreVideo(result.videoUrl);
      if (storedPath) {
        // storedPath is already a relative path like /objects/uploads/...
        // We'll keep it as relative, and the frontend will construct full URLs
        storedVideoUrl = storedPath;
        console.log(`Video ${videoId} successfully stored at: ${storedPath}`);
      } else {
        console.warn(`Failed to store video ${videoId}, using original Wan URL (expires in 24h)`);
      }
    }

    await storage.updateVideo(videoId, {
      status: "completed",
      progress: 100,
      taskId: result.taskId,
      videoUrl: storedVideoUrl,
      thumbnailUrl: result.thumbnailUrl || null,
      duration: result.duration,
    });
  } catch (error: any) {
    console.error(`Video generation error for ${videoId}:`, error);
    await storage.updateVideo(videoId, {
      status: "failed",
      progress: 0,
      errorMessage: error.message || "Failed to generate video",
    });
  }
}

// Recovery function to restart stuck videos on server startup
async function recoverStuckVideos() {
  try {
    const allVideos = await storage.getAllVideos();
    const stuckVideos = allVideos.filter(v => v.status === "processing");
    
    if (stuckVideos.length > 0) {
      console.log(`Found ${stuckVideos.length} stuck video(s) in processing state. Restarting...`);
      
      for (const video of stuckVideos) {
        console.log(`Restarting video generation for: ${video.id} (${video.name})`);
        
        // Get project to access global prompt
        const project = await storage.getProject(video.projectId);
        
        // Combine global prompt with video prompt
        let finalPrompt = video.prompt;
        if (project?.globalPrompt?.trim()) {
          finalPrompt = `${project.globalPrompt.trim()}\n\n${video.prompt}`;
        }
        
        // Restart the generation job (don't await - run in background)
        startVideoGenerationJob(video.id, video.model, finalPrompt, video.resolution, {
          negativePrompt: video.negativePrompt || undefined,
          audioMode: video.audioMode || undefined,
          audioUrl: video.audioUrl || undefined,
          imageUrl: video.sourceImageUrl || undefined,
          firstKeyframeUrl: video.firstKeyframeUrl || undefined,
          lastKeyframeUrl: video.lastKeyframeUrl || undefined,
          duration: video.duration || undefined,
        }).catch(err => {
          console.error(`Failed to restart video ${video.id}:`, err);
        });
      }
    }
  } catch (error) {
    console.error("Error recovering stuck videos:", error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Recover stuck videos on startup
  recoverStuckVideos().catch(err => {
    console.error("Failed to recover stuck videos:", err);
  });

  // Project endpoints
  app.get("/api/projects", async (_req, res) => {
    try {
      const projects = await storage.getAllProjects();
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const data = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(data);
      res.status(201).json(project);
    } catch (error: any) {
      console.error("Error creating project:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid project data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create project" });
    }
  });

  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.updateProject(req.params.id, req.body);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ error: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteProject(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  // Video endpoints
  app.get("/api/videos", async (_req, res) => {
    try {
      const videos = await storage.getAllVideos();
      res.json(videos);
    } catch (error) {
      console.error("Error fetching videos:", error);
      res.status(500).json({ error: "Failed to fetch videos" });
    }
  });

  app.get("/api/videos/:projectId", async (req, res) => {
    try {
      const videos = await storage.getVideosByProject(req.params.projectId);
      res.json(videos);
    } catch (error) {
      console.error("Error fetching videos:", error);
      res.status(500).json({ error: "Failed to fetch videos" });
    }
  });

  app.post("/api/videos", async (req, res) => {
    try {
      const data = insertVideoSchema.parse(req.body);
      
      // Validate custom audio mode
      if (data.audioMode === "custom" && !data.audioUrl) {
        return res.status(400).json({ error: "Audio URL is required when audio mode is 'custom'" });
      }

      // Validate image-to-video requirements
      if (data.generationType === "image-to-video" && !data.sourceImageUrl) {
        return res.status(400).json({ error: "Source image URL is required for image-to-video generation" });
      }

      // Validate keyframe-to-video requirements
      if (data.generationType === "keyframe" && (!data.firstKeyframeUrl || !data.lastKeyframeUrl)) {
        return res.status(400).json({ error: "Both first and last keyframe URLs are required for keyframe-to-video generation" });
      }
      
      // Get project to access global prompt
      const project = await storage.getProject(data.projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Combine global prompt with video prompt
      let finalPrompt = data.prompt;
      if (project.globalPrompt?.trim()) {
        finalPrompt = `${project.globalPrompt.trim()}\n\n${data.prompt}`;
      }

      const video = await storage.createVideo(data);

      // Start video generation in background
      startVideoGenerationJob(video.id, data.model, finalPrompt, data.resolution, {
        negativePrompt: data.negativePrompt || undefined,
        audioMode: data.audioMode || undefined,
        audioUrl: data.audioUrl || undefined,
        imageUrl: data.sourceImageUrl || undefined,
        firstKeyframeUrl: data.firstKeyframeUrl || undefined,
        lastKeyframeUrl: data.lastKeyframeUrl || undefined,
        duration: 10,
      }).catch(err => {
        console.error(`Background job failed for video ${video.id}:`, err);
      });

      res.status(201).json(video);
    } catch (error: any) {
      console.error("Error creating video:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid video data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create video" });
    }
  });

  app.patch("/api/videos/:id", async (req, res) => {
    try {
      const video = await storage.updateVideo(req.params.id, req.body);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }
      res.json(video);
    } catch (error) {
      console.error("Error updating video:", error);
      res.status(500).json({ error: "Failed to update video" });
    }
  });

  app.post("/api/videos/:id/regenerate", async (req, res) => {
    try {
      const video = await storage.getVideo(req.params.id);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }

      const { prompt } = req.body;
      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "Prompt is required" });
      }

      // Get project to access global prompt
      const project = await storage.getProject(video.projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Combine global prompt with new video prompt
      let finalPrompt = prompt;
      if (project.globalPrompt?.trim()) {
        finalPrompt = `${project.globalPrompt.trim()}\n\n${prompt}`;
      }

      // Reset video status and update prompt
      await storage.updateVideo(req.params.id, {
        prompt,
        status: "pending",
        progress: 0,
        videoUrl: null,
        errorMessage: null,
      });

      // Start video regeneration in background
      startVideoGenerationJob(req.params.id, video.model, finalPrompt, video.resolution, {
        negativePrompt: video.negativePrompt || undefined,
        audioMode: video.audioMode || undefined,
        audioUrl: video.audioUrl || undefined,
        imageUrl: video.sourceImageUrl || undefined,
        duration: video.duration || undefined,
      }).catch(err => {
        console.error(`Background regeneration job failed for video ${req.params.id}:`, err);
      });

      const updatedVideo = await storage.getVideo(req.params.id);
      res.json(updatedVideo);
    } catch (error) {
      console.error("Error regenerating video:", error);
      res.status(500).json({ error: "Failed to regenerate video" });
    }
  });

  app.delete("/api/videos/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteVideo(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Video not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting video:", error);
      res.status(500).json({ error: "Failed to delete video" });
    }
  });

  // Object storage endpoints for file uploads
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      // Also return the normalized path that can be accessed publicly through this server
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
      
      // Construct the full public URL from the request
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.headers['x-forwarded-host'] || req.headers.host || req.hostname;
      const publicUrl = `${protocol}://${host}${normalizedPath}`;
      
      res.json({ uploadURL, publicUrl, objectPath: normalizedPath });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  // New endpoint to get file as base64 (for Wan API which has timeout issues with public URLs)
  app.get("/api/objects/base64/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(`/objects/${req.params.objectPath}`);
      const [metadata] = await objectFile.getMetadata();
      
      // Download file to buffer
      const chunks: Buffer[] = [];
      const stream = objectFile.createReadStream();
      
      await new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on('error', reject);
        stream.on('end', resolve);
      });
      
      const buffer = Buffer.concat(chunks);
      const base64 = buffer.toString('base64');
      const mimeType = metadata.contentType || 'application/octet-stream';
      const dataUrl = `data:${mimeType};base64,${base64}`;
      
      res.json({ dataUrl, mimeType, size: buffer.length });
    } catch (error) {
      console.error("Error getting base64:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      res.status(500).json({ error: "Failed to get base64" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
