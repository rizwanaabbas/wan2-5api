import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Project, ModelType, GenerationType, InsertVideo, AudioMode } from "@shared/schema";
import { ResolutionSelector } from "@/components/resolution-selector";
import { PromptBuilder } from "@/components/prompt-builder";
import { ImageUploader } from "@/components/image-uploader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function GenerateVideo() {
  const [, params] = useRoute("/project/:id/generate");
  const [, setLocation] = useLocation();
  const projectId = params?.id;
  const { toast } = useToast();

  const [generationType, setGenerationType] = useState<GenerationType>("text-to-video");
  const [model, setModel] = useState<ModelType>("wan2.5-t2v-preview");
  const [videoName, setVideoName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [resolution, setResolution] = useState("1920x1080");
  const [sourceImage, setSourceImage] = useState<File | null>(null);
  const [audioMode, setAudioMode] = useState<AudioMode>("auto");
  const [customAudio, setCustomAudio] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: project } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  // Update model when generation type changes
  const handleGenerationTypeChange = (type: GenerationType) => {
    setGenerationType(type);
    if (type === "text-to-video") {
      setModel("wan2.5-t2v-preview");
    } else {
      setModel("wan2.5-i2v-preview");
    }
  };

  const generateMutation = useMutation({
    mutationFn: async (data: InsertVideo) => {
      return apiRequest("POST", "/api/videos", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos", projectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      toast({
        title: "Video generation started",
        description: "Your video is being generated. This may take a few minutes.",
      });
      setLocation(`/project/${projectId}`);
    },
    onError: (error: any) => {
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

    if (generationType === "image-to-video" && !sourceImage) {
      toast({
        title: "Image required",
        description: "Please upload an image for image-to-video generation",
        variant: "destructive",
      });
      return;
    }

    if (audioMode === "custom" && !customAudio) {
      toast({
        title: "Audio required",
        description: "Please upload an audio file when using custom audio mode",
        variant: "destructive",
      });
      return;
    }

    let sourceImageUrl = null;
    let audioUrl = null;

    if (generationType === "image-to-video" && sourceImage) {
      let uploadError = null;
      try {
        setIsUploading(true);
        const uploadResponse = await fetch("/api/objects/upload", {
          method: "POST",
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to get upload URL");
        }

        const { uploadURL } = await uploadResponse.json();

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

        // Use the full uploadURL without query parameters for Wan API
        const url = new URL(uploadURL);
        sourceImageUrl = `${url.origin}${url.pathname}`;
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

        const { uploadURL } = await uploadResponse.json();

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

        // Use the full uploadURL without query parameters for Wan API
        const url = new URL(uploadURL);
        audioUrl = `${url.origin}${url.pathname}`;
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
      projectId,
      name: videoName.trim(),
      prompt: prompt.trim(),
      negativePrompt: negativePrompt.trim() || undefined,
      model,
      generationType,
      resolution,
      sourceImageUrl,
      audioMode,
      audioUrl,
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

              <Tabs
                value={generationType}
                onValueChange={(value) => handleGenerationTypeChange(value as GenerationType)}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="text-to-video" data-testid="tab-text-to-video">
                    Text to Video
                  </TabsTrigger>
                  <TabsTrigger value="image-to-video" data-testid="tab-image-to-video">
                    Image to Video
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="text-to-video" className="mt-6">
                  <PromptBuilder
                    value={prompt}
                    onChange={setPrompt}
                    showHelpers={false}
                  />
                </TabsContent>

                <TabsContent value="image-to-video" className="mt-6 space-y-6">
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">
                      Model
                    </Label>
                    <Select
                      value={model}
                      onValueChange={(value) => setModel(value as ModelType)}
                    >
                      <SelectTrigger data-testid="select-model">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="wan2.5-i2v-preview">
                          Wan 2.5 I2V (duration control)
                        </SelectItem>
                        <SelectItem value="wan2.2-i2v-plus">
                          Wan 2.2 I2V Plus (no duration control)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold mb-2 block">
                      Source Image
                    </Label>
                    <ImageUploader value={sourceImage} onChange={setSourceImage} />
                  </div>

                  <PromptBuilder
                    value={prompt}
                    onChange={setPrompt}
                    showHelpers={false}
                  />
                </TabsContent>
              </Tabs>

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
      </div>
    </div>
  );
}
