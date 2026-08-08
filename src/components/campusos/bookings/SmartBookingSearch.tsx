import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CalendarSearch, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, Tag } from "@/components/campusos/ui/primitives";
import { parseBookingRequest, type ParsedBookingRequest } from "@/data/bookingEngine";

const EXAMPLES = [
  "Computer Lab 04 tomorrow 2–4 PM",
  "Find a 100 seat auditorium Friday afternoon",
  "Book a meeting room for 12 people at 3 PM",
  "Best lab for an AI workshop tomorrow",
];

/**
 * Smart booking request input. Understands the request, then hands the
 * parsed intent to the booking composer.
 */
export function SmartBookingSearch({
  onRequest,
}: {
  onRequest: (parsed: ParsedBookingRequest) => void;
}) {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<ParsedBookingRequest | null>(null);

  const submit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const parsed = parseBookingRequest(trimmed);
    setPreview(parsed);
    onRequest(parsed);
  };

  return (
    <Panel className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="text-primary size-3.5" aria-hidden />
        <p className="text-label text-primary">CampusOS understands your request</p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(text);
        }}
        className="space-y-3"
      >
        <label htmlFor="booking-request" className="block text-sm font-medium">
          What do you need to schedule?
        </label>
        <textarea
          id="booking-request"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(text);
            }
          }}
          rows={2}
          placeholder="e.g. I need Computer Lab 04 tomorrow from 2–4 PM for an AI workshop"
          className="border-border bg-surface focus-visible:ring-ring w-full resize-none rounded-lg border px-3.5 py-2.5 text-sm leading-relaxed focus-visible:ring-2 focus-visible:outline-none"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" size="sm" disabled={!text.trim()}>
            <CalendarSearch className="size-4" aria-hidden />
            Search availability
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void navigate({ to: "/copilot", search: { q: text.trim() || undefined } })}
          >
            <Sparkles className="size-4" aria-hidden />
            Ask CampusOS
          </Button>
        </div>
      </form>

      {preview ? (
        <div className="border-border enter-up mt-4 border-t pt-4">
          <p className="text-label text-muted-foreground mb-2">Interpreted request</p>
          <div className="flex flex-wrap gap-1.5">
            {preview.interpreted.map((i) => (
              <Tag key={i}>{i}</Tag>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => {
                setText(ex);
                submit(ex);
              }}
              className="border-border text-muted-foreground hover:text-foreground hover:border-border-strong rounded-full border px-3 py-1.5 text-xs transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      )}
    </Panel>
  );
}