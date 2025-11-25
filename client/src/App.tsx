import { useState } from "react";
import { Switch, Route, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient, apiRequest } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "@/components/app-sidebar";
import { ProjectDialog } from "@/components/project-dialog";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import Dashboard from "@/pages/dashboard";
import GenerateVideo from "@/pages/generate-video";
import GenerateImages from "@/pages/generate-images";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";
import { Project } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { LogOut } from "lucide-react";

function Router() {
  return (
    <Switch>
      <Route path="/project/:id" component={Dashboard} />
      <Route path="/project/:id/generate" component={GenerateVideo} />
      <Route path="/project/:id/generate-images" component={GenerateImages} />
      <Route path="/" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [projectDialogMode, setProjectDialogMode] = useState<"create" | "rename">("create");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout", {});
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/session"] });
      setLocation("/");
    },
    onError: () => {
      toast({
        title: "Logout failed",
        description: "Failed to logout",
        variant: "destructive",
      });
    },
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: allVideos = [] } = useQuery<any[]>({
    queryKey: ["/api/videos"],
  });

  const videoCounts = allVideos.reduce((acc: Record<string, number>, video: any) => {
    acc[video.projectId] = (acc[video.projectId] || 0) + 1;
    return acc;
  }, {});

  const createProjectMutation = useMutation({
    mutationFn: async (data: { name: string; globalPrompt?: string; imageUrl?: string; defaultModel?: string }) => {
      const res = await apiRequest("POST", "/api/projects", data);
      return res.json();
    },
    onSuccess: (newProject: Project) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setProjectDialogOpen(false);
      setLocation(`/project/${newProject.id}`);
      toast({
        title: "Project created",
        description: `${newProject.name} has been created successfully`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive",
      });
    },
  });

  const renameProjectMutation = useMutation({
    mutationFn: async ({ id, name, globalPrompt, imageUrl, defaultModel }: { id: string; name: string; globalPrompt?: string; imageUrl?: string; defaultModel?: string }) => {
      const res = await apiRequest("PATCH", `/api/projects/${id}`, { name, globalPrompt, imageUrl, defaultModel });
      return res.json();
    },
    onSuccess: (updatedProject: Project) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", updatedProject.id] });
      setProjectDialogOpen(false);
      toast({
        title: "Project updated",
        description: `Project ${updatedProject.name} has been updated`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update project",
        variant: "destructive",
      });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/projects/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      setDeleteDialogOpen(false);
      setLocation("/");
      toast({
        title: "Project deleted",
        description: "Project has been deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      });
    },
  });

  const handleCreateProject = () => {
    setProjectDialogMode("create");
    setSelectedProject(null);
    setProjectDialogOpen(true);
  };

  const handleRenameProject = (project: Project) => {
    setProjectDialogMode("rename");
    setSelectedProject(project);
    setProjectDialogOpen(true);
  };

  const handleDeleteProject = (project: Project) => {
    setSelectedProject(project);
    setDeleteDialogOpen(true);
  };

  const handleProjectDialogSubmit = (name: string, globalPrompt?: string, imageUrl?: string, defaultModel?: string) => {
    if (projectDialogMode === "create") {
      createProjectMutation.mutate({ name, globalPrompt, imageUrl, defaultModel });
    } else if (selectedProject) {
      renameProjectMutation.mutate({ id: selectedProject.id, name, globalPrompt, imageUrl, defaultModel });
    }
  };

  const handleDeleteConfirm = () => {
    if (selectedProject) {
      deleteProjectMutation.mutate(selectedProject.id);
    }
  };

  return (
    <div className="flex h-screen w-full">
      <AppSidebar
        projects={projects}
        videoCounts={videoCounts}
        onCreateProject={handleCreateProject}
        onRenameProject={handleRenameProject}
        onDeleteProject={handleDeleteProject}
      />
      <div className="flex flex-col flex-1">
        <header className="flex items-center justify-between p-4 border-b">
          <SidebarTrigger data-testid="button-sidebar-toggle" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </header>
        <main className="flex-1 overflow-auto">
          <Router />
        </main>
      </div>

      <ProjectDialog
        open={projectDialogOpen}
        onClose={() => setProjectDialogOpen(false)}
        onSubmit={handleProjectDialogSubmit}
        project={selectedProject}
        mode={projectDialogMode}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        project={selectedProject}
        videoCount={selectedProject ? videoCounts[selectedProject.id] || 0 : 0}
      />
    </div>
  );
}

function AuthGuard() {
  // Check authentication on mount
  const { data: session, isLoading: sessionLoading } = useQuery<{ authenticated: boolean; userId?: string }>({
    queryKey: ["/api/session"],
    retry: false,
  });

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!session?.authenticated) {
    return <Login />;
  }

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <AuthenticatedApp />
    </SidebarProvider>
  );
}

const style = {
  "--sidebar-width": "20rem",
  "--sidebar-width-icon": "4rem",
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthGuard />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
