import { Folder, Plus, Film, Settings, Trash2, Edit2, Sparkles } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Project } from "@shared/schema";

interface AppSidebarProps {
  projects: Project[];
  videoCounts: Record<string, number>;
  onCreateProject: () => void;
  onRenameProject: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
}

export function AppSidebar({
  projects,
  videoCounts,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
}: AppSidebarProps) {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary">
            <Film className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-sidebar-foreground font-mono">VideoForge</h1>
            <p className="text-xs text-muted-foreground">AI Video Generation</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <div className="flex items-center justify-between px-2 mb-2">
            <SidebarGroupLabel>Projects</SidebarGroupLabel>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={onCreateProject}
              data-testid="button-create-project"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {projects.length === 0 ? (
                <div className="px-2 py-8 text-center">
                  <Folder className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground mb-3">No projects yet</p>
                  <Button
                    size="sm"
                    onClick={onCreateProject}
                    data-testid="button-create-first-project"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Project
                  </Button>
                </div>
              ) : (
                projects.map((project) => {
                  const isActive = location === `/project/${project.id}`;
                  const videoCount = videoCounts[project.id] || 0;

                  return (
                    <SidebarMenuItem key={project.id}>
                      <div className="flex items-center gap-1 w-full group">
                        <SidebarMenuButton asChild className={isActive ? "bg-sidebar-accent" : ""}>
                          <Link href={`/project/${project.id}`} data-testid={`link-project-${project.id}`}>
                            <Folder className="w-4 h-4" />
                            <span className="flex-1 truncate">{project.name}</span>
                            {videoCount > 0 && (
                              <Badge variant="secondary" className="ml-auto text-xs">
                                {videoCount}
                              </Badge>
                            )}
                          </Link>
                        </SidebarMenuButton>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100"
                              data-testid={`button-project-menu-${project.id}`}
                            >
                              <Settings className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => onRenameProject(project)}
                              data-testid={`button-rename-${project.id}`}
                            >
                              <Edit2 className="w-4 h-4 mr-2" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onDeleteProject(project)}
                              className="text-destructive"
                              data-testid={`button-delete-${project.id}`}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </SidebarMenuItem>
                  );
                })
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="text-xs text-muted-foreground">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="font-mono">AI Video Generation</span>
          </div>
          <p className="text-[10px] opacity-60">Powered by Alibaba Cloud Wan 2.5</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
