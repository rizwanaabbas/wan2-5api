const DASHSCOPE_API_URL = "https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis";
const DASHSCOPE_TASK_URL = "https://dashscope-intl.aliyuncs.com/api/v1/tasks";

if (!process.env.DASHSCOPE_API_KEY) {
  console.warn("DASHSCOPE_API_KEY not set. Video generation will fail.");
}

export interface WanGenerationInput {
  model: string; // "wan2.5-t2v-preview", "wan2.5-i2v-preview", "wan2.2-i2v-plus", etc.
  prompt: string;
  negativePrompt?: string;
  size?: string;
  duration?: number;
  promptExtend?: boolean;
  // Audio options
  audioMode?: "auto" | "custom" | "silent";
  audioUrl?: string;
  // Image-to-video options
  imageUrl?: string;
  // Keyframe-to-video options
  firstKeyframeUrl?: string;
  lastKeyframeUrl?: string;
}

export interface WanGenerationResult {
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  taskId: string;
}

async function pollTaskStatus(
  taskId: string,
  onProgress?: (progress: number) => void
): Promise<WanGenerationResult> {
  if (!process.env.DASHSCOPE_API_KEY) {
    throw new Error("DASHSCOPE_API_KEY not configured.");
  }

  const maxAttempts = 60; // Poll for up to 10 minutes (60 * 10s)
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(`${DASHSCOPE_TASK_URL}/${taskId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${process.env.DASHSCOPE_API_KEY}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Task status check failed: ${response.statusText}`, errorText);
        throw new Error(`Failed to check task status: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`Task ${taskId} status:`, result.output?.task_status, `Attempt: ${attempts + 1}/${maxAttempts}`);
      
      if (result.output?.task_status === "SUCCEEDED") {
        if (onProgress) {
          try {
            await onProgress(100);
          } catch (err) {
            console.error("Failed to update progress to 100%:", err);
          }
        }
        
        // Log the full output to see what's available
        console.log("Wan API success response:", JSON.stringify(result.output, null, 2));
        
        return {
          videoUrl: result.output.video_url,
          thumbnailUrl: result.output.thumbnail_url || result.output.cover_url,
          duration: result.output.duration || 8,
          taskId,
        };
      } else if (result.output?.task_status === "FAILED") {
        const errorMsg = result.output.message || result.output.code || "Unknown error";
        console.error(`Video generation failed:`, errorMsg);
        throw new Error(`Video generation failed: ${errorMsg}`);
      }

      // Update progress based on attempts (10% baseline + up to 80% based on progress)
      const estimatedProgress = Math.min(90, 10 + Math.floor((attempts / maxAttempts) * 80));
      if (onProgress) {
        try {
          await onProgress(estimatedProgress);
        } catch (err) {
          console.error(`Failed to update progress to ${estimatedProgress}%:`, err);
        }
      }

      // Wait 10 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 10000));
      attempts++;
    } catch (error) {
      if (error instanceof Error && error.message.includes("Video generation failed")) {
        throw error;
      }
      console.error(`Polling error on attempt ${attempts + 1}:`, error);
      // Continue polling on temporary errors
      await new Promise(resolve => setTimeout(resolve, 10000));
      attempts++;
    }
  }

  throw new Error("Video generation timed out after 10 minutes");
}

export async function generateWanVideo(
  input: WanGenerationInput,
  onProgress?: (progress: number) => void
): Promise<WanGenerationResult> {
  if (!process.env.DASHSCOPE_API_KEY) {
    throw new Error("DASHSCOPE_API_KEY not configured. Please add your DashScope API key.");
  }

  try {
    // Build input object
    const apiInput: any = {
      prompt: input.prompt,
    };

    // Add negative prompt if provided
    if (input.negativePrompt) {
      apiInput.negative_prompt = input.negativePrompt;
    }

    // Add image URL for image-to-video models
    if (input.imageUrl) {
      apiInput.img_url = input.imageUrl;
    }

    // Add keyframe URLs for keyframe-to-video models
    if (input.firstKeyframeUrl && input.lastKeyframeUrl) {
      apiInput.first_keyframe_url = input.firstKeyframeUrl;
      apiInput.last_keyframe_url = input.lastKeyframeUrl;
    }

    // Add custom audio URL if provided
    if (input.audioMode === "custom" && input.audioUrl) {
      apiInput.audio_url = input.audioUrl;
    }

    // Validate custom audio mode
    if (input.audioMode === "custom" && !input.audioUrl) {
      throw new Error("Audio URL is required when audio mode is 'custom'");
    }

    // Build parameters object
    const parameters: any = {
      prompt_extend: input.promptExtend !== false,
    };

    // Add size parameter (Wan API expects "size" field with width*height format)
    if (input.size) {
      parameters.size = input.size;
    }

    // Add duration for models that support it
    if (input.duration && (input.model === "wan2.5-t2v-preview" || input.model === "wan2.5-i2v-preview")) {
      parameters.duration = input.duration;
    }

    // Handle audio parameter based on audio mode
    if (input.audioMode === "auto") {
      parameters.audio = true;
    } else if (input.audioMode === "silent") {
      parameters.audio = false;
    }
    // For custom audio, we don't include the audio parameter - it's implicit from audio_url

    // Submit video generation task
    const response = await fetch(DASHSCOPE_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.DASHSCOPE_API_KEY}`,
        "Content-Type": "application/json",
        "X-DashScope-Async": "enable",
      },
      body: JSON.stringify({
        model: input.model,
        input: apiInput,
        parameters,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Video generation submission failed:", errorText);
      throw new Error(`Failed to submit video generation: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    
    if (!result.output?.task_id) {
      console.error("No task ID in response:", result);
      throw new Error("No task ID returned from API");
    }

    const logDetails = [
      `model=${input.model}`,
      input.size ? `resolution=${input.size}` : null,
      input.duration ? `duration=${input.duration}s` : null,
      input.audioMode ? `audio=${input.audioMode}` : null,
      input.audioUrl ? `audioUrl=${input.audioUrl}` : null,
      input.imageUrl ? `image=${input.imageUrl.substring(0, 30)}...` : null,
    ].filter(Boolean).join(", ");

    console.log(`Wan video generation task submitted: ${result.output.task_id}`);
    console.log(`Request: ${logDetails}, prompt="${input.prompt.substring(0, 50)}..."`);
    console.log(`Full API input:`, JSON.stringify(apiInput, null, 2));
    console.log(`Full API parameters:`, JSON.stringify(parameters, null, 2));

    // Poll for completion
    return await pollTaskStatus(result.output.task_id, onProgress);
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
