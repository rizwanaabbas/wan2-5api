import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, X, RefreshCw, Loader2, Check, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface StoryboardPrompt {
  id: string;
  text: string;
  sourceImages: string[]; // Source image URLs for I2I
  generatedImages: string[]; // Generated image URLs
  isGenerating: boolean;
}

interface StoryboardBuilderProps {
  onComplete: (prompts: StoryboardPrompt[]) => void;
  onCancel: () => void;
  projectGlobalPrompt?: string;
  generationType: "t2i" | "i2i";
}

export function StoryboardBuilder({ onComplete, onCancel, projectGlobalPrompt, generationType }: StoryboardBuilderProps) {
  const [prompts, setPrompts] = useState<StoryboardPrompt[]>([
    { id: "1", text: "", sourceImages: [], generatedImages: [], isGenerating: false },
  ]);
  const { toast } = useToast();
  const [selectedPromptId, setSelectedPromptId] = useState<string>("1");

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

  const handleImageUpload = (promptId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          addSourceImage(promptId, e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const generateImageMutation = useMutation({
    mutationFn: async (params: { type: "t2i" | "i2i"; prompt: string; imageUrls?: string[] }) => {
      if (params.type === "t2i") {
        const res = await apiRequest("POST", "/api/generate/text-to-image", {
          prompt: params.prompt,
          size: "1024*1024",
        });
        const data = await res.json();
        return { imageUrl: data.imageUrl };
      } else {
        const res = await apiRequest("POST", "/api/generate/image-to-image", {
          prompt: params.prompt,
          imageUrls: params.imageUrls,
          size: "1024*1024",
        });
        const data = await res.json();
        return { imageUrl: data.imageUrl };
      }
    },
  });

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

    try {
      // Combine with global prompt if available
      const fullPrompt = projectGlobalPrompt 
        ? `${prompt.text} ${projectGlobalPrompt}`
        : prompt.text;

      const result = await generateImageMutation.mutateAsync({
        type: generationType,
        prompt: fullPrompt,
        imageUrls: generationType === "i2i" ? prompt.sourceImages : undefined,
      });
      
      setPrompts(prompts.map(p => 
        p.id === promptId 
          ? { ...p, generatedImages: [result.imageUrl, ...p.generatedImages], isGenerating: false }
          : p
      ));

      toast({
        title: "Image generated",
        description: "Preview image added to this prompt",
      });
    } catch (error) {
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate preview image",
        variant: "destructive",
      });
    } finally {
      setPrompts(prompts.map(p => p.id === promptId ? { ...p, isGenerating: false } : p));
    }
  };

  const selectedPrompt = prompts.find(p => p.id === selectedPromptId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Create Storyboard</h2>
        <p className="text-muted-foreground">Add multiple prompts and generate preview images before creating the final video</p>
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
                      />
                      <label 
                        htmlFor={`file-upload-${selectedPrompt.id}`}
                        className="flex flex-col items-center justify-center cursor-pointer"
                      >
                        <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">Click to upload images</span>
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
                  disabled={selectedPrompt.isGenerating || !selectedPrompt.text.trim() || (generationType === "i2i" && selectedPrompt.sourceImages.length === 0)}
                  className="w-full"
                  data-testid={`button-generate-${selectedPrompt.id}`}
                >
                  {selectedPrompt.isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Preview...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Generate Preview Image
                    </>
                  )}
                </Button>
              </Card>

              {/* Generated Images Preview */}
              {selectedPrompt.generatedImages.length > 0 && (
                <Card className="p-4">
                  <Label className="mb-3 block">Generated Versions</Label>
                  <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                    {selectedPrompt.generatedImages.map((imageUrl, idx) => (
                      <div
                        key={idx}
                        className="aspect-square rounded border border-border overflow-hidden bg-muted hover-elevate"
                        data-testid={`image-preview-${selectedPrompt.id}-${idx}`}
                      >
                        <img
                          src={imageUrl}
                          alt={`Version ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs">
                          v{idx + 1}
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

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          variant="outline"
          onClick={onCancel}
          data-testid="button-cancel-storyboard"
        >
          Cancel
        </Button>
        <Button
          onClick={() => onComplete(prompts)}
          disabled={prompts.some(p => !p.text.trim())}
          data-testid="button-complete-storyboard"
        >
          <Check className="w-4 h-4 mr-2" />
          Continue to Video Generation
        </Button>
      </div>
    </div>
  );
}
