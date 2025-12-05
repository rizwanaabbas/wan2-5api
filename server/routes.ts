import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { DiskStorageService, ObjectNotFoundError, PathTraversalError, getPublicBaseUrl, buildPublicAssetUrl } from "./diskStorage";
import { insertProjectSchema, insertVideoSchema, insertStoryboardSchema, insertStoryboardImageSchema, insertSavedFileSchema } from "@shared/schema";
import { generateWanVideo, getWanSize, generateTextToImage, generateImageToImage, startTextToImageTask, startImageToImageTask, checkImageTaskStatus } from "./wan";
import { scryptSync, randomBytes } from "crypto";
import multer from "multer";
import * as fs from "fs";
import * as path from "path";

// Configure multer for file uploads
const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
});

// In-memory task store for image generation progress tracking
interface ImageTask {
  id: string;
  type: "t2i" | "i2i";
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  imageUrl?: string;
  error?: string;
  dashscopeTaskId?: string;
  createdAt: Date;
}

const imageTasks = new Map<string, ImageTask>();

// Cleanup old tasks periodically (keep for 1 hour)
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  Array.from(imageTasks.entries()).forEach(([id, task]) => {
    if (task.createdAt.getTime() < oneHourAgo) {
      imageTasks.delete(id);
    }
  });
}, 5 * 60 * 1000); // Run every 5 minutes


