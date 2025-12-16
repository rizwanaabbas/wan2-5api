import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  globalPrompt: text("global_prompt"), // Prepended to all video prompts in this project
  imageUrl: text("image_url"), // Default image for video generation in this project
  defaultModel: text("default_model"), // Default Wan model for this project
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const videos = pgTable("videos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  prompt: text("prompt").notNull(),
  negativePrompt: text("negative_prompt"), // Optional negative prompt
  model: text("model").notNull(), // All Wan models supported
  generationType: text("generation_type").notNull(), // "text-to-video", "image-to-video", "text-to-image", "image-to-image", "animation", "keyframe"
  resolution: text("resolution").notNull(), // e.g., "720x720", "1280x704"
  status: text("status").notNull().default("pending"), // "pending", "processing", "completed", "failed"
  progress: integer("progress").default(0), // 0-100
  taskId: varchar("task_id"), // Wan API task ID for tracking
  videoUrl: text("video_url"), // Output video URL (or image URL for T2I/I2I models)
  thumbnailUrl: text("thumbnail_url"),
  sourceImageUrl: text("source_image_url"), // For image-to-video, image-to-image, animation
  firstKeyframeUrl: text("first_keyframe_url"), // For keyframe-to-video
  lastKeyframeUrl: text("last_keyframe_url"), // For keyframe-to-video
  audioMode: varchar("audio_mode").default("auto"), // "auto", "custom", "silent"
  audioUrl: text("audio_url"), // For custom audio
  audioFilename: text("audio_filename"), // Original filename for custom audio
  duration: integer("duration"), // in seconds
  promptExtend: boolean("prompt_extend").default(true), // Enable prompt extension (true by default)
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const storyboards = pgTable("storyboards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  generationType: text("generation_type").notNull(), // "t2i" or "i2i"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const storyboardImages = pgTable("storyboard_images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storyboardId: varchar("storyboard_id").notNull().references(() => storyboards.id, { onDelete: 'cascade' }),
  prompt: text("prompt").notNull(),
  sourceImages: text("source_images"), // JSON array of base64 or URLs for I2I
  generatedImageUrl: text("generated_image_url").notNull(), // Stored image URL
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Saved files table for tracking downloaded/stored files
export const savedFiles = pgTable("saved_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  originalUrl: text("original_url").notNull(), // Original URL from API
  localPath: text("local_path").notNull(), // Local storage path like /objects/downloads/uuid.mp4
  filename: text("filename").notNull(), // Original or generated filename
  fileType: text("file_type").notNull(), // "video", "image", "audio"
  mimeType: text("mime_type"), // e.g., "video/mp4", "image/png"
  fileSize: integer("file_size"), // Size in bytes
  projectId: varchar("project_id").references(() => projects.id, { onDelete: 'set null' }),
  videoId: varchar("video_id").references(() => videos.id, { onDelete: 'set null' }),
  storyboardImageId: varchar("storyboard_image_id").references(() => storyboardImages.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
});

export const insertVideoSchema = createInsertSchema(videos).omit({
  id: true,
  createdAt: true,
  status: true,
  progress: true,
  taskId: true,
  videoUrl: true,
  thumbnailUrl: true,
  errorMessage: true,
});

export const insertStoryboardSchema = createInsertSchema(storyboards).omit({
  id: true,
  createdAt: true,
});

export const insertStoryboardImageSchema = createInsertSchema(storyboardImages).omit({
  id: true,
  createdAt: true,
});

export const insertSavedFileSchema = createInsertSchema(savedFiles).omit({
  id: true,
  createdAt: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videos.$inferSelect;
export type Storyboard = typeof storyboards.$inferSelect;
export type InsertStoryboard = z.infer<typeof insertStoryboardSchema>;
export type StoryboardImage = typeof storyboardImages.$inferSelect;
export type InsertStoryboardImage = z.infer<typeof insertStoryboardImageSchema>;
export type SavedFile = typeof savedFiles.$inferSelect;
export type InsertSavedFile = z.infer<typeof insertSavedFileSchema>;

export type ModelType = 
  | "wan2.2-animate-mix"
  | "wan2.2-animate-move"
  | "wan2.5-t2v-preview"
  | "wan2.5-i2v-preview"
  | "wan2.5-t2i-preview"
  | "wan2.5-i2i-preview"
  | "wan2.2-i2v-flash"
  | "wan2.2-i2v-plus"
  | "wan2.2-t2v-plus"
  | "wan2.2-t2i-plus"
  | "wan2.2-t2i-flash"
  | "wan2.1-vace-plus"
  | "wan2.1-kf2v-plus"
  | "wan2.6-i2v"
  | "wan2.6-image";

export type GenerationType = "text-to-video" | "image-to-video" | "text-to-image" | "image-to-image" | "animation" | "keyframe";
export type VideoStatus = "pending" | "processing" | "completed" | "failed";
export type AudioMode = "auto" | "custom" | "silent";

export type User = typeof users.$inferSelect;

export const insertUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export type InsertUser = z.infer<typeof insertUserSchema>;

export interface ResolutionOption {
  label: string;
  value: string;
  width: number;
  height: number;
  aspectRatio: string;
}

export const RESOLUTIONS: ResolutionOption[] = [
  // 480p options
  { label: "832×480 (YouTube)", value: "832x480", width: 832, height: 480, aspectRatio: "16:9" },
  { label: "480×832 (Shorts)", value: "480x832", width: 480, height: 832, aspectRatio: "9:16" },
  { label: "624×624 (Square)", value: "624x624", width: 624, height: 624, aspectRatio: "1:1" },
  
  // 720p options
  { label: "1280×720 (YouTube HD)", value: "1280x720", width: 1280, height: 720, aspectRatio: "16:9" },
  { label: "720×1280 (Reels)", value: "720x1280", width: 720, height: 1280, aspectRatio: "9:16" },
  { label: "960×960 (Square)", value: "960x960", width: 960, height: 960, aspectRatio: "1:1" },
  { label: "1088×832 (4:3)", value: "1088x832", width: 1088, height: 832, aspectRatio: "4:3" },
  { label: "832×1088 (3:4)", value: "832x1088", width: 832, height: 1088, aspectRatio: "3:4" },
  
  // 1080p options
  { label: "1920×1080 (YouTube FHD)", value: "1920x1080", width: 1920, height: 1080, aspectRatio: "16:9" },
  { label: "1080×1920 (Stories)", value: "1080x1920", width: 1080, height: 1920, aspectRatio: "9:16" },
  { label: "1440×1440 (Square)", value: "1440x1440", width: 1440, height: 1440, aspectRatio: "1:1" },
  { label: "1632×1248 (4:3)", value: "1632x1248", width: 1632, height: 1248, aspectRatio: "4:3" },
  { label: "1248×1632 (3:4)", value: "1248x1632", width: 1248, height: 1632, aspectRatio: "3:4" },
];
