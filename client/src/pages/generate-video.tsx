import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Project, ModelType, GenerationType, InsertVideo, AudioMode } from "@shared/schema";
import { WAN_MODELS } from "@shared/models";
import { ResolutionSelector } from "@/components/resolution-selector";
import { PromptBuilder } from "@/components/prompt-builder";
import { ImageUploader } from "@/components/image-uploader";
import { ModelSelector } from "@/components/model-selector";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Loader2, Sparkles, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function GenerateVideo() {
  const [, params] = useRoute("/project/:id/generate");
  const [, setLocation] = useLocation();
  const projectId = params?.id;
  const { toast } = useToast();

  const [model, setModel] = useState<ModelType>("wan2.5-t2v-preview");
  const [videoName, setVideoName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [resolution, setResolution] = useState("1920x1080");
  const [sourceImage, setSourceImage] = useState<File | null>(null);
  const [firstKeyframe, setFirstKeyframe] = useState<File | null>(null);
  const [lastKeyframe, setLastKeyframe] = useState<File | null>(null);
  const [audioMode, setAudioMode] = useState<AudioMode>("auto");
  const [customAudio, setCustomAudio] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [finalPrompt, setFinalPrompt] = useState("");

  const { data: project } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  // Set default model from project when project loads
  useEffect(() => {
    if (project?.defaultModel) {
      setModel(project.defaultModel as ModelType);
    }
  }, [project?.defaultModel]);

  // Get current model metadata
  const selectedModelMeta = WAN_MODELS[model];
  const generationType: GenerationType = selectedModelMeta.category;

  const generateMutation = useMutation({
    mutationFn: async (data: InsertVideo) => {
      return apiRequest("POST", "/api/videos", data);
    },
    onSuccess: () => {
      setShowConfirmDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/videos", projectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      toast({
        title: "Video generation started",
        description: "Your video is being generated. This may take a few minutes.",
      });
      setLocation(`/project/${projectId}`);
    },
    onError: (error: any) => {
      setShowConfirmDialog(false);
      toast({
        title: "Generation failed",
        description: error.message || "Failed to start video generation",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectId || !videoName.trim() || !prompt.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Combine prompt with global prompt if available
    let combinedPrompt = prompt.trim();
    const globalPromptText = project?.globalPrompt?.trim();
    
    if (globalPromptText && globalPromptText.length > 0) {
      combinedPrompt = `${prompt.trim()} ${globalPromptText}`;
    }
    
    console.log('User prompt:', prompt.trim());
    console.log('Global prompt:', globalPromptText);
    console.log('Combined prompt:', combinedPrompt);
    
    setFinalPrompt(combinedPrompt);
    
    // Show confirmation dialog with preview
    setShowConfirmDialog(true);
  };

  const handleConfirmGeneration = async () => {
    // Keep dialog open during upload/validation, close on success/error via mutation callbacks

    // Validate required image for image-based models (check both uploaded image and project default)
    if (selectedModelMeta.supportsImage && !selectedModelMeta.supportsKeyframes && !sourceImage && !project?.imageUrl) {
      toast({
        title: "Image required",
        description: `Please upload an image or set a default image in project settings for ${selectedModelMeta.name}`,
        variant: "destructive",
      });
      return;
    }

    // Validate required keyframes for keyframe models
    if (selectedModelMeta.supportsKeyframes && (!firstKeyframe || !lastKeyframe)) {
      toast({
        title: "Keyframes required",
        description: "Please upload both first and last keyframe images",
        variant: "destructive",
      });
      return;
    }

    // Validate custom audio
    if (selectedModelMeta.supportsAudio && audioMode === "custom" && !customAudio) {
      toast({
        title: "Audio required",
        description: "Please upload an audio file when using custom audio mode",
        variant: "destructive",
      });
      return;
    }

    let sourceImageUrl = null;
    let firstKeyframeUrl = null;
    let lastKeyframeUrl = null;
    let audioUrl = null;

    // Use project's default image if no image uploaded
    if (selectedModelMeta.supportsImage && !selectedModelMeta.supportsKeyframes && !sourceImage && project?.imageUrl) {
      sourceImageUrl = project.imageUrl;
    }

    // Upload source image for image-based models (not keyframes)
    if (selectedModelMeta.supportsImage && !selectedModelMeta.supportsKeyframes && sourceImage) {
      let uploadError = null;
      try {
        setIsUploading(true);
        const uploadResponse = await fetch("/api/objects/upload", {
          method: "POST",
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to get upload URL");
        }

        const { uploadURL, publicUrl } = await uploadResponse.json();

        const uploadResult = await fetch(uploadURL, {
          method: "PUT",
          body: sourceImage,
          headers: {
            "Content-Type": sourceImage.type,
          },
        });

        if (!uploadResult.ok) {
          throw new Error("Failed to upload image");
        }

        // Use the public URL served by our server - this is accessible to external APIs
        sourceImageUrl = publicUrl;
      } catch (error: any) {
        uploadError = error;
      } finally {
        setIsUploading(false);
      }

      if (uploadError) {
        toast({
          title: "Upload failed",
          description: uploadError.message || "Failed to upload source image",
          variant: "destructive",
        });
        return;
      }
    }

    // Upload keyframes for keyframe-to-video models
    if (selectedModelMeta.supportsKeyframes && firstKeyframe && lastKeyframe) {
      let uploadError = null;
      try {
        setIsUploading(true);
        
        // Upload first keyframe
        const firstUploadResponse = await fetch("/api/objects/upload", {
          method: "POST",
        });
        if (!firstUploadResponse.ok) {
          throw new Error("Failed to get upload URL for first keyframe");
        }
        const { uploadURL: firstUploadURL, publicUrl: firstPublicUrl } = await firstUploadResponse.json();
        
        const firstUploadResult = await fetch(firstUploadURL, {
          method: "PUT",
          body: firstKeyframe,
          headers: {
            "Content-Type": firstKeyframe.type,
          },
        });
        if (!firstUploadResult.ok) {
          throw new Error("Failed to upload first keyframe");
        }
        firstKeyframeUrl = firstPublicUrl;

        // Upload last keyframe
        const lastUploadResponse = await fetch("/api/objects/upload", {
          method: "POST",
        });
        if (!lastUploadResponse.ok) {
          throw new Error("Failed to get upload URL for last keyframe");
        }
        const { uploadURL: lastUploadURL, publicUrl: lastPublicUrl } = await lastUploadResponse.json();
        
        const lastUploadResult = await fetch(lastUploadURL, {
          method: "PUT",
          body: lastKeyframe,
          headers: {
            "Content-Type": lastKeyframe.type,
          },
        });
        if (!lastUploadResult.ok) {
          throw new Error("Failed to upload last keyframe");
        }
        lastKeyframeUrl = lastPublicUrl;
      } catch (error: any) {
        uploadError = error;
      } finally {
        setIsUploading(false);
      }

      if (uploadError) {
        toast({
          title: "Upload failed",
          description: uploadError.message || "Failed to upload keyframes",
          variant: "destructive",
        });
        return;
      }
    }

    // Upload custom audio if provided
    if (audioMode === "custom" && customAudio) {
      let uploadError = null;
      try {
        setIsUploading(true);
        const uploadResponse = await fetch("/api/objects/upload", {
          method: "POST",
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to get upload URL");
        }

        const { uploadURL, publicUrl } = await uploadResponse.json();

        const uploadResult = await fetch(uploadURL, {
          method: "PUT",
          body: customAudio,
          headers: {
            "Content-Type": customAudio.type,
          },
        });

        if (!uploadResult.ok) {
          throw new Error("Failed to upload audio");
        }

        // Use the public URL served by our server - this is accessible to external APIs
        audioUrl = publicUrl;
      } catch (error: any) {
        uploadError = error;
      } finally {
        setIsUploading(false);
      }

      if (uploadError) {
        toast({
          title: "Upload failed",
          description: uploadError.message || "Failed to upload audio file",
          variant: "destructive",
        });
        return;
      }
    }

    generateMutation.mutate({
      projectId: projectId!,
      name: videoName.trim(),
      prompt: finalPrompt, // Use the combined prompt
      negativePrompt: negativePrompt.trim() || undefined,
      model,
      generationType,
      resolution,
      sourceImageUrl,
      firstKeyframeUrl,
      lastKeyframeUrl,
      audioMode,
      audioUrl: audioUrl || undefined,
    });
  };

  if (!projectId || !project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => setLocation(`/project/${projectId}`)}
          className="mb-6"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to {project.name}
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Generate Video</h1>
          <p className="text-muted-foreground">
            Create AI-generated videos using state-of-the-art models
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <Card className="p-6">
            <div className="space-y-6">
              <div>
                <Label htmlFor="video-name" className="text-sm font-semibold">
                  Video Name
                </Label>
                <Input
                  id="video-name"
                  value={videoName}
                  onChange={(e) => setVideoName(e.target.value)}
                  placeholder="My Amazing Video"
                  className="mt-2"
                  data-testid="input-video-name"
                />
              </div>

              <ModelSelector
                value={model}
                onChange={(value) => setModel(value as ModelType)}
                disabled={generateMutation.isPending || isUploading}
              />

              {selectedModelMeta.supportsImage && !selectedModelMeta.supportsKeyframes && (
                <div>
                  <Label className="text-sm font-semibold mb-2 block">
                    Source Image
                    {project?.imageUrl && !sourceImage && (
                      <span className="text-xs text-muted-foreground font-normal ml-2">
                        (Using project default image)
                      </span>
                    )}
                  </Label>
                  {project?.imageUrl && !sourceImage ? (
                    <div className="space-y-3">
                      <div className="relative rounded-lg overflow-hidden border bg-muted/20">
                        <img 
                          src={project.imageUrl.startsWith('/objects/') 
                            ? `${window.location.origin}${project.imageUrl}` 
                            : project.imageUrl
                          }
                          alt="Project default"
                          className="w-full h-48 object-cover"
                        />
                        <div className="absolute top-2 right-2">
                          <span className="inline-flex items-center gap-1 rounded-md bg-background/90 px-2 py-1 text-xs font-medium backdrop-blur-sm">
                            <Info className="w-3 h-3" />
                            Default
                          </span>
                        </div>
                      </div>
                      <ImageUploader value={sourceImage} onChange={setSourceImage} />
                      <p className="text-xs text-muted-foreground">
                        Upload a different image to override the project default
                      </p>
                    </div>
                  ) : (
                    <ImageUploader value={sourceImage} onChange={setSourceImage} />
                  )}
                </div>
              )}

              {selectedModelMeta.supportsKeyframes && (
                <>
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">
                      First Keyframe
                    </Label>
                    <ImageUploader value={firstKeyframe} onChange={setFirstKeyframe} />
                  </div>

                  <div>
                    <Label className="text-sm font-semibold mb-2 block">
                      Last Keyframe
                    </Label>
                    <ImageUploader value={lastKeyframe} onChange={setLastKeyframe} />
                  </div>
                </>
              )}

              <div className="space-y-3">
                <PromptBuilder
                  value={prompt}
                  onChange={setPrompt}
                  showHelpers={false}
                />
                
                {project?.globalPrompt && (
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium mb-1">Project Global Prompt</p>
                        <p className="text-sm text-muted-foreground break-words">
                          {project.globalPrompt}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          This will be automatically added to your prompt when generating
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="negative-prompt" className="text-sm font-semibold">
                  Negative Prompt (Optional)
                </Label>
                <Textarea
                  id="negative-prompt"
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  placeholder="Describe what you don't want in the video (e.g., blurry, low quality, watermark)"
                  className="mt-2 min-h-[80px]"
                  data-testid="textarea-negative-prompt"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Specify elements to avoid in the generated video
                </p>
              </div>

              {selectedModelMeta.supportsAudio && (
                <>
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">
                      Audio Mode
                    </Label>
                    <Select
                      value={audioMode}
                      onValueChange={(value) => setAudioMode(value as AudioMode)}
                    >
                      <SelectTrigger data-testid="select-audio-mode">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto (AI-generated)</SelectItem>
                        <SelectItem value="custom">Custom Audio</SelectItem>
                        <SelectItem value="silent">Silent (No audio)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {audioMode === "custom" && (
                    <div>
                      <Label className="text-sm font-semibold mb-2 block">
                        Custom Audio File
                      </Label>
                      <Input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => setCustomAudio(e.target.files?.[0] || null)}
                        data-testid="input-custom-audio"
                      />
                      {customAudio && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Selected: {customAudio.name}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}

              <ResolutionSelector
                selectedResolution={resolution}
                onResolutionChange={setResolution}
              />
            </div>
          </Card>

          <div className="flex items-center justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation(`/project/${projectId}`)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="lg"
              disabled={generateMutation.isPending || isUploading}
              data-testid="button-submit-generation"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Uploading image...
                </>
              ) : generateMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Video
                </>
              )}
            </Button>
          </div>
        </form>

        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="max-w-2xl" data-testid="dialog-confirm-generation">
            <DialogHeader>
              <DialogTitle>Confirm Video Generation</DialogTitle>
              <DialogDescription>
                Review the complete prompt before generating your video
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-sm font-semibold">Video Name</Label>
                <p className="text-sm mt-1">{videoName}</p>
              </div>

              <div>
                <Label className="text-sm font-semibold">Model</Label>
                <p className="text-sm mt-1">{selectedModelMeta.name}</p>
              </div>

              <div>
                <Label className="text-sm font-semibold">Complete Prompt</Label>
                <div className="mt-2 rounded-lg border bg-muted/50 p-4">
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {finalPrompt}
                  </p>
                </div>
                {project?.globalPrompt && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Combined: Your prompt + Global prompt
                  </p>
                )}
              </div>

              {negativePrompt && (
                <div>
                  <Label className="text-sm font-semibold">Negative Prompt</Label>
                  <p className="text-sm text-muted-foreground mt-1 break-words">
                    {negativePrompt}
                  </p>
                </div>
              )}

              <div>
                <Label className="text-sm font-semibold">Resolution</Label>
                <p className="text-sm mt-1">{resolution}</p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
                data-testid="button-cancel-generation"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmGeneration}
                disabled={generateMutation.isPending || isUploading}
                data-testid="button-confirm-generation"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : generateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Confirm & Generate
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
