import { Video } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Download, Clock, Maximize2, Loader2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface VideoCardProps {
  video: Video;
  onPlay: (video: Video) => void;
  onDownload: (video: Video) => void;
}

export function VideoCard({ video, onPlay, onDownload }: VideoCardProps) {
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
        {video.thumbnailUrl ? (
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

        {video.status === "completed" && (
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

        <div className="absolute top-2 right-2">
          {getStatusBadge()}
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-sm mb-1 truncate" data-testid={`text-video-name-${video.id}`}>
            {video.name}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2">{video.prompt}</p>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="font-mono text-xs">
              {video.model === "ovi" ? "Ovi" : "Wan2.1"}
            </Badge>
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
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-xs text-muted-foreground">
            {format(new Date(video.createdAt), "MMM d, yyyy")}
          </span>
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

        {video.status === "failed" && video.errorMessage && (
          <div className="p-2 rounded bg-destructive/10 border border-destructive/20">
            <p className="text-xs text-destructive">{video.errorMessage}</p>
          </div>
        )}
      </div>
    </Card>
  );
}
