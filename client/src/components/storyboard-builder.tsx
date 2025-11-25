import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, X, RefreshCw, Loader2, Check, Upload, Download, Save, Eye, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Storyboard, StoryboardImage } from "@shared/schema";

const RESOLUTION_OPTIONS = [
  { label: "1:1 (1024×1024)", value: "1024*1024" },
  { label: "1:1 (1280×1280)", value: "1280*1280" },
  { label: "2:3 (800×1200)", value: "800*1200" },
  { label: "3:2 (1200×800)", value: "1200*800" },
  { label: "3:4 (960×1280)", value: "960*1280" },
  { label: "4:3 (1280×960)", value: "1280*960" },
  { label: "9:16 (720×1280)", value: "720*1280" },
  { label: "16:9 (1280×720)", value: "1280*720" },
  { label: "21:9 (1344×576)", value: "1344*576" },
  { label: "YouTube Thumb HD (1280×720)", value: "1280*720" },
];

interface GeneratedImageWithPrompt {
  prompt: string;
  sourceImages: string[];
  generatedImageUrl: string;
  order: number;
}

interface StoryboardPrompt {
  id: string;
  text: string;
  sourceImages: string[]; // Source image URLs for I2I
  generatedImages: GeneratedImageWithPrompt[]; // Generated images with metadata
  isGenerating: boolean;
}

type StoryboardWithImages = Storyboard & { images: StoryboardImage[] };

interface StoryboardBuilderProps {
  onComplete: (prompts: StoryboardPrompt[]) => void;
  onCancel: () => void;
  projectGlobalPrompt?: string;
  generationType: "t2i" | "i2i";
  projectId: string;
  existingStoryboard?: StoryboardWithImages;
}

