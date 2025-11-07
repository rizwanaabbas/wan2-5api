import { Sparkles, Video } from "lucide-react";
import { ModelType } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ModelSelectorProps {
  selectedModel: ModelType;
  onModelChange: (model: ModelType) => void;
}

export function ModelSelector({ selectedModel, onModelChange }: ModelSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Select AI Model</h3>
        <p className="text-sm text-muted-foreground">
          Choose the video generation model for your project
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card
          className={`p-6 cursor-pointer transition-all border-2 hover-elevate ${
            selectedModel === "ovi"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
          onClick={() => onModelChange("ovi")}
          data-testid="card-model-ovi"
        >
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-base mb-1 font-mono">Ovi</h4>
              <p className="text-xs text-muted-foreground mb-3">Character AI</p>
              <ul className="space-y-1 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-xs">Video + Audio Generation</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-xs">720×720 to 1504×608</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-xs">Speech & Audio Tags</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>

        <Card
          className={`p-6 cursor-pointer transition-all border-2 hover-elevate ${
            selectedModel === "wan2.1"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
          onClick={() => onModelChange("wan2.1")}
          data-testid="card-model-wan"
        >
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-chart-2/10">
              <Video className="w-6 h-6 text-chart-2" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-base mb-1 font-mono">Wan2.1</h4>
              <p className="text-xs text-muted-foreground mb-3">Wan-AI</p>
              <ul className="space-y-1 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-chart-2" />
                  <span className="text-xs">SOTA Performance</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-chart-2" />
                  <span className="text-xs">480p to 1080p</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-chart-2" />
                  <span className="text-xs">Visual Text Generation</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
