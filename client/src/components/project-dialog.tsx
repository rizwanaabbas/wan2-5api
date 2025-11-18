import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Project } from "@shared/schema";
import { ModelSelector } from "@/components/model-selector";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string, globalPrompt?: string, imageUrl?: string, defaultModel?: string) => void;
  project?: Project | null;
  mode: "create" | "rename";
}

export function ProjectDialog({
  open,
  onClose,
  onSubmit,
  project,
  mode,
}: ProjectDialogProps) {
  const [name, setName] = useState("");
  const [globalPrompt, setGlobalPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [defaultModel, setDefaultModel] = useState<string | undefined>();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setName(project?.name || "");
      setGlobalPrompt(project?.globalPrompt || "");
      setImageUrl(project?.imageUrl || undefined);
      setDefaultModel(project?.defaultModel || undefined);
      setImageFile(null);
    }
  }, [open, project]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }
      setImageFile(file);
      setImageUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImageUrl(undefined);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let finalImageUrl = imageUrl;

    // Upload new image if selected
    if (imageFile) {
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
          body: imageFile,
          headers: {
            "Content-Type": imageFile.type,
          },
        });

        if (!uploadResult.ok) {
          throw new Error("Failed to upload image");
        }

        finalImageUrl = publicUrl;
      } catch (error: any) {
        toast({
          title: "Upload failed",
          description: error.message || "Failed to upload image",
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    onSubmit(name.trim(), globalPrompt.trim() || undefined, finalImageUrl, defaultModel);
    setName("");
    setGlobalPrompt("");
    setImageUrl(undefined);
    setDefaultModel(undefined);
    setImageFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent data-testid={`dialog-${mode}-project`}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {mode === "create" ? "Create New Project" : "Rename Project"}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Awesome Video Project"
                className="mt-2"
                autoFocus
                data-testid="input-project-name"
              />
            </div>

            <div>
              <Label htmlFor="global-prompt">
                Global Prompt (Optional)
                <span className="text-xs text-muted-foreground ml-2">
                  Prepended to all video prompts in this project
                </span>
              </Label>
              <Textarea
                id="global-prompt"
                value={globalPrompt}
                onChange={(e) => setGlobalPrompt(e.target.value)}
                placeholder="e.g., Cinematic style with dramatic lighting..."
                className="mt-2"
                rows={3}
                data-testid="textarea-global-prompt"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This will be automatically added before every video prompt in this project
              </p>
            </div>

            <div>
              <Label htmlFor="project-image">
                Default Image (Optional)
                <span className="text-xs text-muted-foreground ml-2">
                  Used as default for image-based models
                </span>
              </Label>
              <div className="mt-2">
                {imageUrl ? (
                  <div className="relative rounded-md border overflow-hidden">
                    <img 
                      src={imageUrl} 
                      alt="Project default" 
                      className="w-full h-48 object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={handleRemoveImage}
                      data-testid="button-remove-image"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label
                    htmlFor="project-image"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-md cursor-pointer hover-elevate"
                    data-testid="label-upload-image"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload image
                      </p>
                    </div>
                    <input
                      id="project-image"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageChange}
                      data-testid="input-project-image"
                    />
                  </label>
                )}
              </div>
            </div>

            <div>
              <Label>
                Default Model (Optional)
                <span className="text-xs text-muted-foreground ml-2">
                  Pre-select model for video generation
                </span>
              </Label>
              <div className="mt-2">
                <ModelSelector
                  value={defaultModel || ""}
                  onChange={setDefaultModel}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              data-testid="button-cancel"
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || isUploading}
              data-testid="button-submit"
            >
              {isUploading ? "Uploading..." : mode === "create" ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