// Password hashing helpers
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, hashedPassword: string): boolean {
  const [salt, hash] = hashedPassword.split(':');
  const newHash = scryptSync(password, salt, 64).toString('hex');
  return newHash === hash;
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

    // Save to disk storage
    const diskStorage = new DiskStorageService();
    const uploadId = diskStorage.generateUploadId();
    const storedPath = await diskStorage.saveFile(uploadId, buffer, contentType);
    
    console.log(`Video stored at: ${storedPath}`);
    return storedPath;
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
    promptExtend?: boolean;
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
        duration: options.duration || 5,
        promptExtend: options.promptExtend !== false, // Default to true if not explicitly set to false
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
          promptExtend: video.promptExtend !== false,
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
        duration: data.duration || 5,
        promptExtend: data.promptExtend !== false,
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
        promptExtend: video.promptExtend !== false,
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

  // Object storage endpoints for file uploads (disk-based)
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const diskStorage = new DiskStorageService();
    try {
      await diskStorage.downloadObject(req.path, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      if (error instanceof PathTraversalError) {
        return res.status(400).json({ error: "Invalid path" });
      }
      return res.sendStatus(500);
    }
  });

  // Direct file upload endpoint (replaces signed URL flow)
  app.post("/api/objects/upload", upload.single("file"), async (req, res) => {
    try {
      const diskStorage = new DiskStorageService();
      
      if (!req.file) {
        // If no file in request, return upload info for client-side PUT
        const uploadId = diskStorage.generateUploadId();
        const objectPath = diskStorage.getPublicPath(uploadId);
        
        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
        const host = req.headers['x-forwarded-host'] || req.headers.host || req.hostname;
        const uploadURL = `${protocol}://${host}/api/objects/put/${uploadId}`;
        const publicUrl = `${protocol}://${host}${objectPath}`;
        
        return res.json({ uploadURL, publicUrl, objectPath });
      }
      
      // File was uploaded directly
      const uploadId = diskStorage.generateUploadId();
      const objectPath = await diskStorage.saveFile(uploadId, req.file.buffer, req.file.mimetype);
      
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
      const host = req.headers['x-forwarded-host'] || req.headers.host || req.hostname;
      const publicUrl = `${protocol}://${host}${objectPath}`;
      
      res.json({ publicUrl, objectPath });
    } catch (error) {
      console.error("Error handling upload:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // PUT endpoint for direct file uploads (mimics signed URL behavior)
  app.put("/api/objects/put/:uploadPath(*)", async (req, res) => {
    try {
      const diskStorage = new DiskStorageService();
      const uploadPath = req.params.uploadPath;
      const contentType = req.headers["content-type"] || "application/octet-stream";
      
      const chunks: Buffer[] = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", async () => {
        const buffer = Buffer.concat(chunks);
        await diskStorage.saveFile(uploadPath, buffer, contentType);
        res.status(200).send("OK");
      });
    } catch (error) {
      console.error("Error saving file:", error);
      res.status(500).json({ error: "Failed to save file" });
    }
  });

  // Download endpoint with proper Content-Disposition header for file downloads
  app.get("/api/objects/download", async (req, res) => {
    const diskStorage = new DiskStorageService();
    try {
      const imageUrl = req.query.url as string;
      const filename = (req.query.filename as string) || 'image.png';
      
      if (!imageUrl) {
        return res.status(400).json({ error: "URL parameter required" });
      }
      
      // Parse the URL to extract the object path
      let objectPath: string;
      
      try {
        const url = new URL(imageUrl);
        objectPath = url.pathname;
      } catch {
        objectPath = imageUrl;
      }
      
      // Validate the path is within our uploads namespace
      if (!objectPath.startsWith('/objects/')) {
        return res.status(400).json({ error: "Invalid object path" });
      }
      
      const metadata = diskStorage.getMetadata(objectPath);
      if (!metadata) {
        return res.status(404).json({ error: "File not found" });
      }
      
      // Set download headers
      res.setHeader('Content-Type', metadata.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      // Stream the file to the response
      await diskStorage.downloadObject(objectPath, res);
    } catch (error) {
      console.error("Error downloading object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "File not found" });
      }
      if (error instanceof PathTraversalError) {
        return res.status(400).json({ error: "Invalid path" });
      }
      res.status(500).json({ error: "Failed to download file" });
    }
  });

  // Endpoint to get file as base64 (for Wan API which has timeout issues with public URLs)
  app.get("/api/objects/base64/:objectPath(*)", async (req, res) => {
    const diskStorage = new DiskStorageService();
    try {
      const objectPath = `/objects/${req.params.objectPath}`;
      
      if (!diskStorage.exists(objectPath)) {
        return res.sendStatus(404);
      }
      
      const buffer = diskStorage.readFile(objectPath);
      const metadata = diskStorage.getMetadata(objectPath);
      const mimeType = metadata?.contentType || 'application/octet-stream';
      
      const base64 = buffer.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64}`;
      
      res.json({ dataUrl, mimeType, size: buffer.length });
    } catch (error) {
      console.error("Error getting base64:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      if (error instanceof PathTraversalError) {
        return res.status(400).json({ error: "Invalid path" });
      }
      res.status(500).json({ error: "Failed to get base64" });
    }
  });

  // Auth routes
  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      if (!verifyPassword(password, user.password)) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Set session
      req.session.userId = user.id;
      req.session.save((err) => {
        if (err) {
          return res.status(500).json({ error: "Failed to create session" });
        }
        res.json({ success: true, user: { id: user.id, email: user.email } });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/session", (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ authenticated: false });
    }
    res.json({ authenticated: true, userId: req.session.userId });
  });

  // Seed default users endpoint (for initial setup)
  app.post("/api/seed-users", async (req, res) => {
    try {
      const defaultUsers = [
        { email: "rizwanaabbas@gmail.com", password: "Wan786##" },
        { email: "rabanasaeed@gmail.com", password: "education@22" },
      ];

      for (const userEmail of defaultUsers) {
        const existing = await storage.getUserByEmail(userEmail.email);
        if (!existing) {
          const hashedPassword = hashPassword(userEmail.password);
          await storage.createUser({
            email: userEmail.email,
            password: hashedPassword,
          });
          console.log(`Created user: ${userEmail.email}`);
        }
      }

      res.json({ success: true, message: "Default users seeded" });
    } catch (error) {
      console.error("Seed error:", error);
      res.status(500).json({ error: "Failed to seed users" });
    }
  });

  // Text-to-Image generation endpoint
  app.post("/api/generate/text-to-image", async (req, res) => {
    try {
      const { prompt, size = "1024*1024" } = req.body;

      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "Prompt is required" });
      }

      // Convert size format if needed
      const formattedSize = size.includes("x") ? size.replace("x", "*") : size;

      const imageUrl = await generateTextToImage(prompt, formattedSize);
      res.json({ success: true, imageUrl });
    } catch (error) {
      console.error("T2I generation error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Image generation failed" });
    }
  });

  // Image-to-Image generation endpoint
  app.post("/api/generate/image-to-image", async (req, res) => {
    try {
      const { prompt, imageUrls, size = "1024*1024" } = req.body;

      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "Prompt is required" });
      }

      if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
        return res.status(400).json({ error: "At least one image URL is required" });
      }

      // Convert size format if needed
      const formattedSize = size.includes("x") ? size.replace("x", "*") : size;

      const imageUrl = await generateImageToImage(prompt, imageUrls, formattedSize);
      res.json({ success: true, imageUrl });
    } catch (error) {
      console.error("I2I generation error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Image generation failed" });
    }
  });

  // Task-based image generation endpoints (for progress tracking)
  app.post("/api/generate/text-to-image/start", async (req, res) => {
    try {
      const { prompt, size = "1024*1024" } = req.body;

      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const formattedSize = size.includes("x") ? size.replace("x", "*") : size;
      const dashscopeTaskId = await startTextToImageTask(prompt, formattedSize);
      
      // Create local task entry for tracking
      const taskId = `t2i_${Date.now()}_${dashscopeTaskId}`;
      imageTasks.set(taskId, {
        id: taskId,
        type: "t2i",
        status: "processing",
        progress: 10,
        createdAt: new Date(),
      });

      // Store the DashScope task ID mapping
      imageTasks.get(taskId)!.dashscopeTaskId = dashscopeTaskId;

      res.json({ success: true, taskId, dashscopeTaskId });
    } catch (error) {
      console.error("T2I start error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to start image generation" });
    }
  });

  app.post("/api/generate/image-to-image/start", async (req, res) => {
    try {
      const { prompt, imageUrls, size = "1024*1024" } = req.body;

      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "Prompt is required" });
      }

      if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
        return res.status(400).json({ error: "At least one image URL is required" });
      }

      const formattedSize = size.includes("x") ? size.replace("x", "*") : size;
      const dashscopeTaskId = await startImageToImageTask(prompt, imageUrls, formattedSize);
      
      // Create local task entry for tracking
      const taskId = `i2i_${Date.now()}_${dashscopeTaskId}`;
      imageTasks.set(taskId, {
        id: taskId,
        type: "i2i",
        status: "processing",
        progress: 10,
        createdAt: new Date(),
      });

      // Store the DashScope task ID mapping
      imageTasks.get(taskId)!.dashscopeTaskId = dashscopeTaskId;

      res.json({ success: true, taskId, dashscopeTaskId });
    } catch (error) {
      console.error("I2I start error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to start image generation" });
    }
  });

  app.get("/api/generate/task/:taskId", async (req, res) => {
    try {
      const { taskId } = req.params;
      const task = imageTasks.get(taskId);

      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      // If already completed or failed, return cached result
      if (task.status === "completed" || task.status === "failed") {
        return res.json({
          status: task.status,
          progress: task.progress,
          imageUrl: task.imageUrl,
          error: task.error,
        });
      }

      // Check DashScope task status
      const dashscopeTaskId = (task as any).dashscopeTaskId;
      if (!dashscopeTaskId) {
        return res.status(500).json({ error: "Missing DashScope task ID" });
      }

      const result = await checkImageTaskStatus(dashscopeTaskId);
      
      // Update local task cache
      task.status = result.status;
      task.progress = result.progress;
      if (result.imageUrl) task.imageUrl = result.imageUrl;
      if (result.error) task.error = result.error;

      res.json({
        status: task.status,
        progress: task.progress,
        imageUrl: task.imageUrl,
        error: task.error,
      });
    } catch (error) {
      console.error("Task status check error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to check task status" });
    }
  });

  // Save to Disk endpoints
  // Download and save file to local downloads directory
  app.post("/api/saved-files", async (req, res) => {
    try {
      const { originalUrl, fileType, projectId, videoId, storyboardImageId, filename } = req.body;
      
      if (!originalUrl || !fileType) {
        return res.status(400).json({ error: "originalUrl and fileType are required" });
      }

      // Check if already saved
      const existing = await storage.getSavedFileByOriginalUrl(originalUrl);
      if (existing) {
        return res.json({ success: true, savedFile: existing, alreadyExists: true });
      }

      const diskStorage = new DiskStorageService();
      let buffer: Buffer;
      let mimeType: string = "application/octet-stream";

      // Determine if it's a local object URL or external URL
      if (originalUrl.includes('/objects/uploads/') || originalUrl.startsWith('/objects/')) {
        // Local file - read from disk storage
        let objectPath: string;
        if (originalUrl.startsWith('http://') || originalUrl.startsWith('https://')) {
          const urlObj = new URL(originalUrl);
          objectPath = urlObj.pathname;
        } else {
          objectPath = originalUrl;
        }
        
        buffer = diskStorage.readFile(objectPath);
        const metadata = diskStorage.getMetadata(objectPath);
        mimeType = metadata?.contentType || mimeType;
      } else {
        // External URL - download
        const response = await fetch(originalUrl);
        if (!response.ok) {
          return res.status(400).json({ error: "Failed to download file from URL" });
        }
        buffer = Buffer.from(await response.arrayBuffer());
        mimeType = response.headers.get('content-type') || mimeType;
      }

      // Save to downloads directory
      const downloadsDir = path.join(process.env.UPLOAD_DIR || "./uploads", "downloads");
      if (!fs.existsSync(downloadsDir)) {
        fs.mkdirSync(downloadsDir, { recursive: true });
      }

      // Generate unique filename
      const ext = mimeType.includes('video') ? '.mp4' : mimeType.includes('image/png') ? '.png' : mimeType.includes('image/jpeg') ? '.jpg' : mimeType.includes('image/gif') ? '.gif' : mimeType.includes('image/webp') ? '.webp' : '.bin';
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const finalFilename = filename ? `${filename.replace(/\.[^.]+$/, '')}_${randomSuffix}${ext}` : `${fileType}_${timestamp}_${randomSuffix}${ext}`;
      const localPath = path.join(downloadsDir, finalFilename);

      // Write file
      fs.writeFileSync(localPath, buffer);

      // Create database record
      const savedFile = await storage.createSavedFile({
        originalUrl,
        localPath,
        filename: finalFilename,
        fileType: fileType as "image" | "video",
        fileSize: buffer.length,
        mimeType,
        projectId: projectId || null,
        videoId: videoId || null,
        storyboardImageId: storyboardImageId || null,
      });

      res.json({ success: true, savedFile });
    } catch (error) {
      console.error("Save file error:", error);
      res.status(500).json({ error: "Failed to save file to disk" });
    }
  });

  // Get saved files for a project
  app.get("/api/projects/:projectId/saved-files", async (req, res) => {
    try {
      const savedFiles = await storage.getSavedFilesByProject(req.params.projectId);
      res.json(savedFiles);
    } catch (error) {
      console.error("Get saved files error:", error);
      res.status(500).json({ error: "Failed to fetch saved files" });
    }
  });

  // Check if a file is already saved (by original URL)
  app.get("/api/saved-files/check", async (req, res) => {
    try {
      const { originalUrl } = req.query;
      if (!originalUrl || typeof originalUrl !== "string") {
        return res.status(400).json({ error: "originalUrl query parameter is required" });
      }

      const savedFile = await storage.getSavedFileByOriginalUrl(originalUrl);
      res.json({ exists: !!savedFile, savedFile: savedFile || null });
    } catch (error) {
      console.error("Check saved file error:", error);
      res.status(500).json({ error: "Failed to check saved file" });
    }
  });

  // Get saved file by video ID
  app.get("/api/saved-files/video/:videoId", async (req, res) => {
    try {
      const savedFile = await storage.getSavedFileByVideoId(req.params.videoId);
      res.json({ exists: !!savedFile, savedFile: savedFile || null });
    } catch (error) {
      console.error("Get saved file by video error:", error);
      res.status(500).json({ error: "Failed to check saved file" });
    }
  });

  // Get saved file by storyboard image ID
  app.get("/api/saved-files/storyboard-image/:storyboardImageId", async (req, res) => {
    try {
      const savedFile = await storage.getSavedFileByStoryboardImageId(req.params.storyboardImageId);
      res.json({ exists: !!savedFile, savedFile: savedFile || null });
    } catch (error) {
      console.error("Get saved file by storyboard image error:", error);
      res.status(500).json({ error: "Failed to check saved file" });
    }
  });

  // Delete saved file
  app.delete("/api/saved-files/:id", async (req, res) => {
    try {
      const savedFile = await storage.getSavedFile(req.params.id);
      if (!savedFile) {
        return res.status(404).json({ error: "Saved file not found" });
      }

      // Delete the actual file from disk
      if (fs.existsSync(savedFile.localPath)) {
        fs.unlinkSync(savedFile.localPath);
      }

      // Delete database record
      const deleted = await storage.deleteSavedFile(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Failed to delete saved file record" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Delete saved file error:", error);
      res.status(500).json({ error: "Failed to delete saved file" });
    }
  });

  // Serve saved files from downloads directory
  app.get("/api/saved-files/download/:id", async (req, res) => {
    try {
      const savedFile = await storage.getSavedFile(req.params.id);
      if (!savedFile) {
        return res.status(404).json({ error: "Saved file not found" });
      }

      if (!fs.existsSync(savedFile.localPath)) {
        return res.status(404).json({ error: "File not found on disk" });
      }

      res.setHeader('Content-Type', savedFile.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${path.basename(savedFile.localPath)}"`);
      
      const stream = fs.createReadStream(savedFile.localPath);
      stream.pipe(res);
    } catch (error) {
      console.error("Download saved file error:", error);
      res.status(500).json({ error: "Failed to download saved file" });
    }
  });

  // Storyboard endpoints
  app.post("/api/storyboards", async (req, res) => {
    try {
      const { projectId, name, generationType } = req.body;
      
      if (!projectId || !name || !generationType) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const storyboard = await storage.createStoryboard({
        projectId,
        name,
        generationType,
      });

      res.json({ success: true, storyboard });
    } catch (error) {
      console.error("Create storyboard error:", error);
      res.status(500).json({ error: "Failed to create storyboard" });
    }
  });

  app.get("/api/storyboards/:id", async (req, res) => {
    try {
      const storyboard = await storage.getStoryboard(req.params.id);
      if (!storyboard) {
        return res.status(404).json({ error: "Storyboard not found" });
      }
      res.json(storyboard);
    } catch (error) {
      console.error("Get storyboard error:", error);
      res.status(500).json({ error: "Failed to fetch storyboard" });
    }
  });

  app.get("/api/projects/:projectId/storyboards", async (req, res) => {
    try {
      const storyboards = await storage.getStoryboardsByProject(req.params.projectId);
      res.json(storyboards);
    } catch (error) {
      console.error("Get project storyboards error:", error);
      res.status(500).json({ error: "Failed to fetch storyboards" });
    }
  });

  app.delete("/api/storyboards/:id", async (req, res) => {
    try {
      const success = await storage.deleteStoryboard(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Storyboard not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Delete storyboard error:", error);
      res.status(500).json({ error: "Failed to delete storyboard" });
    }
  });

  app.post("/api/storyboards/:id/images", async (req, res) => {
    try {
      const { prompt, sourceImages, generatedImageUrl, order } = req.body;
      
      if (!generatedImageUrl) {
        return res.status(400).json({ error: "Generated image URL is required" });
      }

      const image = await storage.createStoryboardImage({
        storyboardId: req.params.id,
        prompt,
        sourceImages: sourceImages ? JSON.stringify(sourceImages) : null,
        generatedImageUrl,
        order,
      });

      res.json({ success: true, image });
    } catch (error) {
      console.error("Create storyboard image error:", error);
      res.status(500).json({ error: "Failed to create storyboard image" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
