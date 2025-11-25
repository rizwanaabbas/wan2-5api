import { Video } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Download, Clock, Maximize2, Loader2, AlertCircle, RefreshCw, Image as ImageIcon, Video as VideoIcon, Volume2, VolumeX, Music, Copy, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface VideoCardProps {
  video: Video;
  onPlay: (video: Video) => void;
  onDownload: (video: Video) => void;
  onEdit?: (video: Video) => void;
}

export function VideoCard({ video, onPlay, onDownload, onEdit }: VideoCardProps) {
  const [copiedTaskId, setCopiedTaskId] = useState(false);
  const { toast } = useToast();

  const copyTaskId = async () => {
    if (!video.taskId) return;

    // Feature detection for clipboard API
    if (!navigator.clipboard?.writeText) {
      toast({
        title: "Copy not supported",
        description: "Your browser doesn't support clipboard copying",
        variant: "destructive",
      });
      return;
    }

    try {
      // Optimistically show success state
      setCopiedTaskId(true);
      
      await navigator.clipboard.writeText(video.taskId);
      
      toast({
        title: "Copied!",
        description: "Task ID copied to clipboard",
      });
      
      setTimeout(() => setCopiedTaskId(false), 2000);
    } catch (error) {
      // Revert success state on error
      setCopiedTaskId(false);
      
      toast({
        title: "Copy failed",
        description: "Failed to copy task ID to clipboard",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = () => {
    switch (video.status) {
      case "processing":
        return (
          <Badge variant="default" className="bg-chart-1">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Processing {video.progress}%
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="default" className="bg-green-600">
            Completed
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            Pending
          </Badge>
        );
    }
  };

  return (
    <Card className="overflow-hidden hover-elevate transition-all" data-testid={`card-video-${video.id}`}>
      <div className="relative aspect-video bg-muted">
        {video.sourceImageUrl && video.generationType === "image-to-video" ? (
          <img
            src={video.sourceImageUrl}
            alt={`Source image for ${video.name}`}
            className="w-full h-full object-cover"
          />
        ) : video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-muted to-muted/50">
            <div className="text-center">
              <Maximize2 className="w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-30" />
              <p className="text-xs text-muted-foreground font-mono">{video.resolution}</p>
            </div>
          </div>
        )}

        {video.status === "completed" && video.videoUrl && (
          <button
            onClick={() => onPlay(video)}
            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity group"
            data-testid={`button-play-${video.id}`}
          >
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary group-hover:scale-110 transition-transform">
              <Play className="w-8 h-8 text-primary-foreground ml-1" fill="currentColor" />
            </div>
          </button>
        )}
        
        {video.status === "completed" && !video.videoUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted/95 to-muted/80 backdrop-blur-sm">
            <div className="text-center px-4">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground">Simulation Complete</p>
              <p className="text-xs text-muted-foreground mt-1">No video generated</p>
            </div>
          </div>
        )}

        <div className="absolute top-2 right-2 flex gap-2">
          <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
            {video.generationType === "text-to-video" ? (
              <>
                <VideoIcon className="w-3 h-3 mr-1" />
                T2V
              </>
            ) : (
              <>
                <ImageIcon className="w-3 h-3 mr-1" />
                I2V
              </>
            )}
          </Badge>
          {getStatusBadge()}
        </div>

        {/* Audio filename indicator below thumbnail */}
        {video.audioMode === "custom" && video.audioFilename && (
          <div className="absolute bottom-2 left-2 right-2">
            <Badge 
              variant="secondary" 
              className="bg-background/90 backdrop-blur-sm w-full justify-start truncate text-xs"
              data-testid={`badge-audio-filename-${video.id}`}
            >
              <Music className="w-3 h-3 mr-1 flex-shrink-0" />
              <span className="truncate">{video.audioFilename}</span>
            </Badge>
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-sm mb-1 truncate" data-testid={`text-video-name-${video.id}`}>
            {video.name}
          </h3>
          <div className="max-h-12 overflow-y-auto text-xs text-muted-foreground border border-border/50 rounded p-2 bg-muted/30" data-testid={`text-prompt-${video.id}`}>
            {video.prompt}
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="font-mono text-xs">
              {video.model === "wan2.5-t2v-preview" && "T2V 2.5"}
              {video.model === "wan2.5-i2v-preview" && "I2V 2.5"}
              {video.model === "wan2.2-i2v-plus" && "I2V 2.2+"}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5">
            {video.audioMode === "auto" && (
              <span title="AI-generated audio">
                <Volume2 className="w-3 h-3" />
              </span>
            )}
            {video.audioMode === "custom" && (
              <span title="Custom audio">
                <Music className="w-3 h-3" />
              </span>
            )}
            {video.audioMode === "silent" && (
              <span title="No audio">
                <VolumeX className="w-3 h-3" />
              </span>
            )}
            <span className="capitalize">{video.audioMode}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Maximize2 className="w-3 h-3" />
            <span className="font-mono">{video.resolution}</span>
          </div>
          {video.duration && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              <span>{video.duration}s</span>
            </div>
          )}
          {video.taskId && (
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                  <Badge variant="secondary" className="font-mono text-xs cursor-pointer">
                    {video.taskId.slice(0, 8)}...
                  </Badge>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3" align="start">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Task ID</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                      {video.taskId}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={copyTaskId}
                      className="h-7 w-7 p-0"
                      data-testid={`button-copy-task-id-${video.id}`}
                      aria-label={copiedTaskId ? "Copied" : "Copy task ID"}
                    >
                      {copiedTaskId ? (
                        <Check className="w-3.5 h-3.5 text-green-600" data-testid={`icon-copied-${video.id}`} />
                      ) : (
                        <Copy className="w-3.5 h-3.5" data-testid={`icon-copy-${video.id}`} />
                      )}
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-xs text-muted-foreground">
            {format(new Date(video.createdAt), "MMM d, yyyy")}
          </span>
          <div className="flex items-center gap-2">
            {onEdit && (video.status === "completed" || video.status === "failed") && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEdit(video)}
                data-testid={`button-edit-${video.id}`}
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Edit & Regenerate
              </Button>
            )}
            {video.status === "completed" && video.videoUrl && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDownload(video)}
                data-testid={`button-download-${video.id}`}
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Download
              </Button>
            )}
          </div>
        </div>

        {video.status === "completed" && !video.videoUrl && (
          <div className="p-2 rounded bg-muted border border-border">
            <p className="text-xs text-muted-foreground">
              Generation simulation complete. In production, this would contain your AI-generated video.
            </p>
          </div>
        )}

        {video.status === "failed" && video.errorMessage && (
          <div className="p-2 rounded bg-destructive/10 border border-destructive/20">
            <p className="text-xs text-destructive">{video.errorMessage}</p>
          </div>
        )}
      </div>
    </Card>
  );
}
