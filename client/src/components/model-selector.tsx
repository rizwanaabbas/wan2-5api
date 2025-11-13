import { WAN_MODELS, getModelsByCategory, MODEL_CATEGORIES, type ModelDefinition } from "@shared/models";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Zap, DollarSign } from "lucide-react";

interface ModelSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ModelSelector({ value, onChange, disabled }: ModelSelectorProps) {
  const modelsByCategory = getModelsByCategory();
  const selectedModel = WAN_MODELS[value];

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="model-select">Model</Label>
        <Select
          value={value}
          onValueChange={onChange}
          disabled={disabled}
        >
          <SelectTrigger id="model-select" data-testid="select-model">
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(modelsByCategory).map(([category, models]) => (
              <SelectGroup key={category}>
                <SelectLabel className="text-xs font-semibold uppercase tracking-wide">
                  {MODEL_CATEGORIES[category as keyof typeof MODEL_CATEGORIES]}
                </SelectLabel>
                {models.map((model) => (
                  <SelectItem
                    key={model.id}
                    value={model.id}
                    data-testid={`option-model-${model.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{model.name}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{model.type}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedModel && (
        <Card className="bg-muted/50" data-testid="card-model-description">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h4 className="text-sm font-semibold mb-1">{selectedModel.name}</h4>
                <p className="text-sm text-muted-foreground">{selectedModel.bestUseCase}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-yellow-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Speed</p>
                  <p className="text-xs font-medium">{selectedModel.speed}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Quality</p>
                  <p className="text-xs font-medium">{selectedModel.quality}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-green-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Cost</p>
                  <p className="text-xs font-medium">{selectedModel.cost}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
