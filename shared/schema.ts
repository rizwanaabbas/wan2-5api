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
  model: text("model").notNull(), // "ovi" or "wan2.1"
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

export type ModelType = "ovi" | "wan2.1";
export type GenerationType = "text-to-video" | "image-to-video";
export type VideoStatus = "pending" | "processing" | "completed" | "failed";

export interface ResolutionOption {
  label: string;
  value: string;
  width: number;
  height: number;
  aspectRatio: string;
}

export const OVI_RESOLUTIONS: ResolutionOption[] = [
  { label: "720×720 (1:1)", value: "720x720", width: 720, height: 720, aspectRatio: "1:1" },
  { label: "1280×704 (16:9)", value: "1280x704", width: 1280, height: 704, aspectRatio: "16:9" },
  { label: "704×1280 (9:16)", value: "704x1280", width: 704, height: 1280, aspectRatio: "9:16" },
  { label: "1344×704 (Widescreen)", value: "1344x704", width: 1344, height: 704, aspectRatio: "Wide" },
  { label: "1504×608 (Ultra Wide)", value: "1504x608", width: 1504, height: 608, aspectRatio: "Ultra" },
];

export const WAN_RESOLUTIONS: ResolutionOption[] = [
  { label: "480p (854×480)", value: "854x480", width: 854, height: 480, aspectRatio: "16:9" },
  { label: "720p (1280×720)", value: "1280x720", width: 1280, height: 720, aspectRatio: "16:9" },
  { label: "1080p (1920×1080)", value: "1920x1080", width: 1920, height: 1080, aspectRatio: "16:9" },
  { label: "720p Portrait (720×1280)", value: "720x1280", width: 720, height: 1280, aspectRatio: "9:16" },
];
