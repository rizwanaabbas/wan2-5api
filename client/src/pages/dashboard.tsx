import { useState, useCallback, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Video, Project, SavedFile } from "@shared/schema";
import { VideoCard } from "@/components/video-card";
import { VideoPlayer } from "@/components/video-player";
import { EditVideoDialog } from "@/components/edit-video-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Video as VideoIcon, Loader2, BarChart3, Clock, CheckCircle, XCircle, ExternalLink, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Dashboard() {
  const [, params] = useRoute("/project/:id");
  const projectId = params?.id;
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [videoToEdit, setVideoToEdit] = useState<Video | null>(null);
  const [savedVideos, setSavedVideos] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const { data: savedFiles = [] } = useQuery<SavedFile[]>({
    queryKey: ["/api/projects", projectId, "saved-files"],
    enabled: !!projectId,
  });

  useEffect(() => {
    if (savedFiles.length > 0) {
      const savedUrls = new Set(savedFiles.map(f => f.originalUrl));
      setSavedVideos(savedUrls);
    }
  }, [savedFiles]);

  const handleVideoSaved = useCallback((videoUrl: string) => {
    setSavedVideos(prev => new Set([...Array.from(prev), videoUrl]));
    queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "saved-files"] });
  }, [projectId]);

  // Fetch all projects for welcome screen stats
  const { data: allProjects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: !projectId,
  });

  // Fetch all videos for welcome screen stats
  const { data: allVideos = [] } = useQuery<Video[]>({
    queryKey: ["/api/videos"],
    enabled: !projectId,
  });

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
      // Construct full URL if videoUrl is a relative path (stored videos)
      let downloadUrl = video.videoUrl;
      if (downloadUrl.startsWith('/objects/')) {
        downloadUrl = `${window.location.origin}${downloadUrl}`;
      }

      const link = document.createElement("a");
      link.href = downloadUrl;
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
    // Calculate overall statistics
    const totalProjectsCount = allProjects.length;
    const totalVideosCount = allVideos.length;
    const completedVideosCount = allVideos.filter((v) => v.status === "completed").length;
    const processingVideosCount = allVideos.filter((v) => v.status === "processing" || v.status === "pending").length;
    const totalDuration = allVideos
      .filter((v) => v.duration)
      .reduce((sum, v) => sum + (v.duration || 0), 0);

    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-4xl px-4">
          <VideoIcon className="w-20 h-20 mx-auto mb-6 text-primary" />
          <h2 className="text-3xl font-bold mb-2">Welcome to VideoForge</h2>
          <p className="text-muted-foreground mb-8">
            AI-powered video generation using Alibaba Cloud Wan models
          </p>
          
          {totalProjectsCount > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-total-projects">{totalProjectsCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">Active projects</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Videos</CardTitle>
                  <VideoIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-all-videos">{totalVideosCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">All generated videos</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-all-completed">{completedVideosCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {totalVideosCount > 0 ? Math.round((completedVideosCount / totalVideosCount) * 100) : 0}% success rate
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Duration</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-all-duration">{totalDuration}s</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round(totalDuration / 60)} minutes of video
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <p className="text-muted-foreground mt-6">
              Create a project from the sidebar to get started with AI video generation
            </p>
          )}
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

  // Calculate statistics
  const stats = {
    total: videos.length,
    completed: videos.filter((v) => v.status === "completed").length,
    processing: videos.filter((v) => v.status === "processing" || v.status === "pending").length,
    failed: videos.filter((v) => v.status === "failed").length,
    totalDuration: videos
      .filter((v) => v.duration)
      .reduce((sum, v) => sum + (v.duration || 0), 0),
  };

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
          <div className="flex gap-3">
            <Link href={`/project/${projectId}/generate-images`}>
              <Button variant="outline" data-testid="button-create-storyboard">
                <Sparkles className="w-5 h-5 mr-2" />
                Create Storyboard
              </Button>
            </Link>
            <Link href={`/project/${projectId}/generate`}>
              <Button size="lg" data-testid="button-generate-video">
                <Plus className="w-5 h-5 mr-2" />
                Generate Video
              </Button>
            </Link>
          </div>
        </div>

        {/* Usage Statistics */}
        {videos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Videos</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-total-videos">{stats.total}</div>
                <p className="text-xs text-muted-foreground mt-1">All generated videos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-completed-videos">{stats.completed}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% success rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Processing</CardTitle>
                <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-processing-videos">{stats.processing}</div>
                <p className="text-xs text-muted-foreground mt-1">Currently generating</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Duration</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-total-duration">{stats.totalDuration}s</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round(stats.totalDuration / 60)} minutes of video
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Billing Information Card */}
        {videos.length > 0 && (
          <Card className="mb-8 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Billing & Usage
              </CardTitle>
              <CardDescription>
                View detailed billing information in your Alibaba Cloud console
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    For detailed billing, outstanding charges, and payment history, visit the Alibaba Cloud Model Studio console.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    DashScope API does not provide a programmatic billing endpoint
                  </p>
                </div>
                <Button
                  variant="default"
                  asChild
                  data-testid="button-view-billing"
                >
                  <a
                    href="https://bailian.console.aliyun.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    View Billing Console
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}


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
                savedVideos={savedVideos}
                onVideoSaved={handleVideoSaved}
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
        isVideoSaved={selectedVideo ? savedVideos.has(selectedVideo.videoUrl || "") : false}
        onVideoSaved={handleVideoSaved}
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
