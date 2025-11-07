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
import { Project } from "@shared/schema";

interface ProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
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

  useEffect(() => {
    if (open) {
      setName(project?.name || "");
    }
  }, [open, project]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim());
      setName("");
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

          <div className="py-4">
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
