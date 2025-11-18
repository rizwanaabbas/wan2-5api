import { Video } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

interface VideoPlayerProps {
  video: Video | null;
  open: boolean;
  onClose: () => void;
  onDownload: (video: Video) => void;
}

export function VideoPlayer({ video, open, onClose, onDownload }: VideoPlayerProps) {
  if (!video) return null;

  // Construct full URL if videoUrl is a relative path (stored videos)
  let videoSrc = video.videoUrl || '';
  if (videoSrc.startsWith('/objects/')) {
    videoSrc = `${window.location.origin}${videoSrc}`;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 gap-0" data-testid="modal-video-player">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl">{video.name}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">{video.prompt}</p>
            </div>
            <div className="flex items-center gap-2">
              {video.videoUrl && (
                <Button
                  size="sm"
                  onClick={() => onDownload(video)}
                  data-testid="button-download-player"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="relative bg-black aspect-video">
          {video.videoUrl ? (
            <video
              src={videoSrc}
              controls
              autoPlay
              className="w-full h-full"
              data-testid="video-element"
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-white">Video not available</p>
            </div>
          )}
        </div>

        <div className="p-6 pt-4 space-y-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-1">Model</p>
              <p className="font-semibold font-mono">
                {video.model === "ovi" ? "Ovi" : "Wan2.1"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Resolution</p>
              <p className="font-semibold font-mono">{video.resolution}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Type</p>
              <p className="font-semibold capitalize">
                {video.generationType.replace("-", " ")}
              </p>
            </div>
            {video.duration && (
              <div>
                <p className="text-muted-foreground text-xs mb-1">Duration</p>
                <p className="font-semibold">{video.duration}s</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
