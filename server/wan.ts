import { DiskStorageService } from "./diskStorage";

const DASHSCOPE_API_URL =
  "https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis";
const DASHSCOPE_TASK_URL = "https://dashscope-intl.aliyuncs.com/api/v1/tasks";

if (!process.env.DASHSCOPE_API_KEY) {
  console.warn("DASHSCOPE_API_KEY not set. Video generation will fail.");
}

const diskStorage = new DiskStorageService();

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

// Convert a local file path or URL to base64 data URI
async function convertToBase64(pathOrUrl: string): Promise<string> {
  // If already a data URI, return as-is
  if (pathOrUrl.startsWith("data:")) {
    return pathOrUrl;
  }

  // Handle local object storage paths
  if (pathOrUrl.startsWith("/objects/") || pathOrUrl.includes("/objects/")) {
    try {
      // Extract the object path
      let objectPath = pathOrUrl;
      if (pathOrUrl.includes("/objects/")) {
        const idx = pathOrUrl.indexOf("/objects/");
        objectPath = pathOrUrl.slice(idx);
      }

      const buffer = diskStorage.readFile(objectPath);
      const metadata = diskStorage.getMetadata(objectPath);
      const mimeType = metadata?.contentType || "application/octet-stream";

      const base64 = buffer.toString("base64");
      const dataUri = `data:${mimeType};base64,${base64}`;

      console.log(
        `Converted local file to base64: ${objectPath} (${mimeType}, ${buffer.length} bytes)`,
      );
      return dataUri;
    } catch (error) {
      console.error(
        `Failed to convert local file to base64: ${pathOrUrl}`,
        error,
      );
      throw new Error(`Failed to read local file: ${pathOrUrl}`);
    }
  }

  // Handle external URLs - fetch and convert
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    try {
      console.log(`Fetching external URL for base64 conversion: ${pathOrUrl}`);
      const response = await fetch(pathOrUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const contentType =
        response.headers.get("content-type") || "application/octet-stream";
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString("base64");

      const dataUri = `data:${contentType};base64,${base64}`;
      console.log(
        `Converted external URL to base64: ${pathOrUrl} (${contentType}, ${buffer.length} bytes)`,
      );
      return dataUri;
    } catch (error) {
      console.error(
        `Failed to fetch and convert URL to base64: ${pathOrUrl}`,
        error,
      );
      throw new Error(`Failed to fetch external URL: ${pathOrUrl}`);
    }
  }

  // Try to treat as a relative path in uploads directory
  try {
    const objectPath = `/objects/${pathOrUrl}`;
    const buffer = diskStorage.readFile(objectPath);
    const metadata = diskStorage.getMetadata(objectPath);
    const mimeType = metadata?.contentType || "application/octet-stream";

    const base64 = buffer.toString("base64");
    return `data:${mimeType};base64,${base64}`;
  } catch {
    console.error(
      `Unknown path format, cannot convert to base64: ${pathOrUrl}`,
    );
    throw new Error(`Cannot convert to base64: ${pathOrUrl}`);
  }
}

async function pollTaskStatus(
  taskId: string,
  onProgress?: (progress: number) => void,
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
          Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Task status check failed: ${response.statusText}`,
          errorText,
        );
        throw new Error(`Failed to check task status: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(
        `Task ${taskId} status:`,
        result.output?.task_status,
        `Attempt: ${attempts + 1}/${maxAttempts}`,
      );

      if (result.output?.task_status === "SUCCEEDED") {
        if (onProgress) {
          try {
            await onProgress(100);
          } catch (err) {
            console.error("Failed to update progress to 100%:", err);
          }
        }

        // Log the full output to see what's available
        console.log(
          "Wan API success response:",
          JSON.stringify(result.output, null, 2),
        );

        return {
          videoUrl: result.output.video_url,
          thumbnailUrl: result.output.thumbnail_url || result.output.cover_url,
          duration: result.output.duration || 8,
          taskId,
        };
      } else if (result.output?.task_status === "FAILED") {
        const errorMsg =
          result.output.message || result.output.code || "Unknown error";
        console.error(`Video generation failed:`, errorMsg);
        throw new Error(`Video generation failed: ${errorMsg}`);
      }

      // Update progress based on attempts (10% baseline + up to 80% based on progress)
      const estimatedProgress = Math.min(
        90,
        10 + Math.floor((attempts / maxAttempts) * 80),
      );
      if (onProgress) {
        try {
          await onProgress(estimatedProgress);
        } catch (err) {
          console.error(
            `Failed to update progress to ${estimatedProgress}%:`,
            err,
          );
        }
      }

      // Wait 10 seconds before next poll
      await new Promise((resolve) => setTimeout(resolve, 10000));
      attempts++;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Video generation failed")
      ) {
        throw error;
      }
      console.error(`Polling error on attempt ${attempts + 1}:`, error);
      // Continue polling on temporary errors
      await new Promise((resolve) => setTimeout(resolve, 10000));
      attempts++;
    }
  }

  throw new Error("Video generation timed out after 10 minutes");
}

