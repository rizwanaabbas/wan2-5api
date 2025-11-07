import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageSquare, Music } from "lucide-react";
import { Card } from "@/components/ui/card";

interface PromptBuilderProps {
  value: string;
  onChange: (value: string) => void;
  showHelpers?: boolean;
}

export function PromptBuilder({ value, onChange, showHelpers = true }: PromptBuilderProps) {
  const [cursorPosition, setCursorPosition] = useState(0);

  const insertTag = (openTag: string, closeTag: string, placeholder: string) => {
    const textarea = document.querySelector('textarea[data-prompt-builder]') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = value;

    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);

    const insertText = selection || placeholder;
    const newText = `${before}${openTag}${insertText}${closeTag}${after}`;

    onChange(newText);

    setTimeout(() => {
      const newPosition = start + openTag.length + insertText.length;
      textarea.focus();
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="prompt" className="text-sm font-semibold">
          Prompt
        </Label>
        <p className="text-xs text-muted-foreground mt-1">
          Describe your video in detail. For Ovi model, use special tags for speech and audio.
        </p>
      </div>

      <Textarea
        id="prompt"
        data-prompt-builder
        placeholder="A cinematic shot of a bustling city street at sunset. <S>The future is here.<E> <AUDCAP>Urban ambience with distant traffic sounds<ENDAUDCAP>"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setCursorPosition(e.target.selectionStart);
        }}
        className="min-h-32 resize-none font-mono text-sm"
        data-testid="textarea-prompt"
      />

      {showHelpers && (
        <Card className="p-4 bg-muted/30">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 bg-primary rounded-full" />
            <h4 className="text-sm font-semibold">Ovi Tag Helpers</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => insertTag("<S>", "<E>", "Speech text here")}
              className="text-xs"
              data-testid="button-insert-speech"
            >
              <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
              Insert Speech
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => insertTag("<AUDCAP>", "<ENDAUDCAP>", "Audio description here")}
              className="text-xs"
              data-testid="button-insert-audio"
            >
              <Music className="w-3.5 h-3.5 mr-1.5" />
              Insert Audio
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            <strong>Speech Tags:</strong> <code className="bg-background px-1 py-0.5 rounded">
              &lt;S&gt;...&lt;E&gt;
            </code>{" "}
            for spoken dialogue •{" "}
            <strong>Audio Tags:</strong> <code className="bg-background px-1 py-0.5 rounded">
              &lt;AUDCAP&gt;...&lt;ENDAUDCAP&gt;
            </code>{" "}
            for sound effects
          </p>
        </Card>
      )}
    </div>
  );
}
