import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Project, Storyboard, StoryboardImage } from "@shared/schema";
import { StoryboardBuilder } from "@/components/storyboard-builder";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Plus, Image, Calendar, Trash2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type StoryboardWithImages = Storyboard & { images: StoryboardImage[] };

export default function GenerateImages() {
  const [, params] = useRoute("/project/:id/generate-images");
  const [, setLocation] = useLocation();
  const projectId = params?.id;
  const [generationType, setGenerationType] = useState<"t2i" | "i2i">("t2i");
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editingStoryboardId, setEditingStoryboardId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: project } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const { data: storyboards, isLoading: loadingStoryboards } = useQuery<Storyboard[]>({
    queryKey: ["/api/projects", projectId, "storyboards"],
    enabled: !!projectId,
  });

  const { data: editingStoryboard } = useQuery<StoryboardWithImages>({
    queryKey: ["/api/storyboards", editingStoryboardId],
    enabled: !!editingStoryboardId,
  });

  const deleteStoryboardMutation = useMutation({
    mutationFn: async (storyboardId: string) => {
      await apiRequest("DELETE", `/api/storyboards/${storyboardId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "storyboards"] });
      toast({
        title: "Storyboard deleted",
        description: "The storyboard has been deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "Failed to delete storyboard",
        variant: "destructive",
      });
    },
  });

  const handleComplete = (prompts: any[]) => {
    sessionStorage.setItem('storyboardPrompts', JSON.stringify(prompts));
    setLocation(`/project/${projectId!}/generate`);
  };

  const handleCreateNew = () => {
    setEditingStoryboardId(null);
    setMode("create");
  };

  const handleEditStoryboard = (storyboard: Storyboard) => {
    setEditingStoryboardId(storyboard.id);
    setGenerationType(storyboard.generationType as "t2i" | "i2i");
    setMode("edit");
  };

  const handleBack = () => {
    if (mode === "list") {
      setLocation(`/project/${projectId!}`);
    } else {
      setMode("list");
      setEditingStoryboardId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "storyboards"] });
    }
  };

  if (!projectId || !project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // List mode - show existing storyboards
  if (mode === "list") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation(`/project/${projectId!}`)}
                data-testid="button-back"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold">{project.name}</h1>
                <p className="text-muted-foreground">Image Storyboards</p>
              </div>
            </div>
            <Button onClick={handleCreateNew} data-testid="button-create-storyboard">
              <Plus className="w-4 h-4 mr-2" />
              Create New Storyboard
            </Button>
          </div>

          {loadingStoryboards ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Loading storyboards...</p>
            </div>
          ) : !storyboards || storyboards.length === 0 ? (
            <Card className="p-12">
              <div className="text-center space-y-4">
                <Image className="w-16 h-16 mx-auto text-muted-foreground/50" />
                <h2 className="text-xl font-semibold">No storyboards yet</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Create your first storyboard to generate preview images for your video project.
                </p>
                <Button onClick={handleCreateNew} data-testid="button-create-first">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Storyboard
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {storyboards.map((storyboard) => (
                <Card
                  key={storyboard.id}
                  className="hover-elevate cursor-pointer group"
                  onClick={() => handleEditStoryboard(storyboard)}
                  data-testid={`card-storyboard-${storyboard.id}`}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{storyboard.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {storyboard.generationType === "t2i" ? "Text to Image" : "Image to Image"}
                        </p>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                            data-testid={`button-delete-storyboard-${storyboard.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Storyboard</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{storyboard.name}"? This will permanently delete all images in this storyboard.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteStoryboardMutation.mutate(storyboard.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {new Date(storyboard.createdAt).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Create/Edit mode - show StoryboardBuilder
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <p className="text-muted-foreground">
              {mode === "edit" && editingStoryboard
                ? `Editing: ${editingStoryboard.name}`
                : `${generationType === "t2i" ? "Text to Image" : "Image to Image"} Storyboard`}
            </p>
          </div>
        </div>

        {mode === "create" && (
          <div className="flex gap-3 mb-4">
            <Button
              variant={generationType === "t2i" ? "default" : "outline"}
              onClick={() => setGenerationType("t2i")}
              data-testid="button-t2i"
            >
              Text to Image
            </Button>
            <Button
              variant={generationType === "i2i" ? "default" : "outline"}
              onClick={() => setGenerationType("i2i")}
              data-testid="button-i2i"
            >
              Image to Image
            </Button>
          </div>
        )}

        <StoryboardBuilder
          onComplete={handleComplete}
          onCancel={handleBack}
          projectGlobalPrompt={project.globalPrompt || undefined}
          generationType={generationType}
          projectId={projectId!}
          existingStoryboard={mode === "edit" ? editingStoryboard : undefined}
        />
      </div>
    </div>
  );
}
