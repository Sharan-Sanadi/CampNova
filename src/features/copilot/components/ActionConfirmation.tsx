import { CalendarCheck, Check, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/common/components/dialog";
import { Button } from "@/common/components/button";
import { Panel, StatusPill } from "@/shared/primitives";
import type { CopilotCandidate, CopilotSlot } from "@/data/copilot";
import { Link } from "@tanstack/react-router";

/** Step 9 — action confirmation before anything is committed. */
export function ActionConfirmation({
  candidate,
  slot,
  open,
  pending,
  onOpenChange,
  onConfirm,
}: {
  candidate: CopilotCandidate | null;
  slot: CopilotSlot | undefined;
  open: boolean;
  pending: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
}) {
  if (!candidate) return null;
  const window = slot ? `${slot.dayLabel} · ${slot.start}–${slot.end}` : candidate.availability;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-medium">Reserve {candidate.name}</DialogTitle>
          <DialogDescription className="text-meta">
            CampusOS will submit this reservation for approval. Nothing is committed until you
            confirm.
          </DialogDescription>
        </DialogHeader>

        <dl className="divide-border border-border divide-y border-y text-[13px]">
          {[
            ["When", window],
            ["Where", `${candidate.building}`],
            ["Capacity", `${candidate.capacity} seats`],
            ["Equipment", candidate.amenities.slice(0, 3).join(" · ")],
          ].map(([k, v]) => (
            <div key={k} className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3 py-2.5">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="min-w-0 font-medium">{v}</dd>
            </div>
          ))}
        </dl>

        <ul className="space-y-1.5">
          {["No scheduling conflict", "Resource available", "Requirements satisfied"].map((c) => (
            <li key={c} className="flex items-center gap-2 text-[13px]">
              <Check className="text-success size-3.5 shrink-0" aria-hidden />
              {c}
            </li>
          ))}
        </ul>

        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={onConfirm} disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden /> Reserving…
              </>
            ) : (
              "Confirm reservation"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Step 10 — success state, kept subtle and linked into the rest of CampusOS. */
export function SuccessState({
  candidate,
  slot,
}: {
  candidate: CopilotCandidate;
  slot: CopilotSlot | undefined;
}) {
  const window = slot ? `${slot.dayLabel} · ${slot.start}–${slot.end}` : candidate.availability;
  return (
    <Panel className="enter-up border-success/30 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="bg-success/12 text-success grid size-8 shrink-0 place-items-center rounded-md">
            <CalendarCheck className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium">Reservation confirmed</p>
            <p className="text-meta mt-1">
              {candidate.name} · {window} · pending departmental approval
            </p>
          </div>
        </div>
        <StatusPill tone="success">Booked</StatusPill>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <Link to="/bookings">View in bookings</Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link to="/resources/$id" params={{ id: candidate.resourceId }}>
            Open resource
          </Link>
        </Button>
      </div>
    </Panel>
  );
}
