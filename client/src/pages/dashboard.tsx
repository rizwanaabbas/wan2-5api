import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Video, Project } from "@shared/schema";
import { VideoCard } from "@/components/video-card";
import { VideoPlayer } from "@/components/video-player";
import { EditVideoDialog } from "@/components/edit-video-dialog";
import { Button } from "@/components/ui/button";
import { Plus, Video as VideoIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Dashboard() {
  const [, params] = useRoute("/project/:id");
  const projectId = params?.id;
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [videoToEdit, setVideoToEdit] = useState<Video | null>(null);
  const { toast } = useToast();

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const { data: videos = [], isLoading: videosLoading } = useQuery<Video[]>({
    queryKey: ["/api/videos", projectId],
    enabled: !!projectId,
    refetchInterval: (query) => {
      const hasProcessing = query.state.data?.some(
        (video) => video.status === "pending" || video.status === "processing"
      );
      return hasProcessing ? 2000 : false;
    },
  });

  const handlePlay = (video: Video) => {
    setSelectedVideo(video);
    setPlayerOpen(true);
  };

  const handleDownload = async (video: Video) => {
    if (!video.videoUrl) return;

    try {
      const link = document.createElement("a");
      link.href = video.videoUrl;
      link.download = `${video.name}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download started",
        description: `Downloading ${video.name}`,
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to download video",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (video: Video) => {
    setVideoToEdit(video);
    setEditDialogOpen(true);
  };

  const regenerateVideoMutation = useMutation({
    mutationFn: async ({ videoId, prompt }: { videoId: string; prompt: string }) => {
      const res = await apiRequest("POST", `/api/videos/${videoId}/regenerate`, { prompt });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos", projectId] });
      setEditDialogOpen(false);
      setVideoToEdit(null);
      toast({
        title: "Video regeneration started",
        description: "Your video is being regenerated with the new prompt",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to regenerate video",
        variant: "destructive",
      });
    },
  });

  const handleRegenerateSubmit = (prompt: string) => {
    if (videoToEdit) {
      regenerateVideoMutation.mutate({ videoId: videoToEdit.id, prompt });
    }
  };

  if (!projectId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <VideoIcon className="w-20 h-20 mx-auto mb-6 text-muted-foreground opacity-30" />
          <h2 className="text-2xl font-bold mb-2">Welcome to VideoForge</h2>
          <p className="text-muted-foreground mb-6">
            Create a project from the sidebar to get started with AI video generation
          </p>
        </div>
      </div>
    );
  }

  if (projectLoading || videosLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Project not found</h2>
          <p className="text-muted-foreground">The project you're looking for doesn't exist</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2" data-testid="text-project-name">
              {project.name}
            </h1>
            <p className="text-muted-foreground">
              {videos.length} video{videos.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Link href={`/project/${projectId}/generate`}>
            <Button size="lg" data-testid="button-generate-video">
              <Plus className="w-5 h-5 mr-2" />
              Generate Video
            </Button>
          </Link>
        </div>

        {videos.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center max-w-md">
              <div className="flex items-center justify-center w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10">
                <VideoIcon className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">No videos yet</h2>
              <p className="text-muted-foreground mb-6">
                Start creating amazing AI-generated videos with Alibaba Cloud Wan 2.5
              </p>
              <Link href={`/project/${projectId}/generate`}>
                <Button data-testid="button-generate-first-video">
                  <Plus className="w-4 h-4 mr-2" />
                  Generate Your First Video
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onPlay={handlePlay}
                onDownload={handleDownload}
                onEdit={handleEdit}
              />
            ))}
          </div>
        )}
      </div>

      <VideoPlayer
        video={selectedVideo}
        open={playerOpen}
        onClose={() => {
          setPlayerOpen(false);
          setSelectedVideo(null);
        }}
        onDownload={handleDownload}
      />

      <EditVideoDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setVideoToEdit(null);
        }}
        onSubmit={handleRegenerateSubmit}
        video={videoToEdit}
        isPending={regenerateVideoMutation.isPending}
      />
    </div>
  );
}
