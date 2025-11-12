const DASHSCOPE_API_URL = "https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis";
const DASHSCOPE_TASK_URL = "https://dashscope-intl.aliyuncs.com/api/v1/tasks";

if (!process.env.DASHSCOPE_API_KEY) {
  console.warn("DASHSCOPE_API_KEY not set. Video generation will fail.");
}

export interface WanGenerationInput {
  prompt: string;
  size?: string;
  duration?: number;
  promptExtend?: boolean;
  audio?: boolean;
}

export interface WanGenerationResult {
  videoUrl: string;
  duration: number;
  taskId: string;
}

async function pollTaskStatus(taskId: string): Promise<WanGenerationResult> {
  if (!process.env.DASHSCOPE_API_KEY) {
    throw new Error("DASHSCOPE_API_KEY not configured.");
  }

  const maxAttempts = 60; // Poll for up to 10 minutes (60 * 10s)
  let attempts = 0;

  while (attempts < maxAttempts) {
    const response = await fetch(`${DASHSCOPE_TASK_URL}/${taskId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${process.env.DASHSCOPE_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to check task status: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.output?.task_status === "SUCCEEDED") {
      return {
        videoUrl: result.output.video_url,
        duration: result.output.duration || 8,
        taskId,
      };
    } else if (result.output?.task_status === "FAILED") {
      throw new Error(`Video generation failed: ${result.output.message || "Unknown error"}`);
    }

    // Wait 10 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 10000));
    attempts++;
  }

  throw new Error("Video generation timed out");
}

export async function generateWanVideo(
  input: WanGenerationInput
): Promise<WanGenerationResult> {
  if (!process.env.DASHSCOPE_API_KEY) {
    throw new Error("DASHSCOPE_API_KEY not configured. Please add your DashScope API key.");
  }

  try {
    // Submit video generation task
    const response = await fetch(DASHSCOPE_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.DASHSCOPE_API_KEY}`,
        "Content-Type": "application/json",
        "X-DashScope-Async": "enable",
      },
      body: JSON.stringify({
        model: "wan2.5-t2v-preview",
        input: {
          prompt: input.prompt,
        },
        parameters: {
          size: input.size || "832*480",
          prompt_extend: input.promptExtend !== false,
          duration: input.duration || 10,
          audio: input.audio !== false,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to submit video generation: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    
    if (!result.output?.task_id) {
      throw new Error("No task ID returned from API");
    }

    console.log(`Wan video generation task submitted: ${result.output.task_id}`);

    // Poll for completion
    return await pollTaskStatus(result.output.task_id);
  } catch (error) {
    console.error("Wan generation error:", error);
    throw new Error(`Failed to generate video with Wan: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export function getWanSize(resolution: string): string {
  // Parse resolution like "1280x720" and convert to "1280*720" format for Wan API
  const parts = resolution.split("x");
  
  if (parts.length !== 2) {
    console.warn(`Invalid resolution format: ${resolution}, using default 832*480`);
    return "832*480";
  }
  
  const width = Number(parts[0]);
  const height = Number(parts[1]);
  
  if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
    console.warn(`Invalid resolution values: ${resolution}, using default 832*480`);
    return "832*480";
  }
  
  // Wan API uses asterisk format: width*height
  return `${width}*${height}`;
}
