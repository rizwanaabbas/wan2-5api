import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  globalPrompt: text("global_prompt"), // Prepended to all video prompts in this project
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const videos = pgTable("videos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  prompt: text("prompt").notNull(),
  model: text("model").notNull(), // "wan2.5" (Alibaba Cloud Wan 2.5)
  generationType: text("generation_type").notNull(), // "text-to-video" or "image-to-video"
  resolution: text("resolution").notNull(), // e.g., "720x720", "1280x704"
  status: text("status").notNull().default("pending"), // "pending", "processing", "completed", "failed"
  progress: integer("progress").default(0), // 0-100
  videoUrl: text("video_url"),
  thumbnailUrl: text("thumbnail_url"),
  sourceImageUrl: text("source_image_url"), // For image-to-video
  duration: integer("duration"), // in seconds
  errorMessage: text("error_message"),
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
  videoUrl: true,
  thumbnailUrl: true,
  duration: true,
  errorMessage: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videos.$inferSelect;

export type ModelType = "wan2.5";
export type GenerationType = "text-to-video" | "image-to-video";
export type VideoStatus = "pending" | "processing" | "completed" | "failed";

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
