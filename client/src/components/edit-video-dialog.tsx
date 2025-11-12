import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Video } from "@shared/schema";

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
          </DialogHeader>

          <div className="py-4">
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
