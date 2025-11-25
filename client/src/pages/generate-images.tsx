import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Project, ModelType } from "@shared/schema";
import { WAN_MODELS } from "@shared/models";
import { StoryboardBuilder } from "@/components/storyboard-builder";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function GenerateImages() {
  const [, params] = useRoute("/project/:id/generate-images");
  const [, setLocation] = useLocation();
  const projectId = params?.id;
  const [generationType, setGenerationType] = useState<"t2i" | "i2i">("t2i");

  const { data: project } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const handleComplete = (prompts: any[]) => {
    // Store prompts in session/state and navigate to video generation with storyboard mode
    sessionStorage.setItem('storyboardPrompts', JSON.stringify(prompts));
    setLocation(`/project/${projectId!}/generate`);
  };

  if (!projectId || !project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
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
            <p className="text-muted-foreground">
              {generationType === "t2i" ? "Text to Image" : "Image to Image"} Storyboard
            </p>
          </div>
        </div>

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

        <StoryboardBuilder
          onComplete={handleComplete}
          onCancel={() => setLocation(`/project/${projectId!}`)}
          projectGlobalPrompt={project.globalPrompt || undefined}
        />
      </div>
    </div>
  );
}
