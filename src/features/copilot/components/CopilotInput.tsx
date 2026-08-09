import { useEffect, useRef } from "react";
import { ArrowUp, Loader2, Square, X } from "lucide-react";
import { Button } from "@/common/components/button";

export function CopilotInput({
  value,
  onChange,
  onSubmit,
  busy,
  hint,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  busy: boolean;
  hint?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!busy) ref.current?.focus();
  }, [busy]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [value]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="bg-background/90 sticky bottom-0 z-10 pt-3 pb-4 backdrop-blur-md"
    >
      <div className="panel focus-within:border-border-strong focus-within:ring-ring/40 flex items-end gap-2 p-2 transition-[border-color,box-shadow] duration-200 focus-within:ring-2">
        <textarea
          ref={ref}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit();
            }
            if (e.key === "Escape") onChange("");
          }}
          placeholder="Ask CampusOS anything…"
          aria-label="Ask CampusOS"
          className="placeholder:text-muted-foreground/70 max-h-44 min-h-10 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm leading-relaxed outline-none"
        />
        {value ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Clear input"
            onClick={() => onChange("")}
            className="shrink-0"
          >
            <X className="size-4" aria-hidden />
          </Button>
        ) : null}
        <Button
          type="submit"
          size="icon"
          aria-label={busy ? "CampusOS is working" : "Send request"}
          disabled={busy || !value.trim()}
          className="size-9 shrink-0"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <ArrowUp className="size-4" aria-hidden />
          )}
        </Button>
      </div>
      <p className="text-muted-foreground/70 mt-2 flex items-center gap-2 px-1 text-[11px]">
        <Square className="size-2.5" aria-hidden />
        {hint ??
          "CampusOS reasons over campus data. Recommended actions require confirmation before they take effect."}
      </p>
    </form>
  );
}
