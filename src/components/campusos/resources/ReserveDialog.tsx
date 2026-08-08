import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusPill, Tag } from "@/components/campusos/ui/primitives";
import type { ResourceProfile } from "@/data/resources";
import { dateForDayLabel } from "@/data/bookingEngine";

export interface ReservePrefill {
  day: string;
  start: string;
  end: string;
  attendees?: number;
  /** ISO date when the caller knows it (availability slots do). */
  date?: string;
}

/**
 * BOOKING BRIDGE — hands off to the Smart Booking composer with the
 * resource, date, time and attendee count already understood.
 */
export function ReserveDialog({
  resource,
  prefill,
  open,
  onOpenChange,
}: {
  resource: ResourceProfile;
  prefill: ReservePrefill | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [attendees, setAttendees] = useState(String(prefill?.attendees ?? Math.min(resource.capacity, 40)));
  const [purpose, setPurpose] = useState("");

  const submit = () => {
    setPending(true);
    window.setTimeout(() => {
      setPending(false);
      onOpenChange(false);
      toast.success("Handed to Smart Booking", {
        description: `${resource.name} · ${prefill?.day ?? "Today"} ${prefill?.start ?? "14:00"}–${prefill?.end ?? "16:00"} — CampusOS is checking constraints.`,
      });
      void navigate({
        to: "/bookings",
        search: {
          compose: true,
          resource: resource.id,
          date: prefill?.date ?? dateForDayLabel(prefill?.day ?? "Today"),
          start: prefill?.start ?? "14:00",
          end: prefill?.end ?? "16:00",
          attendees: Number(attendees) || Math.min(resource.capacity, 40),
          ...(purpose ? { purpose } : {}),
        },
      });
    }, 650);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-medium">Reserve {resource.name}</DialogTitle>
          <DialogDescription className="text-sm">
            CampusOS pre-filled this request from your resource search. It hands off to the Bookings
            module for approval.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border-border bg-surface-2 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">{resource.name}</p>
              <StatusPill tone={resource.status === "available" ? "success" : "warning"}>
                {resource.status === "available" ? "Available" : "Limited"}
              </StatusPill>
            </div>
            <p className="text-meta mt-1">
              {resource.building} · {resource.floor} · {resource.capacity} seats
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {resource.equipment.slice(0, 4).map((e) => (
                <Tag key={e}>{e}</Tag>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="res-day" className="text-xs">
                Date
              </Label>
              <Input id="res-day" defaultValue={prefill?.day ?? "Today"} readOnly className="bg-surface" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="res-time" className="text-xs">
                Time
              </Label>
              <Input
                id="res-time"
                defaultValue={`${prefill?.start ?? "14:00"}–${prefill?.end ?? "16:00"}`}
                readOnly
                className="bg-surface"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="res-att" className="text-xs">
              Attendees
            </Label>
            <Input
              id="res-att"
              inputMode="numeric"
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
              className="bg-surface"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="res-purpose" className="text-xs">
              Purpose
            </Label>
            <Input
              id="res-purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Applied LLMs workshop"
              className="bg-surface"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} disabled={pending}>
            {pending ? "Submitting…" : "Send to Bookings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
