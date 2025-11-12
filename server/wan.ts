const DASHSCOPE_API_URL = "https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis";

if (!process.env.DASHSCOPE_API_KEY) {
  console.warn("DASHSCOPE_API_KEY not set. Video generation will fail.");
}

export interface WanGenerationInput {
  prompt: string;
  resolution?: "720P" | "1080P";
  duration?: number;
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
    const response = await fetch(`${DASHSCOPE_API_URL}/${taskId}`, {
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
          resolution: input.resolution || "720P",
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

export function getWanResolution(resolution: string): "720P" | "1080P" {
  // Parse resolution like "1280x720", "720x1280", "1920x1080"
  const [width, height] = resolution.split("x").map(Number);
  const maxDimension = Math.max(width, height);
  
  if (maxDimension >= 1920) {
    return "1080P";
  }
  return "720P";
}
