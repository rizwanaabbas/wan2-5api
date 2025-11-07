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

interface ProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string, globalPrompt?: string) => void;
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

  useEffect(() => {
    if (open) {
      setName(project?.name || "");
      setGlobalPrompt(project?.globalPrompt || "");
    }
  }, [open, project]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim(), globalPrompt.trim() || undefined);
      setName("");
      setGlobalPrompt("");
    }
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
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim()}
              data-testid="button-submit"
            >
              {mode === "create" ? "Create" : "Rename"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
