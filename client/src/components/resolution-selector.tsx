import { RESOLUTIONS } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Maximize2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ResolutionSelectorProps {
  selectedResolution: string;
  onResolutionChange: (resolution: string) => void;
}

export function ResolutionSelector({
  selectedResolution,
  onResolutionChange,
}: ResolutionSelectorProps) {
  const resolutions480p = RESOLUTIONS.slice(0, 3);
  const resolutions720p = RESOLUTIONS.slice(3, 8);
  const resolutions1080p = RESOLUTIONS.slice(8, 13);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Maximize2 className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Resolution</h3>
      </div>

      <div className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">480p</Badge>
            <span className="text-xs text-muted-foreground">Standard Definition</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {resolutions480p.map((res) => (
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

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">720p</Badge>
            <span className="text-xs text-muted-foreground">High Definition</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {resolutions720p.map((res) => (
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

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">1080p</Badge>
            <span className="text-xs text-muted-foreground">Full HD (Recommended)</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {resolutions1080p.map((res) => (
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
      </div>
    </div>
  );
}
