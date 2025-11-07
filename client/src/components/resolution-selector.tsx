import { ModelType, ResolutionOption, OVI_RESOLUTIONS, WAN_RESOLUTIONS } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Maximize2 } from "lucide-react";

interface ResolutionSelectorProps {
  model: ModelType;
  selectedResolution: string;
  onResolutionChange: (resolution: string) => void;
}

export function ResolutionSelector({
  model,
  selectedResolution,
  onResolutionChange,
}: ResolutionSelectorProps) {
  const resolutions: ResolutionOption[] = model === "ovi" ? OVI_RESOLUTIONS : WAN_RESOLUTIONS;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Maximize2 className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Resolution</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {resolutions.map((res) => (
          <Button
            key={res.value}
            variant={selectedResolution === res.value ? "default" : "outline"}
            className="flex flex-col h-auto py-3 gap-1"
            onClick={() => onResolutionChange(res.value)}
            data-testid={`button-resolution-${res.value}`}
          >
            <span className="text-sm font-semibold">{res.label}</span>
            <span className="text-xs opacity-80">{res.aspectRatio}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