export async function generateWanVideo(
  input: WanGenerationInput,
  onProgress?: (progress: number) => void,
): Promise<WanGenerationResult> {
  if (!process.env.DASHSCOPE_API_KEY) {
    throw new Error(
      "DASHSCOPE_API_KEY not configured. Please add your DashScope API key.",
    );
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

    // Add image as base64 for image-to-video models
    if (input.imageUrl) {
      console.log("Converting image to base64 for I2V generation...");
      apiInput.img_url = await convertToBase64(input.imageUrl);
      console.log("Image converted to base64 successfully");
    }

    // Add keyframe images as base64 for keyframe-to-video models
    if (input.firstKeyframeUrl && input.lastKeyframeUrl) {
      console.log("Converting keyframe images to base64...");
      apiInput.first_keyframe_url = await convertToBase64(
        input.firstKeyframeUrl,
      );
      apiInput.last_keyframe_url = await convertToBase64(input.lastKeyframeUrl);
      console.log("Keyframe images converted to base64 successfully");
    }

    // Add custom audio if provided
    // IMPORTANT: DashScope Wan API requires audio_url to be a PUBLICLY ACCESSIBLE HTTP/HTTPS URL
    // It does NOT support base64 encoding or local file paths for audio (unlike images)
    // Supported format: MP3 only
    if (input.audioMode === "custom" && input.audioUrl) {
      console.log("Processing custom audio for API...");
      console.log(`Audio URL: ${input.audioUrl.substring(0, 100)}...`);

      // DashScope requires a publicly accessible URL for audio
      if (
        input.audioUrl.startsWith("http://") ||
        input.audioUrl.startsWith("https://")
      ) {
        // External URL - pass directly
        console.log("Using external audio URL directly");
        apiInput.audio_url = input.audioUrl;
      } else if (
        input.audioUrl.startsWith("/objects/") ||
        input.audioUrl.includes("/objects/")
      ) {
        // Local file path - this won't work with DashScope API
        // The API needs a publicly accessible URL, not a local path or base64
        console.error(
          "ERROR: DashScope API requires a publicly accessible URL for audio files.",
        );
        console.error(
          "Local file paths (/objects/...) are not supported by the API.",
        );
        console.error(
          "Please upload your audio to a public hosting service or use a publicly accessible URL.",
        );
        throw new Error(
          "Custom audio requires a publicly accessible URL. " +
            "Local file uploads are not supported by the DashScope API for audio. " +
            "Please use a public URL (e.g., from cloud storage) or select 'Auto-generate audio' instead.",
        );
      } else if (input.audioUrl.startsWith("data:")) {
        // Base64 encoded - also not supported for audio
        console.error(
          "ERROR: DashScope API does not support base64-encoded audio.",
        );
        throw new Error(
          "Base64-encoded audio is not supported by the DashScope API. " +
            "Please provide a publicly accessible URL to an MP3 file.",
        );
      } else {
        console.error(
          `Unsupported audio URL format: ${input.audioUrl.substring(0, 50)}`,
        );
        throw new Error(
          "Unsupported audio URL format. Please provide a publicly accessible HTTP/HTTPS URL to an MP3 file.",
        );
      }
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
    if (
      input.duration &&
      (input.model === "wan2.5-t2v-preview" ||
        input.model === "wan2.5-i2v-preview")
    ) {
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
        Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
        "Content-Type": "application/json",
        "X-DashScope-Async": "enable",
      },
      body: JSON.stringify({
        model: input.model,
        input: apiInput,
        parameters,
      }),
    });
    //console.log("Body: " + body);
    console.log("Input: " + apiInput);
    console.log("Model: " + input.model);
    console.log("Params: " + parameters);
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Video generation submission failed:", errorText);
      throw new Error(
        `Failed to submit video generation: ${response.statusText} - ${errorText}`,
      );
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
      input.imageUrl
        ? `image=base64(${input.imageUrl.substring(0, 30)}...)`
        : null,
    ]
      .filter(Boolean)
      .join(", ");

    console.log(
      `Wan video generation task submitted: ${result.output.task_id}`,
    );
    console.log(
      `Request: ${logDetails}, prompt="${input.prompt.substring(0, 50)}..."`,
    );

    // Poll for completion
    return await pollTaskStatus(result.output.task_id, onProgress);
  } catch (error) {
    console.error("Wan generation error:", error);
    throw new Error(
      `Failed to generate video with Wan: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export async function generateTextToImage(
  prompt: string,
  size: string = "1024*1024",
  onProgress?: (progress: number) => void,
): Promise<string> {
  if (!process.env.DASHSCOPE_API_KEY) {
    throw new Error("DASHSCOPE_API_KEY not configured.");
  }

  try {
    if (onProgress) onProgress(10);

    const response = await fetch(
      "https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
          "Content-Type": "application/json",
          "X-DashScope-Async": "enable",
        },
        body: JSON.stringify({
          model: "wan2.5-t2i-preview",
          input: {
            prompt,
          },
          parameters: {
            size,
            n: 1,
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("T2I generation submission failed:", errorText);
      throw new Error(
        `Failed to submit T2I generation: ${response.statusText} - ${errorText}`,
      );
    }

    const result = await response.json();

    if (!result.output?.task_id) {
      console.error("No task ID in response:", result);
      throw new Error("No task ID returned from API");
    }

    console.log(`T2I generation task submitted: ${result.output.task_id}`);
    console.log(`Prompt: "${prompt}", Size: ${size}`);

    // Poll for completion
    return await pollImageTask(result.output.task_id, onProgress);
  } catch (error) {
    console.error("T2I generation error:", error);
    throw new Error(
      `Failed to generate text-to-image: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export async function generateImageToImage(
  prompt: string,
  imageUrls: string[],
  size: string = "1024*1024",
  onProgress?: (progress: number) => void,
): Promise<string> {
  if (!process.env.DASHSCOPE_API_KEY) {
    throw new Error("DASHSCOPE_API_KEY not configured.");
  }

  if (!imageUrls || imageUrls.length === 0) {
    throw new Error(
      "At least one image URL is required for image-to-image generation",
    );
  }

  try {
    if (onProgress) onProgress(10);

    // Convert all image URLs to base64
    console.log(
      `Converting ${imageUrls.length} images to base64 for I2I generation...`,
    );
    const base64Images = await Promise.all(
      imageUrls.map(async (url, index) => {
        console.log(
          `Converting image ${index + 1}/${imageUrls.length}: ${url.substring(0, 50)}...`,
        );
        return await convertToBase64(url);
      }),
    );
    console.log(
      `All ${imageUrls.length} images converted to base64 successfully`,
    );

    const response = await fetch(
      "https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/image2image/image-synthesis",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
          "Content-Type": "application/json",
          "X-DashScope-Async": "enable",
        },
        body: JSON.stringify({
          model: "wan2.5-i2i-preview",
          input: {
            prompt,
            images: base64Images,
          },
          parameters: {
            n: 1,
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("I2I generation submission failed:", errorText);
      throw new Error(
        `Failed to submit I2I generation: ${response.statusText} - ${errorText}`,
      );
    }

    const result = await response.json();

    if (!result.output?.task_id) {
      console.error("No task ID in response:", result);
      throw new Error("No task ID returned from API");
    }

    console.log(`I2I generation task submitted: ${result.output.task_id}`);
    console.log(
      `Prompt: "${prompt}", Image count: ${imageUrls.length}, Size: ${size}`,
    );

    // Poll for completion
    return await pollImageTask(result.output.task_id, onProgress);
  } catch (error) {
    console.error("I2I generation error:", error);
    throw new Error(
      `Failed to generate image-to-image: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

async function pollImageTask(
  taskId: string,
  onProgress?: (progress: number) => void,
): Promise<string> {
  if (!process.env.DASHSCOPE_API_KEY) {
    throw new Error("DASHSCOPE_API_KEY not configured.");
  }

  const maxAttempts = 60; // Poll for up to 10 minutes (60 * 10s)
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(
        `https://dashscope-intl.aliyuncs.com/api/v1/tasks/${taskId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
          },
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Task status check failed: ${response.statusText}`,
          errorText,
        );
        throw new Error(`Failed to check task status: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(
        `Image task ${taskId} status:`,
        result.output?.task_status,
        `Attempt: ${attempts + 1}/${maxAttempts}`,
      );

      if (result.output?.task_status === "SUCCEEDED") {
        if (onProgress) {
          try {
            await onProgress(100);
          } catch (err) {
            console.error("Failed to update progress to 100%:", err);
          }
        }

        // Get the first generated image from the results
        const imageUrl =
          result.output.results?.[0]?.image_url || result.output.image_url;
        if (!imageUrl) {
          console.error("No image URL in success response:", result.output);
          throw new Error("No image URL returned from API");
        }

        console.log("Image generation success, URL:", imageUrl);
        return imageUrl;
      } else if (result.output?.task_status === "FAILED") {
        const errorMsg =
          result.output.message || result.output.code || "Unknown error";
        console.error(`Image generation failed:`, errorMsg);
        throw new Error(`Image generation failed: ${errorMsg}`);
      }

      // Update progress based on attempts (10% baseline + up to 80% based on progress)
      const estimatedProgress = Math.min(
        90,
        10 + Math.floor((attempts / maxAttempts) * 80),
      );
      if (onProgress) {
        try {
          await onProgress(estimatedProgress);
        } catch (err) {
          console.error(
            `Failed to update progress to ${estimatedProgress}%:`,
            err,
          );
        }
      }

      // Wait 10 seconds before next poll
      await new Promise((resolve) => setTimeout(resolve, 10000));
      attempts++;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Image generation failed")
      ) {
        throw error;
      }
      console.error(`Polling error on attempt ${attempts + 1}:`, error);
      // Continue polling on temporary errors
      await new Promise((resolve) => setTimeout(resolve, 10000));
      attempts++;
    }
  }

  throw new Error("Image generation timed out after 10 minutes");
}

// Task-based API for frontend progress tracking
export interface ImageTaskResult {
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  imageUrl?: string;
  error?: string;
}

export async function startTextToImageTask(
  prompt: string,
  size: string = "1024*1024",
): Promise<string> {
  if (!process.env.DASHSCOPE_API_KEY) {
    throw new Error("DASHSCOPE_API_KEY not configured.");
  }

  const response = await fetch(
    "https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
        "Content-Type": "application/json",
        "X-DashScope-Async": "enable",
      },
      body: JSON.stringify({
        model: "wan2.5-t2i-preview",
        input: {
          prompt,
        },
        parameters: {
          size,
          n: 1,
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("T2I task submission failed:", errorText);
    throw new Error(
      `Failed to submit T2I task: ${response.statusText} - ${errorText}`,
    );
  }

  const result = await response.json();

  if (!result.output?.task_id) {
    console.error("No task ID in response:", result);
    throw new Error("No task ID returned from API");
  }

  console.log(
    `T2I task started: ${result.output.task_id}, Prompt: "${prompt.substring(0, 50)}...", Size: ${size}`,
  );
  return result.output.task_id;
}

export async function startImageToImageTask(
  prompt: string,
  imageUrls: string[],
  size: string = "1024*1024",
): Promise<string> {
  if (!process.env.DASHSCOPE_API_KEY) {
    throw new Error("DASHSCOPE_API_KEY not configured.");
  }

  if (!imageUrls || imageUrls.length === 0) {
    throw new Error(
      "At least one image URL is required for image-to-image generation",
    );
  }

  // Convert all image URLs to base64
  console.log(
    `Converting ${imageUrls.length} images to base64 for I2I task...`,
  );
  const base64Images = await Promise.all(
    imageUrls.map(async (url, index) => {
      console.log(
        `Converting image ${index + 1}/${imageUrls.length}: ${url.substring(0, 50)}...`,
      );
      return await convertToBase64(url);
    }),
  );
  console.log(
    `All ${imageUrls.length} images converted to base64 successfully`,
  );

  const response = await fetch(
    "https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/image2image/image-synthesis",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
        "Content-Type": "application/json",
        "X-DashScope-Async": "enable",
      },
      body: JSON.stringify({
        model: "wan2.5-i2i-preview",
        input: {
          prompt,
          images: base64Images,
        },
        parameters: {
          size,
          n: 1,
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("I2I task submission failed:", errorText);
    throw new Error(
      `Failed to submit I2I task: ${response.statusText} - ${errorText}`,
    );
  }

  const result = await response.json();

  if (!result.output?.task_id) {
    console.error("No task ID in response:", result);
    throw new Error("No task ID returned from API");
  }

  console.log(
    `I2I task started: ${result.output.task_id}, Prompt: "${prompt.substring(0, 50)}...", Images: ${imageUrls.length}, Size: ${size}`,
  );
  return result.output.task_id;
}

export async function checkImageTaskStatus(
  taskId: string,
): Promise<ImageTaskResult> {
  if (!process.env.DASHSCOPE_API_KEY) {
    throw new Error("DASHSCOPE_API_KEY not configured.");
  }

  const response = await fetch(
    `https://dashscope-intl.aliyuncs.com/api/v1/tasks/${taskId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
      },
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(
      `Task status check failed: ${response.statusText}`,
      errorText,
    );
    throw new Error(`Failed to check task status: ${response.statusText}`);
  }

  const result = await response.json();
  const taskStatus = result.output?.task_status;

  console.log(
    `Task ${taskId} status: ${taskStatus}, full output:`,
    JSON.stringify(result.output, null, 2),
  );

  if (taskStatus === "SUCCEEDED") {
    // Try multiple possible locations for the image URL
    const imageUrl =
      result.output.results?.[0]?.url ||
      result.output.results?.[0]?.image_url ||
      result.output.image_url ||
      result.output.url;

    console.log(`Task ${taskId} succeeded, found imageUrl:`, imageUrl);

    if (!imageUrl) {
      console.error("No image URL in success response:", result.output);
      return {
        status: "failed",
        progress: 100,
        error: "No image URL returned from API",
      };
    }

    return {
      status: "completed",
      progress: 100,
      imageUrl,
    };
  } else if (taskStatus === "FAILED") {
    const errorMsg =
      result.output.message || result.output.code || "Unknown error";
    console.error(`Task ${taskId} failed:`, errorMsg);
    return {
      status: "failed",
      progress: 0,
      error: errorMsg,
    };
  } else if (taskStatus === "RUNNING" || taskStatus === "PENDING") {
    // Estimate progress based on typical generation time (~30-60 seconds)
    const metrics = result.output?.task_metrics;
    let progress = 20; // Base progress for started task

    if (metrics?.TOTAL && metrics?.SUCCEEDED !== undefined) {
      progress = Math.min(
        90,
        20 + Math.floor((metrics.SUCCEEDED / metrics.TOTAL) * 70),
      );
    }

    return {
      status: "processing",
      progress,
    };
  }

  // Log unknown status
  console.log(`Task ${taskId} has unknown status: ${taskStatus}`);

  return {
    status: "pending",
    progress: 10,
  };
}

export function getWanSize(resolution: string): string {
  // Parse resolution like "1280x720" and convert to "1280*720" format for Wan API
  const parts = resolution.split("x");

  if (parts.length !== 2) {
    console.warn(
      `Invalid resolution format: ${resolution}, using default 832*480`,
    );
    return "832*480";
  }

  const width = Number(parts[0]);
  const height = Number(parts[1]);

  if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
    console.warn(
      `Invalid resolution values: ${resolution}, using default 832*480`,
    );
    return "832*480";
  }

  // Wan API uses asterisk format: width*height
  return `${width}*${height}`;
}
