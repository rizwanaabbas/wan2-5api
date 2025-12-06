import { Response } from "express";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "./uploads");

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class PathTraversalError extends Error {
  constructor() {
    super("Invalid path: path traversal detected");
    this.name = "PathTraversalError";
    Object.setPrototypeOf(this, PathTraversalError.prototype);
  }
}

export class DiskStorageService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = UPLOAD_DIR;
    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  // Sanitize and validate path to prevent directory traversal attacks
  private sanitizePath(inputPath: string): string {
    // Remove null bytes
    let sanitized = inputPath.replace(/\0/g, '');
    
    // Remove /objects/ prefix if present
    if (sanitized.startsWith("/objects/")) {
      sanitized = sanitized.slice("/objects/".length);
    }
    
    // Remove leading slashes
    while (sanitized.startsWith("/")) {
      sanitized = sanitized.slice(1);
    }
    
    // Split path and filter out dangerous segments
    const segments = sanitized.split("/").filter(segment => {
      // Reject empty segments, current dir refs, and parent dir refs
      return segment !== "" && segment !== "." && segment !== "..";
    });
    
    // Validate each segment doesn't start with a dot (hidden files)
    // except for our known directories
    const allowedPrefixes = ["uploads"];
    if (segments.length > 0 && !allowedPrefixes.includes(segments[0])) {
      // Prepend uploads/ if not already there
      segments.unshift("uploads");
    }
    
    return segments.join("/");
  }

  // Get the local file path with security validation
  private getLocalPath(objectPath: string): string {
    const sanitized = this.sanitizePath(objectPath);
    const fullPath = path.resolve(this.uploadDir, sanitized);
    
    // Ensure the resolved path is still within UPLOAD_DIR
    if (!fullPath.startsWith(this.uploadDir + path.sep) && fullPath !== this.uploadDir) {
      throw new PathTraversalError();
    }
    
    return fullPath;
  }

  // Generate a unique ID for a new upload
  // If extension is provided (e.g., ".mp3"), it will be appended to the UUID
  generateUploadId(extension?: string): string {
    const uuid = randomUUID();
    if (extension) {
      // Ensure extension starts with a dot
      const ext = extension.startsWith('.') ? extension : `.${extension}`;
      return `uploads/${uuid}${ext}`;
    }
    return `uploads/${uuid}`;
  }

  // Get the public URL path for an upload
  getPublicPath(uploadId: string): string {
    return `/objects/${uploadId}`;
  }

  // Save a file from buffer
  async saveFile(uploadId: string, buffer: Buffer, contentType?: string): Promise<string> {
    const localPath = this.getLocalPath(uploadId);
    const dir = path.dirname(localPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Save the file
    fs.writeFileSync(localPath, buffer);

    // Save metadata (content type)
    if (contentType) {
      fs.writeFileSync(`${localPath}.meta`, JSON.stringify({ contentType }));
    }

    // Return sanitized path
    const sanitized = this.sanitizePath(uploadId);
    return `/objects/${sanitized}`;
  }

  // Get file metadata
  getMetadata(objectPath: string): { contentType: string; size: number } | null {
    try {
      const localPath = this.getLocalPath(objectPath);
      
      if (!fs.existsSync(localPath)) {
        return null;
      }

      const stats = fs.statSync(localPath);
      let contentType = "application/octet-stream";

      // Try to read metadata file
      const metaPath = `${localPath}.meta`;
      if (fs.existsSync(metaPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
          contentType = meta.contentType || contentType;
        } catch {
          // Ignore parse errors
        }
      } else {
        // Guess content type from extension
        const ext = path.extname(localPath).toLowerCase();
        const mimeTypes: Record<string, string> = {
          ".mp4": "video/mp4",
          ".webm": "video/webm",
          ".png": "image/png",
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".gif": "image/gif",
          ".webp": "image/webp",
          ".mp3": "audio/mpeg",
          ".wav": "audio/wav",
          ".ogg": "audio/ogg",
        };
        contentType = mimeTypes[ext] || contentType;
      }

      return { contentType, size: stats.size };
    } catch (error) {
      if (error instanceof PathTraversalError) {
        return null;
      }
      throw error;
    }
  }

  // Check if file exists
  exists(objectPath: string): boolean {
    try {
      const localPath = this.getLocalPath(objectPath);
      return fs.existsSync(localPath);
    } catch (error) {
      if (error instanceof PathTraversalError) {
        return false;
      }
      throw error;
    }
  }

  // Stream file to response
  async downloadObject(objectPath: string, res: Response, cacheTtlSec: number = 3600) {
    const localPath = this.getLocalPath(objectPath);
    
    if (!fs.existsSync(localPath)) {
      throw new ObjectNotFoundError();
    }

    const metadata = this.getMetadata(objectPath);
    if (!metadata) {
      throw new ObjectNotFoundError();
    }

    res.set({
      "Content-Type": metadata.contentType,
      "Content-Length": metadata.size,
      "Cache-Control": `public, max-age=${cacheTtlSec}`,
    });

    const stream = fs.createReadStream(localPath);
    stream.on("error", (err) => {
      console.error("Stream error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error streaming file" });
      }
    });

    stream.pipe(res);
  }

  // Read file as buffer
  readFile(objectPath: string): Buffer {
    const localPath = this.getLocalPath(objectPath);
    
    if (!fs.existsSync(localPath)) {
      throw new ObjectNotFoundError();
    }

    return fs.readFileSync(localPath);
  }

  // Normalize external URLs or paths to local object paths
  normalizeObjectEntityPath(rawPath: string): string {
    // If it's already an objects path, return as-is
    if (rawPath.startsWith("/objects/")) {
      return rawPath;
    }

    // If it's a local file path in UPLOAD_DIR
    if (rawPath.startsWith(this.uploadDir)) {
      const relativePath = rawPath.slice(this.uploadDir.length);
      return `/objects${relativePath.startsWith("/") ? relativePath : "/" + relativePath}`;
    }

    return rawPath;
  }
}

// Helper to get the public base URL from environment or default
export function getPublicBaseUrl(): string {
  return process.env.APP_BASE_URL || 'http://127.0.0.1:5000';
}

// Helper to build full public asset URLs from relative paths
export function buildPublicAssetUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl;
  }
  
  if (pathOrUrl.startsWith('/')) {
    return `${getPublicBaseUrl()}${pathOrUrl}`;
  }
  
  return pathOrUrl;
}
