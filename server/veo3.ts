import { fal } from "@fal-ai/client";

if (!process.env.FAL_KEY) {
  console.warn("FAL_KEY not set. Video generation will be simulated.");
} else {
  fal.config({
    credentials: process.env.FAL_KEY,
  });
}

export interface Veo3GenerationInput {
  prompt: string;
  aspectRatio?: "16:9" | "9:16" | "1:1";
  duration?: number;
  resolution?: "720p" | "1080p";
  generateAudio?: boolean;
}

export interface Veo3GenerationResult {
  videos: Array<{
    url: string;
    contentType: string;
    width: number;
    height: number;
  }>;
  duration: number;
  seed: number;
}

export async function generateVeo3Video(
  input: Veo3GenerationInput
): Promise<Veo3GenerationResult> {
  if (!process.env.FAL_KEY) {
    throw new Error("FAL_KEY not configured. Please add your fal.ai API key.");
  }

  try {
    const result = await fal.subscribe("fal-ai/veo3", {
      input: {
        prompt: input.prompt,
        aspect_ratio: input.aspectRatio || "16:9",
        duration: input.duration || 8,
        resolution: input.resolution || "720p",
        generate_audio: input.generateAudio !== false,
      },
      logs: true,
      onQueueUpdate: (update: any) => {
        if (update.status === "IN_PROGRESS") {
          console.log("Veo3 generation progress:", update.logs?.map((l: any) => l.message).join("\n"));
        }
      },
    });

    // Veo3 generates 2 versions by default
    return {
      videos: result.data.videos || [],
      duration: result.data.duration || 8,
      seed: result.data.seed || 0,
    };
  } catch (error) {
    console.error("Veo3 generation error:", error);
    throw new Error(`Failed to generate video with Veo3: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export function getAspectRatioFromResolution(resolution: string): "16:9" | "9:16" | "1:1" {
  // Parse resolution like "1280x720", "720x1280", "720x720"
  const [width, height] = resolution.split("x").map(Number);
  
  if (width === height) {
    return "1:1";
  } else if (width > height) {
    return "16:9";
  } else {
    return "9:16";
  }
}

export function getVeo3Resolution(resolution: string): "720p" | "1080p" {
  const [width, height] = resolution.split("x").map(Number);
  const maxDimension = Math.max(width, height);
  
  if (maxDimension >= 1920) {
    return "1080p";
  }
  return "720p";
}
