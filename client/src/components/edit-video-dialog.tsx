import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Video } from "@shared/schema";
import { Info } from "lucide-react";

interface EditVideoDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (prompt: string) => void;
  video: Video | null;
  isPending?: boolean;
}

export function EditVideoDialog({
  open,
  onClose,
  onSubmit,
  video,
  isPending = false,
}: EditVideoDialogProps) {
  const [prompt, setPrompt] = useState("");

  useEffect(() => {
    if (open && video) {
      setPrompt(video.prompt);
    }
  }, [open, video]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isPending) {
      onSubmit(prompt.trim());
    }
  };

  const handleClose = () => {
    if (!isPending) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent data-testid="dialog-edit-video">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit & Regenerate Video</DialogTitle>
            <DialogDescription>
              Modify the prompt to regenerate the video. All other settings will remain the same.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="p-3 bg-muted rounded-md space-y-2">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium mb-1">Current Settings (unchanged)</p>
                  <div className="space-y-1">
                    <p>Model: <Badge variant="outline" className="ml-1">
                      {video?.model === "wan2.5-t2v-preview" && "T2V 2.5"}
                      {video?.model === "wan2.5-i2v-preview" && "I2V 2.5"}
                      {video?.model === "wan2.2-i2v-plus" && "I2V 2.2+"}
                    </Badge></p>
                    <p>Type: <Badge variant="outline" className="ml-1">{video?.generationType === "text-to-video" ? "Text-to-Video" : "Image-to-Video"}</Badge></p>
                    <p>Resolution: <span className="font-mono">{video?.resolution}</span></p>
                    <p>Audio: <span className="capitalize">{video?.audioMode}</span></p>
                    {video?.negativePrompt && (
                      <p className="text-xs">Negative prompt: {video.negativePrompt}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="video-prompt">Video Prompt</Label>
              <Textarea
                id="video-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the video you want to generate..."
                className="mt-2 min-h-[120px]"
                autoFocus
                disabled={isPending}
                data-testid="textarea-video-prompt"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Modify the prompt and click Regenerate to create a new video with the updated description.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isPending}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!prompt.trim() || isPending}
              data-testid="button-regenerate"
            >
              {isPending ? "Regenerating..." : "Regenerate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
