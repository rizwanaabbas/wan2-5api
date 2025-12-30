import { type Project, type InsertProject, type Video, type InsertVideo, type User, type InsertUser, type Storyboard, type InsertStoryboard, type StoryboardImage, type InsertStoryboardImage, type StoryboardItem, type InsertStoryboardItem, type SavedFile, type InsertSavedFile, projects, videos, users, storyboards, storyboardImages, storyboardItems, savedFiles } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser & { password: string }): Promise<User>;
  
  // Projects
  getProject(id: string): Promise<Project | undefined>;
  getAllProjects(): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;
  
  // Videos
  getVideo(id: string): Promise<Video | undefined>;
  getVideosByProject(projectId: string): Promise<Video[]>;
  getAllVideos(): Promise<Video[]>;
  createVideo(video: InsertVideo): Promise<Video>;
  updateVideo(id: string, updates: Partial<Video>): Promise<Video | undefined>;
  deleteVideo(id: string): Promise<boolean>;

  // Storyboards
  getStoryboard(id: string): Promise<(Storyboard & { images: StoryboardImage[], items: StoryboardItem[] }) | undefined>;
  getStoryboardsByProject(projectId: string): Promise<Storyboard[]>;
  createStoryboard(storyboard: InsertStoryboard): Promise<Storyboard>;
  updateStoryboard(id: string, updates: Partial<Storyboard>): Promise<Storyboard | undefined>;
  deleteStoryboard(id: string): Promise<boolean>;
  createStoryboardImage(image: InsertStoryboardImage): Promise<StoryboardImage>;
  getStoryboardImages(storyboardId: string): Promise<StoryboardImage[]>;

  // Storyboard Items (new table)
  getStoryboardItem(id: string): Promise<StoryboardItem | undefined>;
  getStoryboardItems(storyboardId: string): Promise<StoryboardItem[]>;
  createStoryboardItem(item: InsertStoryboardItem): Promise<StoryboardItem>;
  updateStoryboardItem(id: string, updates: Partial<StoryboardItem>): Promise<StoryboardItem | undefined>;
  deleteStoryboardItem(id: string): Promise<boolean>;
  deleteStoryboardItemsByStoryboard(storyboardId: string): Promise<boolean>;

  // Saved Files
  getSavedFile(id: string): Promise<SavedFile | undefined>;
  getSavedFileByOriginalUrl(originalUrl: string): Promise<SavedFile | undefined>;
  getSavedFilesByProject(projectId: string): Promise<SavedFile[]>;
  getSavedFileByVideoId(videoId: string): Promise<SavedFile | undefined>;
  getSavedFileByStoryboardImageId(storyboardImageId: string): Promise<SavedFile | undefined>;
  createSavedFile(savedFile: InsertSavedFile): Promise<SavedFile>;
  deleteSavedFile(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private projects: Map<string, Project>;
  private videos: Map<string, Video>;
  private storyboards: Map<string, Storyboard>;
  private storyboardImages: Map<string, StoryboardImage>;
  private storyboardItemsMap: Map<string, StoryboardItem>;
  private savedFilesMap: Map<string, SavedFile>;

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.videos = new Map();
    this.storyboards = new Map();
    this.storyboardImages = new Map();
    this.storyboardItemsMap = new Map();
    this.savedFilesMap = new Map();
  }

  // Users
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.email === email);
  }

  async createUser(user: InsertUser & { password: string }): Promise<User> {
    const id = randomUUID();
    const newUser: User = {
      ...user,
      id,
      createdAt: new Date(),
    };
    this.users.set(id, newUser);
    return newUser;
  }

  // Projects
  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async getAllProjects(): Promise<Project[]> {
    return Array.from(this.projects.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = randomUUID();
    const project: Project = {
      ...insertProject,
      id,
      globalPrompt: insertProject.globalPrompt ?? null,
      imageUrl: insertProject.imageUrl ?? null,
      defaultModel: insertProject.defaultModel ?? null,
      createdAt: new Date(),
    };
    this.projects.set(id, project);
    return project;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;
    
    const updated = { ...project, ...updates };
    this.projects.set(id, updated);
    return updated;
  }

  async deleteProject(id: string): Promise<boolean> {
    // Delete all videos in the project first
    const videos = await this.getVideosByProject(id);
    for (const video of videos) {
      this.videos.delete(video.id);
    }
    
    return this.projects.delete(id);
  }

  // Videos
  async getVideo(id: string): Promise<Video | undefined> {
    return this.videos.get(id);
  }

  async getVideosByProject(projectId: string): Promise<Video[]> {
    return Array.from(this.videos.values())
      .filter(video => video.projectId === projectId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getAllVideos(): Promise<Video[]> {
    return Array.from(this.videos.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async createVideo(insertVideo: InsertVideo): Promise<Video> {
    const id = randomUUID();
    const video: Video = {
      ...insertVideo,
      id,
      status: "pending",
      progress: 0,
      videoUrl: null,
      thumbnailUrl: null,
      sourceImageUrl: insertVideo.sourceImageUrl ?? null,
      firstKeyframeUrl: insertVideo.firstKeyframeUrl ?? null,
      lastKeyframeUrl: insertVideo.lastKeyframeUrl ?? null,
      negativePrompt: insertVideo.negativePrompt ?? null,
      audioMode: insertVideo.audioMode ?? null,
      audioUrl: insertVideo.audioUrl ?? null,
      audioFilename: insertVideo.audioFilename ?? null,
      taskId: null,
      duration: insertVideo.duration ?? null,
      promptExtend: insertVideo.promptExtend ?? null,
      errorMessage: null,
      createdAt: new Date(),
    };
    this.videos.set(id, video);
    return video;
  }

  async updateVideo(id: string, updates: Partial<Video>): Promise<Video | undefined> {
    const video = this.videos.get(id);
    if (!video) return undefined;
    
    const updated = { ...video, ...updates };
    this.videos.set(id, updated);
    return updated;
  }

  async deleteVideo(id: string): Promise<boolean> {
    return this.videos.delete(id);
  }

  // Storyboards
  async getStoryboard(id: string): Promise<(Storyboard & { images: StoryboardImage[], items: StoryboardItem[] }) | undefined> {
    const storyboard = this.storyboards.get(id);
    if (!storyboard) return undefined;
    const images = Array.from(this.storyboardImages.values())
      .filter(img => img.storyboardId === id)
      .sort((a, b) => a.order - b.order);
    const items = Array.from(this.storyboardItemsMap.values())
      .filter(item => item.storyboardId === id)
      .sort((a, b) => a.order - b.order);
    return { ...storyboard, images, items };
  }

  async getStoryboardsByProject(projectId: string): Promise<Storyboard[]> {
    return Array.from(this.storyboards.values())
      .filter(s => s.projectId === projectId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createStoryboard(insertStoryboard: InsertStoryboard): Promise<Storyboard> {
    const id = randomUUID();
    const storyboard: Storyboard = {
      ...insertStoryboard,
      id,
      globalStyle: insertStoryboard.globalStyle ?? null,
      globalImageUrl: insertStoryboard.globalImageUrl ?? null,
      referenceMode: insertStoryboard.referenceMode ?? null,
      createdAt: new Date(),
    };
    this.storyboards.set(id, storyboard);
    return storyboard;
  }

  async updateStoryboard(id: string, updates: Partial<Storyboard>): Promise<Storyboard | undefined> {
    const storyboard = this.storyboards.get(id);
    if (!storyboard) return undefined;
    const updated = { ...storyboard, ...updates };
    this.storyboards.set(id, updated);
    return updated;
  }

  async deleteStoryboard(id: string): Promise<boolean> {
    const images = Array.from(this.storyboardImages.values())
      .filter(img => img.storyboardId === id);
    for (const img of images) {
      this.storyboardImages.delete(img.id);
    }
    const items = Array.from(this.storyboardItemsMap.values())
      .filter(item => item.storyboardId === id);
    for (const item of items) {
      this.storyboardItemsMap.delete(item.id);
    }
    return this.storyboards.delete(id);
  }

  async createStoryboardImage(image: InsertStoryboardImage): Promise<StoryboardImage> {
    const id = randomUUID();
    const storyboardImage: StoryboardImage = {
      ...image,
      id,
      sourceImages: image.sourceImages ?? null,
      createdAt: new Date(),
    };
    this.storyboardImages.set(id, storyboardImage);
    return storyboardImage;
  }

  async getStoryboardImages(storyboardId: string): Promise<StoryboardImage[]> {
    return Array.from(this.storyboardImages.values())
      .filter(img => img.storyboardId === storyboardId)
      .sort((a, b) => a.order - b.order);
  }

  // Storyboard Items
  async getStoryboardItem(id: string): Promise<StoryboardItem | undefined> {
    return this.storyboardItemsMap.get(id);
  }

  async getStoryboardItems(storyboardId: string): Promise<StoryboardItem[]> {
    return Array.from(this.storyboardItemsMap.values())
      .filter(item => item.storyboardId === storyboardId)
      .sort((a, b) => a.order - b.order);
  }

  async createStoryboardItem(item: InsertStoryboardItem): Promise<StoryboardItem> {
    const id = randomUUID();
    const storyboardItem: StoryboardItem = {
      ...item,
      id,
      model: item.model ?? "wan2.6-image",
      referenceImageUrl: item.referenceImageUrl ?? null,
      generatedImageUrl: null,
      status: "pending",
      taskId: null,
      createdAt: new Date(),
    };
    this.storyboardItemsMap.set(id, storyboardItem);
    return storyboardItem;
  }

  async updateStoryboardItem(id: string, updates: Partial<StoryboardItem>): Promise<StoryboardItem | undefined> {
    const item = this.storyboardItemsMap.get(id);
    if (!item) return undefined;
    const updated = { ...item, ...updates };
    this.storyboardItemsMap.set(id, updated);
    return updated;
  }

  async deleteStoryboardItem(id: string): Promise<boolean> {
    return this.storyboardItemsMap.delete(id);
  }

  async deleteStoryboardItemsByStoryboard(storyboardId: string): Promise<boolean> {
    const items = Array.from(this.storyboardItemsMap.values())
      .filter(item => item.storyboardId === storyboardId);
    for (const item of items) {
      this.storyboardItemsMap.delete(item.id);
    }
    return true;
  }

  // Saved Files
  async getSavedFile(id: string): Promise<SavedFile | undefined> {
    return this.savedFilesMap.get(id);
  }

  async getSavedFileByOriginalUrl(originalUrl: string): Promise<SavedFile | undefined> {
    return Array.from(this.savedFilesMap.values()).find(f => f.originalUrl === originalUrl);
  }

  async getSavedFilesByProject(projectId: string): Promise<SavedFile[]> {
    return Array.from(this.savedFilesMap.values())
      .filter(f => f.projectId === projectId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getSavedFileByVideoId(videoId: string): Promise<SavedFile | undefined> {
    return Array.from(this.savedFilesMap.values()).find(f => f.videoId === videoId);
  }

  async getSavedFileByStoryboardImageId(storyboardImageId: string): Promise<SavedFile | undefined> {
    return Array.from(this.savedFilesMap.values()).find(f => f.storyboardImageId === storyboardImageId);
  }

  async createSavedFile(insertSavedFile: InsertSavedFile): Promise<SavedFile> {
    const id = randomUUID();
    const savedFile: SavedFile = {
      ...insertSavedFile,
      id,
      mimeType: insertSavedFile.mimeType ?? null,
      fileSize: insertSavedFile.fileSize ?? null,
      projectId: insertSavedFile.projectId ?? null,
      videoId: insertSavedFile.videoId ?? null,
      storyboardImageId: insertSavedFile.storyboardImageId ?? null,
      createdAt: new Date(),
    };
    this.savedFilesMap.set(id, savedFile);
    return savedFile;
  }

  async deleteSavedFile(id: string): Promise<boolean> {
    return this.savedFilesMap.delete(id);
  }
}

export class DbStorage implements IStorage {
  // Users
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser & { password: string }): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  // Projects
  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async getAllProjects(): Promise<Project[]> {
    return db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(insertProject).returning();
    return project;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    const [updated] = await db.update(projects)
      .set(updates)
      .where(eq(projects.id, id))
      .returning();
    return updated;
  }

  async deleteProject(id: string): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Videos
  async getVideo(id: string): Promise<Video | undefined> {
    const [video] = await db.select().from(videos).where(eq(videos.id, id));
    return video;
  }

  async getVideosByProject(projectId: string): Promise<Video[]> {
    return db.select()
      .from(videos)
      .where(eq(videos.projectId, projectId))
      .orderBy(desc(videos.createdAt));
  }

  async getAllVideos(): Promise<Video[]> {
    return db.select().from(videos).orderBy(desc(videos.createdAt));
  }

  async createVideo(insertVideo: InsertVideo): Promise<Video> {
    const [video] = await db.insert(videos).values({
      ...insertVideo,
      status: "pending",
      progress: 0,
    }).returning();
    return video;
  }

  async updateVideo(id: string, updates: Partial<Video>): Promise<Video | undefined> {
    const [updated] = await db.update(videos)
      .set(updates)
      .where(eq(videos.id, id))
      .returning();
    return updated;
  }

  async deleteVideo(id: string): Promise<boolean> {
    const result = await db.delete(videos).where(eq(videos.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Storyboards
  async getStoryboard(id: string): Promise<(Storyboard & { images: StoryboardImage[], items: StoryboardItem[] }) | undefined> {
    const [storyboard] = await db.select().from(storyboards).where(eq(storyboards.id, id));
    if (!storyboard) return undefined;
    const images = await db.select().from(storyboardImages)
      .where(eq(storyboardImages.storyboardId, id))
      .orderBy(storyboardImages.order);
    const items = await db.select().from(storyboardItems)
      .where(eq(storyboardItems.storyboardId, id))
      .orderBy(storyboardItems.order);
    return { ...storyboard, images, items };
  }

  async getStoryboardsByProject(projectId: string): Promise<Storyboard[]> {
    return db.select()
      .from(storyboards)
      .where(eq(storyboards.projectId, projectId))
      .orderBy(desc(storyboards.createdAt));
  }

  async createStoryboard(insertStoryboard: InsertStoryboard): Promise<Storyboard> {
    const [storyboard] = await db.insert(storyboards).values(insertStoryboard).returning();
    return storyboard;
  }

  async updateStoryboard(id: string, updates: Partial<Storyboard>): Promise<Storyboard | undefined> {
    const [updated] = await db.update(storyboards)
      .set(updates)
      .where(eq(storyboards.id, id))
      .returning();
    return updated;
  }

  async deleteStoryboard(id: string): Promise<boolean> {
    const result = await db.delete(storyboards).where(eq(storyboards.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async createStoryboardImage(image: InsertStoryboardImage): Promise<StoryboardImage> {
    const [storyboardImage] = await db.insert(storyboardImages).values(image).returning();
    return storyboardImage;
  }

  async getStoryboardImages(storyboardId: string): Promise<StoryboardImage[]> {
    return db.select()
      .from(storyboardImages)
      .where(eq(storyboardImages.storyboardId, storyboardId))
      .orderBy(storyboardImages.order);
  }

  // Storyboard Items
  async getStoryboardItem(id: string): Promise<StoryboardItem | undefined> {
    const [item] = await db.select().from(storyboardItems).where(eq(storyboardItems.id, id));
    return item;
  }

  async getStoryboardItems(storyboardId: string): Promise<StoryboardItem[]> {
    return db.select()
      .from(storyboardItems)
      .where(eq(storyboardItems.storyboardId, storyboardId))
      .orderBy(storyboardItems.order);
  }

  async createStoryboardItem(item: InsertStoryboardItem): Promise<StoryboardItem> {
    const [storyboardItem] = await db.insert(storyboardItems).values({
      ...item,
      status: "pending",
    }).returning();
    return storyboardItem;
  }

  async updateStoryboardItem(id: string, updates: Partial<StoryboardItem>): Promise<StoryboardItem | undefined> {
    const [updated] = await db.update(storyboardItems)
      .set(updates)
      .where(eq(storyboardItems.id, id))
      .returning();
    return updated;
  }

  async deleteStoryboardItem(id: string): Promise<boolean> {
    const result = await db.delete(storyboardItems).where(eq(storyboardItems.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async deleteStoryboardItemsByStoryboard(storyboardId: string): Promise<boolean> {
    await db.delete(storyboardItems).where(eq(storyboardItems.storyboardId, storyboardId));
    return true;
  }

  // Saved Files
  async getSavedFile(id: string): Promise<SavedFile | undefined> {
    const [file] = await db.select().from(savedFiles).where(eq(savedFiles.id, id));
    return file;
  }

  async getSavedFileByOriginalUrl(originalUrl: string): Promise<SavedFile | undefined> {
    const [file] = await db.select().from(savedFiles).where(eq(savedFiles.originalUrl, originalUrl));
    return file;
  }

  async getSavedFilesByProject(projectId: string): Promise<SavedFile[]> {
    return db.select()
      .from(savedFiles)
      .where(eq(savedFiles.projectId, projectId))
      .orderBy(desc(savedFiles.createdAt));
  }

  async getSavedFileByVideoId(videoId: string): Promise<SavedFile | undefined> {
    const [file] = await db.select().from(savedFiles).where(eq(savedFiles.videoId, videoId));
    return file;
  }

  async getSavedFileByStoryboardImageId(storyboardImageId: string): Promise<SavedFile | undefined> {
    const [file] = await db.select().from(savedFiles).where(eq(savedFiles.storyboardImageId, storyboardImageId));
    return file;
  }

  async createSavedFile(insertSavedFile: InsertSavedFile): Promise<SavedFile> {
    const [savedFile] = await db.insert(savedFiles).values(insertSavedFile).returning();
    return savedFile;
  }

  async deleteSavedFile(id: string): Promise<boolean> {
    const result = await db.delete(savedFiles).where(eq(savedFiles.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }
}

export const storage = new DbStorage();