export function StoryboardBuilder({ onComplete, onCancel, projectGlobalPrompt, generationType, projectId, existingStoryboard }: StoryboardBuilderProps) {
  const [prompts, setPrompts] = useState<StoryboardPrompt[]>([
    { id: "1", text: "", sourceImages: [], generatedImages: [], isGenerating: false },
  ]);
  const { toast } = useToast();
  const [selectedPromptId, setSelectedPromptId] = useState<string>("1");
  const [selectedResolution, setSelectedResolution] = useState<string>("1024*1024");
  const [storyboardName, setStoryboardName] = useState<string>("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  
  // Progress tracking state
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  
  // Image viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerImage, setViewerImage] = useState<GeneratedImageWithPrompt | null>(null);

  // Track edit mode
  const isEditMode = !!existingStoryboard;

  // Safe JSON parse helper
  const safeParseJson = (jsonString: string | null): string[] => {
    if (!jsonString) return [];
    try {
      const parsed = JSON.parse(jsonString);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  // Load existing storyboard data when in edit mode
  useEffect(() => {
    if (existingStoryboard && existingStoryboard.images) {
      setStoryboardName(existingStoryboard.name);
      
      // Sort images by order field to maintain proper sequencing
      const sortedImages = [...existingStoryboard.images].sort((a, b) => a.order - b.order);
      
      // Group images by prompt text (or create one prompt with all images if same prompt)
      const imagesByPrompt = new Map<string, StoryboardImage[]>();
      sortedImages.forEach(img => {
        const key = img.prompt;
        if (!imagesByPrompt.has(key)) {
          imagesByPrompt.set(key, []);
        }
        imagesByPrompt.get(key)!.push(img);
      });

      // Create prompts from grouped images
      const loadedPrompts: StoryboardPrompt[] = [];
      let promptId = 1;
      
      imagesByPrompt.forEach((images, promptText) => {
        const sourceImages = safeParseJson(images[0].sourceImages);
        
        loadedPrompts.push({
          id: String(promptId),
          text: promptText,
          sourceImages,
          generatedImages: images.map((img) => ({
            prompt: img.prompt,
            sourceImages: safeParseJson(img.sourceImages),
            generatedImageUrl: img.generatedImageUrl,
            order: img.order,
          })),
          isGenerating: false,
        });
        promptId++;
      });

      // If no images exist yet, add an empty prompt
      if (loadedPrompts.length === 0) {
        loadedPrompts.push({
          id: "1",
          text: "",
          sourceImages: [],
          generatedImages: [],
          isGenerating: false,
        });
      }

      setPrompts(loadedPrompts);
      setSelectedPromptId(loadedPrompts[0].id);
    }
  }, [existingStoryboard]);

  const addPrompt = () => {
    const newId = (Math.max(...prompts.map(p => parseInt(p.id) || 0)) + 1).toString();
    setPrompts([...prompts, { id: newId, text: "", sourceImages: [], generatedImages: [], isGenerating: false }]);
    setSelectedPromptId(newId);
  };

  const removePrompt = (id: string) => {
    if (prompts.length === 1) {
      toast({
        title: "Cannot remove",
        description: "At least one prompt is required",
        variant: "destructive",
      });
      return;
    }
    const filtered = prompts.filter(p => p.id !== id);
    setPrompts(filtered);
    if (selectedPromptId === id) {
      setSelectedPromptId(filtered[0].id);
    }
  };

  const updatePromptText = (id: string, text: string) => {
    setPrompts(prompts.map(p => p.id === id ? { ...p, text } : p));
  };

  const addSourceImage = (promptId: string, imageUrl: string) => {
    setPrompts(prompts.map(p => 
      p.id === promptId 
        ? { ...p, sourceImages: [...p.sourceImages, imageUrl] }
        : p
    ));
  };

  const removeSourceImage = (promptId: string, imageUrl: string) => {
    setPrompts(prompts.map(p => 
      p.id === promptId 
        ? { ...p, sourceImages: p.sourceImages.filter(img => img !== imageUrl) }
        : p
    ));
  };

  const uploadImageToStorage = async (file: File): Promise<string> => {
    // Get upload URL from server
    const uploadResponse = await fetch("/api/objects/upload", {
      method: "POST",
    });

    if (!uploadResponse.ok) {
      throw new Error("Failed to get upload URL");
    }

    const { uploadURL, publicUrl } = await uploadResponse.json();

    // Upload file to storage
    const uploadResult = await fetch(uploadURL, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });

    if (!uploadResult.ok) {
      throw new Error("Failed to upload image");
    }

    return publicUrl;
  };

  const handleImageUpload = async (promptId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingImage(true);
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const publicUrl = await uploadImageToStorage(file);
        addSourceImage(promptId, publicUrl);
      }
      toast({
        title: "Images uploaded",
        description: `Successfully uploaded ${files.length} image(s)`,
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImage(false);
      // Reset the input so the same file can be selected again
      event.target.value = "";
    }
  };

  // Poll for task status
  const pollTaskStatus = useCallback(async (taskId: string): Promise<{ status: string; progress: number; imageUrl?: string; error?: string }> => {
    const res = await fetch(`/api/generate/task/${taskId}`);
    if (!res.ok) {
      throw new Error("Failed to check task status");
    }
    return res.json();
  }, []);

  const generateImage = async (promptId: string) => {
    const prompt = prompts.find(p => p.id === promptId);
    if (!prompt || !prompt.text.trim()) {
      toast({
        title: "Empty prompt",
        description: "Please enter a prompt before generating",
        variant: "destructive",
      });
      return;
    }

    if (generationType === "i2i" && prompt.sourceImages.length === 0) {
      toast({
        title: "Missing images",
        description: "Please upload at least one image for image-to-image generation",
        variant: "destructive",
      });
      return;
    }

    setPrompts(prompts.map(p => p.id === promptId ? { ...p, isGenerating: true } : p));
    setGenerationProgress(5);

    try {
      // Combine with global prompt if available
      const fullPrompt = projectGlobalPrompt 
        ? `${prompt.text} ${projectGlobalPrompt}`
        : prompt.text;

      // Start the generation task
      const endpoint = generationType === "t2i" 
        ? "/api/generate/text-to-image/start" 
        : "/api/generate/image-to-image/start";
      
      const startRes = await apiRequest("POST", endpoint, {
        prompt: fullPrompt,
        imageUrls: generationType === "i2i" ? prompt.sourceImages : undefined,
        size: selectedResolution,
      });
      
      const { taskId } = await startRes.json();
      setCurrentTaskId(taskId);
      setGenerationProgress(10);

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 120; // 2 minutes at 1 second intervals
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const status = await pollTaskStatus(taskId);
        setGenerationProgress(status.progress);
        
        if (status.status === "completed" && status.imageUrl) {
          const newImage: GeneratedImageWithPrompt = {
            prompt: fullPrompt,
            sourceImages: generationType === "i2i" ? prompt.sourceImages : [],
            generatedImageUrl: status.imageUrl,
            order: prompt.generatedImages.length,
          };

          setPrompts(prev => prev.map(p => 
            p.id === promptId 
              ? { ...p, generatedImages: [newImage, ...p.generatedImages], isGenerating: false }
              : p
          ));

          // Show the generated image in viewer
          setViewerImage(newImage);
          setViewerOpen(true);

          toast({
            title: "Image generated successfully!",
            description: "Click to view and download your image",
          });
          
          setCurrentTaskId(null);
          setGenerationProgress(0);
          return;
        } else if (status.status === "failed") {
          throw new Error(status.error || "Image generation failed");
        }
        
        attempts++;
      }

      throw new Error("Generation timed out");
    } catch (error) {
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate preview image",
        variant: "destructive",
      });
      setCurrentTaskId(null);
      setGenerationProgress(0);
    } finally {
      setPrompts(prev => prev.map(p => p.id === promptId ? { ...p, isGenerating: false } : p));
    }
  };

  // Download image helper - uses server proxy to avoid CORS issues
  const downloadImage = (imageUrl: string, filename: string) => {
    try {
      // Use the server proxy endpoint for downloading
      const downloadUrl = `/api/objects/download?url=${encodeURIComponent(imageUrl)}&filename=${encodeURIComponent(filename)}`;
      
      // Create a link and trigger download
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast({
        title: "Download started",
        description: "Your image is being downloaded",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to download image",
        variant: "destructive",
      });
    }
  };

  const saveStoryboardMutation = useMutation({
    mutationFn: async () => {
      if (!storyboardName.trim()) {
        throw new Error("Please enter a storyboard name");
      }

      setIsSaving(true);

      let storyboardId: string;

      if (isEditMode && existingStoryboard) {
        // In edit mode, use existing storyboard ID
        storyboardId = existingStoryboard.id;
        
        // Get existing image URLs to avoid duplicates
        const existingImageUrls = new Set(existingStoryboard.images.map(img => img.generatedImageUrl));
        
        // Calculate next order based on max existing order + 1 (not array length)
        const maxExistingOrder = existingStoryboard.images.length > 0 
          ? Math.max(...existingStoryboard.images.map(img => img.order))
          : -1;
        let nextOrder = maxExistingOrder + 1;
        
        // Only add new images that don't already exist
        for (const prompt of prompts) {
          for (const img of prompt.generatedImages) {
            if (!existingImageUrls.has(img.generatedImageUrl)) {
              await apiRequest("POST", `/api/storyboards/${storyboardId}/images`, {
                prompt: img.prompt,
                sourceImages: img.sourceImages.length > 0 ? img.sourceImages : null,
                generatedImageUrl: img.generatedImageUrl,
                order: nextOrder,
              });
              nextOrder++;
            }
          }
        }

        toast({
          title: "Storyboard updated",
          description: `"${storyboardName}" has been updated with new images`,
        });
      } else {
        // Create new storyboard
        const storyboardRes = await apiRequest("POST", "/api/storyboards", {
          projectId,
          name: storyboardName,
          generationType,
        });
        const storyboardData = await storyboardRes.json();
        storyboardId = storyboardData.storyboard.id;

        // Save all generated images
        let order = 0;
        for (const prompt of prompts) {
          for (const img of prompt.generatedImages) {
            await apiRequest("POST", `/api/storyboards/${storyboardId}/images`, {
              prompt: img.prompt,
              sourceImages: img.sourceImages.length > 0 ? img.sourceImages : null,
              generatedImageUrl: img.generatedImageUrl,
              order,
            });
            order++;
          }
        }

        toast({
          title: "Storyboard saved",
          description: `"${storyboardName}" has been saved successfully`,
        });
      }

      setShowSaveDialog(false);
      setIsSaving(false);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "storyboards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/storyboards", storyboardId] });

      return storyboardId;
    },
    onError: (error) => {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save storyboard",
        variant: "destructive",
      });
      setIsSaving(false);
    },
  });

  const selectedPrompt = prompts.find(p => p.id === selectedPromptId);
  const totalGeneratedImages = prompts.reduce((sum, p) => sum + p.generatedImages.length, 0);
  const existingImagesCount = existingStoryboard?.images.length || 0;
  const newImagesCount = totalGeneratedImages - existingImagesCount;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">{isEditMode ? "Edit Storyboard" : "Create Storyboard"}</h2>
        <p className="text-muted-foreground">
          {isEditMode 
            ? "Add more prompts and generate additional preview images" 
            : "Add multiple prompts and generate preview images before creating the final video"}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Prompts List */}
        <div className="lg:col-span-1 space-y-2">
          <div className="flex items-center justify-between mb-4">
            <Label className="text-base font-semibold">Prompts</Label>
            <Button
              size="sm"
              variant="outline"
              onClick={addPrompt}
              data-testid="button-add-prompt"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add More
            </Button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {prompts.map((prompt, idx) => (
              <Card
                key={prompt.id}
                className={`p-3 cursor-pointer transition-colors ${
                  selectedPromptId === prompt.id
                    ? "bg-primary/10 border-primary"
                    : "hover-elevate"
                }`}
                onClick={() => setSelectedPromptId(prompt.id)}
                data-testid={`card-prompt-${prompt.id}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Badge variant="secondary">{idx + 1}</Badge>
                  {prompts.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 w-5 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePrompt(prompt.id);
                      }}
                      data-testid={`button-remove-prompt-${prompt.id}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{prompt.text || "No text yet"}</p>
                {prompt.generatedImages.length > 0 && (
                  <div className="mt-2 flex gap-1">
                    <Badge variant="outline" className="text-xs">
                      {prompt.generatedImages.length} version{prompt.generatedImages.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* Editor and Preview */}
        <div className="lg:col-span-2 space-y-4">
          {selectedPrompt && (
            <>
              <Card className="p-4 space-y-4">
                {/* Resolution Selector */}
                <div className="space-y-2">
                  <Label htmlFor="resolution-select">Resolution</Label>
                  <Select value={selectedResolution} onValueChange={setSelectedResolution}>
                    <SelectTrigger id="resolution-select" data-testid="select-resolution">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RESOLUTION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} data-testid={`option-resolution-${opt.value}`}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Source Images Section (for I2I only) */}
                {generationType === "i2i" && (
                  <div className="space-y-2">
                    <Label>Source Images</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-4">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => handleImageUpload(selectedPrompt.id, e)}
                        className="hidden"
                        id={`file-upload-${selectedPrompt.id}`}
                        disabled={isUploadingImage}
                      />
                      <label 
                        htmlFor={`file-upload-${selectedPrompt.id}`}
                        className={`flex flex-col items-center justify-center ${isUploadingImage ? 'cursor-wait opacity-50' : 'cursor-pointer'}`}
                      >
                        {isUploadingImage ? (
                          <>
                            <Loader2 className="w-6 h-6 text-muted-foreground mb-2 animate-spin" />
                            <span className="text-sm text-muted-foreground">Uploading images...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                            <span className="text-sm text-muted-foreground">Click to upload images</span>
                          </>
                        )}
                      </label>
                    </div>
                    {selectedPrompt.sourceImages.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {selectedPrompt.sourceImages.map((img, idx) => (
                          <div key={idx} className="relative aspect-square rounded border border-border overflow-hidden bg-muted">
                            <img
                              src={img}
                              alt={`Source ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              onClick={() => removeSourceImage(selectedPrompt.id, img)}
                              className="absolute top-1 right-1 bg-background/80 backdrop-blur-sm rounded p-1 hover:bg-background"
                              data-testid={`button-remove-source-${selectedPrompt.id}-${idx}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Prompt Text</Label>
                  <Textarea
                    value={selectedPrompt.text}
                    onChange={(e) => updatePromptText(selectedPrompt.id, e.target.value)}
                    placeholder={generationType === "t2i" ? "Describe the image you want to generate..." : "Describe what you want to change in the images..."}
                    className="min-h-24"
                    data-testid={`input-prompt-${selectedPrompt.id}`}
                  />
                  {projectGlobalPrompt && (
                    <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                      <strong>Global prompt:</strong> {projectGlobalPrompt}
                    </p>
                  )}
                </div>

                <Button
                  onClick={() => generateImage(selectedPrompt.id)}
                  disabled={selectedPrompt.isGenerating || isUploadingImage || !selectedPrompt.text.trim() || (generationType === "i2i" && selectedPrompt.sourceImages.length === 0)}
                  className="w-full"
                  data-testid={`button-generate-${selectedPrompt.id}`}
                >
                  {selectedPrompt.isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating... {generationProgress}%
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Generate Preview Image
                    </>
                  )}
                </Button>
                
                {/* Progress Bar */}
                {selectedPrompt.isGenerating && (
                  <div className="space-y-2">
                    <Progress value={generationProgress} className="w-full h-2" />
                    <p className="text-xs text-center text-muted-foreground">
                      {generationProgress < 20 ? "Starting generation..." : 
                       generationProgress < 50 ? "Processing your request..." : 
                       generationProgress < 80 ? "Creating your image..." : 
                       generationProgress < 100 ? "Almost there..." : "Completed!"}
                    </p>
                  </div>
                )}
              </Card>

              {/* Generated Images Preview - Side by Side with Prompts */}
              {selectedPrompt.generatedImages.length > 0 && (
                <Card className="p-4 space-y-4">
                  <Label className="mb-3 block">Generated Images ({selectedPrompt.generatedImages.length})</Label>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {selectedPrompt.generatedImages.map((img, idx) => (
                      <div 
                        key={idx}
                        className="p-3 border border-border rounded-lg space-y-2"
                        data-testid={`image-preview-${selectedPrompt.id}-${idx}`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <Badge variant="secondary">v{idx + 1}</Badge>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setViewerImage(img);
                                setViewerOpen(true);
                              }}
                              data-testid={`button-view-image-${selectedPrompt.id}-${idx}`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => downloadImage(img.generatedImageUrl, `generated-${idx + 1}.png`)}
                              data-testid={`button-download-image-${selectedPrompt.id}-${idx}`}
                            >
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div 
                          className="flex gap-3 cursor-pointer hover:bg-muted/50 rounded p-1 -m-1 transition-colors"
                          onClick={() => {
                            setViewerImage(img);
                            setViewerOpen(true);
                          }}
                        >
                          <div className="flex-1">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Prompt:</p>
                            <p className="text-sm break-words whitespace-normal">{img.prompt}</p>
                          </div>
                          <img
                            src={img.generatedImageUrl}
                            alt={`Generated ${idx + 1}`}
                            className="w-24 h-24 rounded border border-border object-cover"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <Card className="p-4 space-y-4 border-2 border-primary/20">
          <h3 className="font-semibold">{isEditMode ? "Update Storyboard" : "Save Storyboard"}</h3>
          <div>
            <Label htmlFor="storyboard-name" className="text-sm mb-2 block">Storyboard Name</Label>
            <Input
              id="storyboard-name"
              placeholder="e.g., Summer Vacation Story"
              value={storyboardName}
              onChange={(e) => setStoryboardName(e.target.value)}
              disabled={isEditMode}
              data-testid="input-storyboard-name"
            />
          </div>
          {isEditMode && newImagesCount > 0 && (
            <p className="text-sm text-muted-foreground">
              Adding {newImagesCount} new image{newImagesCount !== 1 ? "s" : ""} to this storyboard.
            </p>
          )}
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowSaveDialog(false)}
              data-testid="button-cancel-save"
            >
              Cancel
            </Button>
            <Button
              onClick={() => saveStoryboardMutation.mutate()}
              disabled={isSaving || !storyboardName.trim() || (isEditMode ? newImagesCount === 0 : totalGeneratedImages === 0)}
              data-testid="button-confirm-save"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isEditMode ? "Updating..." : "Saving..."}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {isEditMode ? "Update Storyboard" : "Save Storyboard"}
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          variant="outline"
          onClick={onCancel}
          data-testid="button-cancel-storyboard"
        >
          {isEditMode ? "Back" : "Cancel"}
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowSaveDialog(true)}
          disabled={(isEditMode ? newImagesCount === 0 : totalGeneratedImages === 0) || showSaveDialog}
          data-testid="button-save-storyboard"
        >
          <Save className="w-4 h-4 mr-2" />
          {isEditMode ? "Save New Images" : "Save for Later"}
        </Button>
        <Button
          onClick={() => onComplete(prompts)}
          disabled={prompts.some(p => !p.text.trim()) || totalGeneratedImages === 0}
          data-testid="button-complete-storyboard"
        >
          <Check className="w-4 h-4 mr-2" />
          Continue to Video Generation
        </Button>
      </div>

      {/* Image Viewer Dialog */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Generated Image
            </DialogTitle>
          </DialogHeader>
          
          {viewerImage && (
            <div className="space-y-4">
              {/* Full size image */}
              <div className="relative bg-muted rounded-lg overflow-hidden">
                <img
                  src={viewerImage.generatedImageUrl}
                  alt="Generated"
                  className="w-full h-auto max-h-[60vh] object-contain"
                  data-testid="viewer-image"
                />
              </div>
              
              {/* Prompt info */}
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-xs font-medium text-muted-foreground mb-1">Prompt used:</p>
                <p className="text-sm">{viewerImage.prompt}</p>
              </div>
              
              {/* Action buttons */}
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => window.open(viewerImage.generatedImageUrl, '_blank')}
                  data-testid="button-open-new-tab"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in New Tab
                </Button>
                <Button
                  onClick={() => downloadImage(viewerImage.generatedImageUrl, `generated-image-${Date.now()}.png`)}
                  data-testid="button-download-viewer"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Image
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
