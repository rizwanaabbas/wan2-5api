import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, Download, RefreshCw, Loader2, Image as ImageIcon, Plus, Trash2, Link2, ChevronDown, Save, FileJson, FileSpreadsheet, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Storyboard, StoryboardItem, ReferenceMode } from "@shared/schema";
import { WAN_MODELS } from "@shared/models";

type StoryboardWithItems = Storyboard & { items: StoryboardItem[] };

interface StoryboardTableBuilderProps {
  projectId: string;
  storyboardId?: string;
  onClose: () => void;
}

const IMAGE_MODELS = Object.entries(WAN_MODELS)
  .filter(([, meta]) => meta.category === "image-to-image" || meta.category === "text-to-image")
  .map(([key, meta]) => ({ value: key, label: meta.name }));

const RESOLUTION_OPTIONS = [
  { label: "1280×960 (4:3)", value: "1280*960" },
  { label: "960×1280 (3:4)", value: "960*1280" },
  { label: "1024×1024 (1:1)", value: "1024*1024" },
  { label: "1280×720 (16:9)", value: "1280*720" },
  { label: "720×1280 (9:16)", value: "720*1280" },
];

export function StoryboardTableBuilder({ projectId, storyboardId, onClose }: StoryboardTableBuilderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  const [name, setName] = useState("New Storyboard");
  const [globalStyle, setGlobalStyle] = useState("");
  const [globalImageUrl, setGlobalImageUrl] = useState("");
  const [referenceMode, setReferenceMode] = useState<ReferenceMode>("global");
  const [resolution, setResolution] = useState("1280*960");
  const [items, setItems] = useState<StoryboardItem[]>([]);
  const [isCreating, setIsCreating] = useState(!storyboardId);
  const [currentStoryboardId, setCurrentStoryboardId] = useState<string | null>(storyboardId || null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pollingItems, setPollingItems] = useState<Set<string>>(new Set());
  const [isChainGenerating, setIsChainGenerating] = useState(false);
  const [chainProgress, setChainProgress] = useState({ current: 0, total: 0 });
  const [isGeneratingGlobal, setIsGeneratingGlobal] = useState(false);
  const cancelChainRef = useRef(false);
  
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { data: storyboard, isLoading } = useQuery<StoryboardWithItems>({
    queryKey: ["/api/storyboards", currentStoryboardId],
    enabled: !!currentStoryboardId,
  });

  useEffect(() => {
    if (storyboard) {
      setName(storyboard.name);
      setGlobalStyle(storyboard.globalStyle || "");
      setGlobalImageUrl(storyboard.globalImageUrl || "");
      setReferenceMode((storyboard.referenceMode as ReferenceMode) || "global");
      setItems(storyboard.items || []);
      setIsCreating(false);
    }
  }, [storyboard]);

  const createStoryboardMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/storyboards", {
        projectId,
        name,
        generationType: "i2i",
        globalStyle,
        globalImageUrl,
        referenceMode,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setCurrentStoryboardId(data.storyboard.id);
      setIsCreating(false);
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "storyboards"] });
      toast({ title: "Storyboard created" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create storyboard", description: error.message, variant: "destructive" });
    },
  });

  const autoSaveStoryboard = useCallback(async () => {
    if (!currentStoryboardId) return;
    try {
      await apiRequest("PATCH", `/api/storyboards/${currentStoryboardId}`, {
        name,
        globalStyle,
        globalImageUrl,
        referenceMode,
      });
    } catch (error) {
      console.error("Auto-save failed:", error);
    }
  }, [currentStoryboardId, name, globalStyle, globalImageUrl, referenceMode]);

  useEffect(() => {
    if (!currentStoryboardId) return;
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    autoSaveTimeoutRef.current = setTimeout(() => {
      autoSaveStoryboard();
    }, 1000);
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [name, globalStyle, globalImageUrl, referenceMode, autoSaveStoryboard, currentStoryboardId]);

  const addItemMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const res = await apiRequest("POST", `/api/storyboards/${currentStoryboardId}/items`, {
        prompt,
        model: "wan2.6-image",
        order: items.length,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setItems(prev => [...prev, data.item]);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add item", description: error.message, variant: "destructive" });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<StoryboardItem> }) => {
      const res = await apiRequest("PATCH", `/api/storyboard-items/${id}`, updates);
      return res.json();
    },
    onSuccess: (data) => {
      setItems(prev => prev.map(item => item.id === data.id ? data : item));
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/storyboard-items/${id}`);
      return id;
    },
    onSuccess: (id) => {
      setItems(prev => prev.filter(item => item.id !== id));
    },
  });

  const generateItemMutation = useMutation({
    mutationFn: async ({ itemId, referenceImageUrl }: { itemId: string; referenceImageUrl?: string }) => {
      const res = await apiRequest("POST", `/api/storyboard-items/${itemId}/generate`, {
        referenceImageUrl,
        size: resolution,
        promptExtend: true,
      });
      return res.json();
    },
    onSuccess: (data, variables) => {
      setPollingItems(prev => new Set(prev).add(variables.itemId));
      setItems(prev => prev.map(item => 
        item.id === variables.itemId ? { ...item, status: "generating" } : item
      ));
    },
    onError: (error: Error) => {
      toast({ title: "Generation failed", description: error.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (pollingItems.size === 0) return;
    
    const pollInterval = setInterval(async () => {
      for (const itemId of Array.from(pollingItems)) {
        try {
          const res = await fetch(`/api/storyboard-items/${itemId}/status`);
          const data = await res.json();
          
          if (data.status === "completed" || data.status === "failed") {
            setPollingItems(prev => {
              const next = new Set(prev);
              next.delete(itemId);
              return next;
            });
            setItems(prev => prev.map(item => 
              item.id === itemId ? { 
                ...item, 
                status: data.status, 
                generatedImageUrl: data.generatedImageUrl || item.generatedImageUrl 
              } : item
            ));
            if (data.status === "completed") {
              toast({ title: "Image generated successfully" });
            } else if (data.status === "failed") {
              toast({ title: "Generation failed", description: data.error, variant: "destructive" });
            }
          }
        } catch (error) {
          console.error("Polling error:", error);
        }
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [pollingItems, toast]);

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      let importedItems: { prompt: string; model?: string }[] = [];

      if (file.name.endsWith(".json")) {
        const json = JSON.parse(text);
        if (Array.isArray(json)) {
          importedItems = json.map((item: any) => ({
            prompt: item.prompt || item.text || item.description || "",
            model: item.model,
          }));
        } else if (json.items && Array.isArray(json.items)) {
          importedItems = json.items.map((item: any) => ({
            prompt: item.prompt || item.text || item.description || "",
            model: item.model,
          }));
        } else if (json.scenes && Array.isArray(json.scenes)) {
          importedItems = json.scenes.map((item: any) => ({
            prompt: item.prompt || item.text || item.description || "",
            model: item.model,
          }));
        }
      } else if (file.name.endsWith(".csv")) {
        const lines = text.split("\n").filter(line => line.trim());
        const header = lines[0]?.toLowerCase() || "";
        const hasHeader = header.includes("prompt") || header.includes("text");
        const dataLines = hasHeader ? lines.slice(1) : lines;
        
        importedItems = dataLines.map(line => {
          const parts = line.split(",").map(p => p.trim().replace(/^"|"$/g, ""));
          return { prompt: parts[0] || "", model: parts[1] };
        });
      }

      importedItems = importedItems.filter(item => item.prompt.trim());

      if (importedItems.length === 0) {
        toast({ title: "No valid prompts found in file", variant: "destructive" });
        return;
      }

      let storyboardId = currentStoryboardId;
      
      if (!storyboardId) {
        const createResult = await createStoryboardMutation.mutateAsync();
        storyboardId = createResult.storyboard.id;
        setCurrentStoryboardId(storyboardId);
      }

      if (items.length > 0) {
        await apiRequest("DELETE", `/api/storyboards/${storyboardId}/items`);
      }

      const res = await apiRequest("POST", `/api/storyboards/${storyboardId}/items/batch`, {
        items: importedItems,
      });
      const data = await res.json();
      setItems(data.items);
      setShowImportDialog(false);
      toast({ title: `Imported ${data.items.length} prompts` });
    } catch (error) {
      toast({ title: "Failed to import file", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUploadGlobalImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch("/api/objects/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) {
        const errorData = await res.text();
        console.error("Upload failed:", errorData);
        throw new Error("Upload failed");
      }
      
      const data = await res.json();
      const imageUrl = data.url || data.path;
      console.log("Image uploaded successfully:", imageUrl);
      setGlobalImageUrl(imageUrl);
      toast({ title: "Image uploaded" });
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Upload failed", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  };

  const getReferenceImageForItem = (item: StoryboardItem, index: number, chainOutputs?: Map<number, string>): string | undefined => {
    if (referenceMode === "custom") {
      return item.referenceImageUrl || undefined;
    }
    if (referenceMode === "global") {
      return globalImageUrl || undefined;
    }
    if (referenceMode === "chain") {
      if (index === 0) {
        return globalImageUrl || undefined;
      }
      // During chained generation, use the chainOutputs map for accurate reference
      if (chainOutputs && chainOutputs.has(index - 1)) {
        return chainOutputs.get(index - 1);
      }
      const prevItem = items[index - 1];
      return prevItem?.generatedImageUrl || globalImageUrl || undefined;
    }
    return undefined;
  };

  // Poll for item completion and return the generated image URL
  const pollForCompletion = async (itemId: string): Promise<string | null> => {
    const maxAttempts = 120; // 6 minutes max (120 * 3 seconds)
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (cancelChainRef.current) {
        return null;
      }
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      try {
        const res = await fetch(`/api/storyboard-items/${itemId}/status`);
        const data = await res.json();
        
        if (data.status === "completed") {
          setItems(prev => prev.map(item => 
            item.id === itemId ? { ...item, status: "completed", generatedImageUrl: data.generatedImageUrl } : item
          ));
          return data.generatedImageUrl;
        } else if (data.status === "failed") {
          setItems(prev => prev.map(item => 
            item.id === itemId ? { ...item, status: "failed" } : item
          ));
          toast({ title: "Generation failed", description: data.error, variant: "destructive" });
          return null;
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }
    toast({ title: "Generation timeout", description: "The image took too long to generate", variant: "destructive" });
    return null;
  };

  // Generate the global/starting image using T2I
  const handleGenerateGlobalImage = async () => {
    if (!globalStyle.trim()) {
      toast({ title: "Please enter a global style prompt first", variant: "destructive" });
      return;
    }
    
    setIsGeneratingGlobal(true);
    try {
      // Use the task-based T2I endpoint for progress tracking
      const res = await apiRequest("POST", "/api/generate/text-to-image/start", {
        prompt: globalStyle,
        size: resolution,
      });
      
      const data = await res.json();
      
      if (!data.taskId) {
        throw new Error("No task ID returned");
      }
      
      // Poll for completion
      for (let attempt = 0; attempt < 120; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        try {
          const statusRes = await fetch(`/api/generate/task/${data.taskId}`);
          const statusData = await statusRes.json();
          
          if (statusData.status === "completed" && statusData.imageUrl) {
            setGlobalImageUrl(statusData.imageUrl);
            toast({ title: "Global image generated" });
            return;
          } else if (statusData.status === "failed") {
            toast({ title: "Generation failed", description: statusData.error, variant: "destructive" });
            return;
          }
        } catch (e) {
          console.error("Poll error:", e);
        }
      }
      toast({ title: "Generation timeout", variant: "destructive" });
    } catch (error) {
      console.error("Generate global error:", error);
      toast({ title: "Generation failed", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    } finally {
      setIsGeneratingGlobal(false);
    }
  };

  const handleGenerate = (item: StoryboardItem, index: number) => {
    const refImage = getReferenceImageForItem(item, index);
    if (!refImage && referenceMode !== "custom") {
      toast({ title: "No reference image available", description: "Please upload or generate a starting image first", variant: "destructive" });
      return;
    }
    generateItemMutation.mutate({ itemId: item.id, referenceImageUrl: refImage });
  };

  const handleGenerateAll = async () => {
    if (items.length === 0) {
      toast({ title: "No scenes to generate", variant: "destructive" });
      return;
    }
    
    // For chain mode, we need a global image to start
    if (referenceMode === "chain" && !globalImageUrl) {
      toast({ title: "Please upload or generate a starting image first", variant: "destructive" });
      return;
    }
    
    setIsChainGenerating(true);
    setChainProgress({ current: 0, total: items.length });
    cancelChainRef.current = false;
    
    // Map to store generated outputs for chaining
    const chainOutputs = new Map<number, string>();
    
    try {
      for (let i = 0; i < items.length; i++) {
        if (cancelChainRef.current) {
          toast({ title: "Generation cancelled" });
          break;
        }
        
        const item = items[i];
        setChainProgress({ current: i + 1, total: items.length });
        
        // Skip already completed items unless in chain mode (need proper sequence)
        if (item.generatedImageUrl && item.status === "completed" && referenceMode !== "chain") {
          chainOutputs.set(i, item.generatedImageUrl);
          continue;
        }
        
        // Get reference image - for chain mode, use the previous output
        let refImage: string | undefined;
        if (referenceMode === "chain") {
          if (i === 0) {
            refImage = globalImageUrl || undefined;
          } else {
            refImage = chainOutputs.get(i - 1) || undefined;
          }
        } else {
          refImage = getReferenceImageForItem(item, i);
        }
        
        if (!refImage && referenceMode !== "custom") {
          toast({ title: `Scene ${i + 1}: No reference image available`, variant: "destructive" });
          continue;
        }
        
        // Start generation
        setItems(prev => prev.map(it => it.id === item.id ? { ...it, status: "generating" } : it));
        
        try {
          const res = await apiRequest("POST", `/api/storyboard-items/${item.id}/generate`, {
            referenceImageUrl: refImage,
            size: resolution,
            promptExtend: true,
          });
          await res.json();
          
          // Wait for completion
          const outputUrl = await pollForCompletion(item.id);
          
          if (outputUrl) {
            chainOutputs.set(i, outputUrl);
            toast({ title: `Scene ${i + 1} completed` });
          } else if (cancelChainRef.current) {
            break;
          }
        } catch (error) {
          console.error(`Error generating scene ${i + 1}:`, error);
          toast({ title: `Scene ${i + 1} failed`, variant: "destructive" });
        }
      }
    } finally {
      setIsChainGenerating(false);
      setChainProgress({ current: 0, total: 0 });
    }
  };

  const handleCancelChain = () => {
    cancelChainRef.current = true;
    toast({ title: "Cancelling generation..." });
  };

  const handleAddRow = () => {
    if (!currentStoryboardId) {
      toast({ title: "Please create the storyboard first", variant: "destructive" });
      return;
    }
    addItemMutation.mutate("New scene prompt");
  };

  const handleUpdatePrompt = (id: string, prompt: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, prompt } : item));
    updateItemMutation.mutate({ id, updates: { prompt } });
  };

  const handleUpdateModel = (id: string, model: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, model } : item));
    updateItemMutation.mutate({ id, updates: { model } });
  };

  const handleDownloadImage = (url: string, index: number) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `scene-${index + 1}.png`;
    link.click();
  };

  const handleDownloadSample = () => {
    const sampleData = [
      { prompt: "A serene mountain landscape at sunrise with golden light" },
      { prompt: "A bustling city street at night with neon lights reflecting on wet pavement" },
      { prompt: "A cozy coffee shop interior with warm lighting and vintage decor" },
      { prompt: "An underwater scene with colorful coral reef and tropical fish" },
      { prompt: "A futuristic space station orbiting Earth with stars in the background" }
    ];
    
    const blob = new Blob([JSON.stringify(sampleData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "storyboard-sample.json";
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "Sample file downloaded" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-lg font-semibold w-64"
            placeholder="Storyboard name"
            data-testid="input-storyboard-name"
          />
          {currentStoryboardId && (
            <Badge variant="outline">Auto-saving</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)} data-testid="button-import">
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          {!currentStoryboardId && (
            <Button 
              onClick={() => createStoryboardMutation.mutate()}
              disabled={createStoryboardMutation.isPending}
              data-testid="button-create-storyboard"
            >
              {createStoryboardMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Create Storyboard
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 border-b bg-muted/30">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Global Style Prompt</Label>
            <Textarea
              value={globalStyle}
              onChange={(e) => setGlobalStyle(e.target.value)}
              placeholder="Style to apply to all scenes (e.g., 'cinematic lighting, 4k quality')"
              className="min-h-[80px]"
              data-testid="textarea-global-style"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-medium">Starting Reference Image</Label>
            <div className="flex items-start gap-2">
              {globalImageUrl ? (
                <div className="relative">
                  <img 
                    src={globalImageUrl} 
                    alt="Global reference" 
                    className="w-20 h-20 object-cover rounded border"
                  />
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="absolute -top-2 -right-2 h-5 w-5"
                    onClick={() => setGlobalImageUrl("")}
                    disabled={isGeneratingGlobal || isChainGenerating}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : isGeneratingGlobal ? (
                <div className="flex flex-col items-center justify-center w-20 h-20 border-2 border-dashed rounded bg-muted/50">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-20 h-20 border-2 border-dashed rounded cursor-pointer hover:bg-muted/50">
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUploadGlobalImage}
                    data-testid="input-global-image"
                  />
                  {isUploading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Upload className="w-6 h-6 text-muted-foreground" />
                  )}
                </label>
              )}
              <div className="flex-1 space-y-2">
                <Select value={resolution} onValueChange={setResolution}>
                  <SelectTrigger className="w-full" data-testid="select-resolution">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOLUTION_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!globalImageUrl && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={handleGenerateGlobalImage}
                    disabled={isGeneratingGlobal || !globalStyle.trim()}
                    data-testid="button-generate-global"
                  >
                    {isGeneratingGlobal ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Generate from Prompt
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-medium">Reference Mode</Label>
            <RadioGroup
              value={referenceMode}
              onValueChange={(value: ReferenceMode) => setReferenceMode(value)}
              className="space-y-1"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="global" id="mode-global" />
                <Label htmlFor="mode-global" className="text-sm cursor-pointer">Global - Use starting image for all</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="chain" id="mode-chain" />
                <Label htmlFor="mode-chain" className="text-sm cursor-pointer">Chain - Each uses previous output</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="mode-custom" />
                <Label htmlFor="mode-custom" className="text-sm cursor-pointer">Custom - Upload per row</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {items.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="flex flex-col items-center gap-4">
                <FileJson className="w-12 h-12 text-muted-foreground" />
                <div>
                  <h3 className="font-semibold mb-1">No scenes yet</h3>
                  <p className="text-sm text-muted-foreground">Import a JSON/CSV file or add rows manually</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowImportDialog(true)} data-testid="button-import-empty">
                    <Upload className="w-4 h-4 mr-2" />
                    Import File
                  </Button>
                  <Button onClick={handleAddRow} disabled={!currentStoryboardId} data-testid="button-add-first-row">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Row
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                  <h3 className="font-semibold">{items.length} Scenes</h3>
                  {isChainGenerating && (
                    <Badge variant="secondary" className="animate-pulse">
                      Generating {chainProgress.current}/{chainProgress.total}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleAddRow} disabled={isChainGenerating} data-testid="button-add-row">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Row
                  </Button>
                  {isChainGenerating ? (
                    <Button variant="destructive" size="sm" onClick={handleCancelChain} data-testid="button-cancel-generate">
                      <X className="w-4 h-4 mr-2" />
                      Stop
                    </Button>
                  ) : (
                    <Button size="sm" onClick={handleGenerateAll} disabled={isGeneratingGlobal} data-testid="button-generate-all">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Generate All
                    </Button>
                  )}
                </div>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead className="min-w-[300px]">Prompt</TableHead>
                    <TableHead className="w-48">Model</TableHead>
                    <TableHead className="w-32">Reference</TableHead>
                    <TableHead className="w-32">Generated</TableHead>
                    <TableHead className="w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        <Textarea
                          value={item.prompt}
                          onChange={(e) => handleUpdatePrompt(item.id, e.target.value)}
                          className="min-h-[60px] resize-none"
                          placeholder="Scene prompt"
                          data-testid={`textarea-prompt-${index}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.model || "wan2.6-image"}
                          onValueChange={(value) => handleUpdateModel(item.id, value)}
                        >
                          <SelectTrigger className="w-full" data-testid={`select-model-${index}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {IMAGE_MODELS.map(m => (
                              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {referenceMode === "custom" ? (
                          <div className="w-16 h-16">
                            {item.referenceImageUrl ? (
                              <img 
                                src={item.referenceImageUrl} 
                                alt="Reference" 
                                className="w-full h-full object-cover rounded border"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center border-2 border-dashed rounded text-muted-foreground">
                                <ImageIcon className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="w-16 h-16">
                            {getReferenceImageForItem(item, index) ? (
                              <img 
                                src={getReferenceImageForItem(item, index)} 
                                alt="Reference" 
                                className="w-full h-full object-cover rounded border"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center border-2 border-dashed rounded text-muted-foreground">
                                <Link2 className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="w-16 h-16">
                          {item.status === "generating" ? (
                            <div className="w-full h-full flex items-center justify-center border rounded bg-muted">
                              <Loader2 className="w-4 h-4 animate-spin" />
                            </div>
                          ) : item.generatedImageUrl ? (
                            <img 
                              src={item.generatedImageUrl} 
                              alt="Generated" 
                              className="w-full h-full object-cover rounded border cursor-pointer hover:opacity-80"
                              onClick={() => window.open(item.generatedImageUrl!, "_blank")}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center border-2 border-dashed rounded text-muted-foreground">
                              <ImageIcon className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleGenerate(item, index)}
                            disabled={item.status === "generating" || generateItemMutation.isPending}
                            title="Generate"
                            data-testid={`button-generate-${index}`}
                          >
                            <RefreshCw className={`w-4 h-4 ${item.status === "generating" ? "animate-spin" : ""}`} />
                          </Button>
                          {item.generatedImageUrl && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownloadImage(item.generatedImageUrl!, index)}
                              title="Download"
                              data-testid={`button-download-${index}`}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteItemMutation.mutate(item.id)}
                            title="Delete"
                            data-testid={`button-delete-${index}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </div>
      </ScrollArea>

      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Storyboard</DialogTitle>
            <DialogDescription>
              Upload a JSON or CSV file with scene prompts
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv"
                className="hidden"
                onChange={handleImportFile}
                data-testid="input-import-file"
              />
              <div className="flex flex-col items-center gap-4">
                <div className="flex gap-4">
                  <FileJson className="w-10 h-10 text-muted-foreground" />
                  <FileSpreadsheet className="w-10 h-10 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Drop file here or click to upload</p>
                  <p className="text-sm text-muted-foreground">Supports JSON and CSV formats</p>
                </div>
                <Button onClick={() => fileInputRef.current?.click()} data-testid="button-select-file">
                  Select File
                </Button>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">Expected formats:</p>
              <div className="space-y-2">
                <div>
                  <p className="font-mono text-xs">JSON: {"[{ \"prompt\": \"scene 1\" }, { \"prompt\": \"scene 2\" }]"}</p>
                </div>
                <div>
                  <p className="font-mono text-xs">CSV: prompt,model</p>
                  <p className="font-mono text-xs">scene 1,wan2.6-image</p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
            <Button variant="outline" onClick={handleDownloadSample} data-testid="button-download-sample">
              <Download className="w-4 h-4 mr-2" />
              Download Sample
            </Button>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
