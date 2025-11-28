import { Video } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, HardDrive, Loader2, Check } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface VideoPlayerProps {
  video: Video | null;
  open: boolean;
  onClose: () => void;
  onDownload: (video: Video) => void;
  isVideoSaved?: boolean;
  onVideoSaved?: (videoUrl: string) => void;
}

export function VideoPlayer({ video, open, onClose, onDownload, isVideoSaved, onVideoSaved }: VideoPlayerProps) {
  const [isSavingToDisk, setIsSavingToDisk] = useState(false);
  const { toast } = useToast();

  if (!video) return null;

  const saveToDisk = async () => {
    if (!video.videoUrl || isVideoSaved) return;

    setIsSavingToDisk(true);
    try {
      const res = await apiRequest("POST", "/api/saved-files", {
        originalUrl: video.videoUrl,
        fileType: "video",
        projectId: video.projectId,
        videoId: video.id,
        filename: video.name,
      });
      
      const data = await res.json();
      
      if (data.success) {
        onVideoSaved?.(video.videoUrl);
        toast({
          title: data.alreadyExists ? "Already saved" : "Saved to disk",
          description: data.alreadyExists 
            ? "This video was already saved to disk" 
            : `Video saved to: ${data.savedFile.localPath}`,
        });
      } else {
        throw new Error("Failed to save file");
      }
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save video to disk",
        variant: "destructive",
      });
    } finally {
      setIsSavingToDisk(false);
    }
  };

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
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDownload(video)}
                    data-testid="button-download-player"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    size="sm"
                    onClick={saveToDisk}
                    disabled={isSavingToDisk || isVideoSaved}
                    data-testid="button-save-disk-player"
                  >
                    {isSavingToDisk ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : isVideoSaved ? (
                      <>
                        <Check className="w-4 h-4 mr-2 text-green-500" />
                        Saved to Disk
                      </>
                    ) : (
                      <>
                        <HardDrive className="w-4 h-4 mr-2" />
                        Save to Disk
                      </>
                    )}
                  </Button>
                </>
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
