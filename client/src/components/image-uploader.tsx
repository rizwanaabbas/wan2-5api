import { useState, useCallback } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ImageUploaderProps {
  value: File | null;
  onChange: (file: File | null) => void;
}

export function ImageUploader({ value, onChange }: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      return;
    }

    onChange(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, [onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleRemove = useCallback(() => {
    onChange(null);
    setPreview(null);
  }, [onChange]);

  if (preview) {
    return (
      <Card className="relative overflow-hidden">
        <img
          src={preview}
          alt="Upload preview"
          className="w-full h-64 object-cover"
        />
        <Button
          size="icon"
          variant="destructive"
          className="absolute top-2 right-2"
          onClick={handleRemove}
          data-testid="button-remove-image"
        >
          <X className="w-4 h-4" />
        </Button>
      </Card>
    );
  }

  return (
    <Card
      className={`border-2 border-dashed transition-colors cursor-pointer hover:border-primary/50 ${
        isDragging ? "border-primary bg-primary/5" : "border-border"
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => document.getElementById("image-upload")?.click()}
      data-testid="dropzone-image"
    >
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          {isDragging ? (
            <Upload className="w-8 h-8 text-primary animate-bounce" />
          ) : (
            <ImageIcon className="w-8 h-8 text-primary" />
          )}
        </div>
        <p className="text-sm font-semibold mb-1">
          {isDragging ? "Drop image here" : "Drag image or click to browse"}
        </p>
        <p className="text-xs text-muted-foreground">
          PNG, JPG, WEBP up to 10MB
        </p>
        <input
          id="image-upload"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileInput}
          data-testid="input-image"
        />
      </div>
    </Card>
  );
}
