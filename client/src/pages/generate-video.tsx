import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Project, ModelType, GenerationType, InsertVideo } from "@shared/schema";
import { ResolutionSelector } from "@/components/resolution-selector";
import { PromptBuilder } from "@/components/prompt-builder";
import { ImageUploader } from "@/components/image-uploader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function GenerateVideo() {
  const [, params] = useRoute("/project/:id/generate");
  const [, setLocation] = useLocation();
  const projectId = params?.id;
  const { toast } = useToast();

  const [model] = useState<ModelType>("wan2.5");
  const [generationType, setGenerationType] = useState<GenerationType>("text-to-video");
  const [videoName, setVideoName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [resolution, setResolution] = useState("1920x1080");
  const [sourceImage, setSourceImage] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: project } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

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

    let sourceImageUrl = null;

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

        const url = new URL(uploadURL);
        sourceImageUrl = url.pathname;
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

    generateMutation.mutate({
      projectId,
      name: videoName.trim(),
      prompt: prompt.trim(),
      model,
      generationType,
      resolution,
      sourceImageUrl,
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
                onValueChange={(value) => setGenerationType(value as GenerationType)}
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
