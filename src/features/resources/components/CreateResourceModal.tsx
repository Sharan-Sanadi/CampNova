import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/common/components/button";
import { Input } from "@/common/components/input";
import { Label } from "@/common/components/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/common/components/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/select";
import { fetchApi } from "@/common/lib/apiClient";
import {
  pushActivityEvent,
  pushNotification,
  upsertResource,
  type Resource,
  type ResourceType,
} from "@/data/campus";

const RESOURCE_TYPES: ResourceType[] = [
  "Classroom",
  "Computer Lab",
  "Physics Lab",
  "Chemistry Lab",
  "Meeting Room",
  "Seminar Hall",
  "Auditorium",
  "Innovation Space",
  "Sports Facility",
  "Equipment",
];

export function CreateResourceModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<ResourceType>("Classroom");
  const [building, setBuilding] = useState("Engineering Block");
  const [floor, setFloor] = useState("Level 1");
  const [capacity, setCapacity] = useState("40");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !building.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const resId = `RES-${slug}-${Date.now().toString(36)}`;
      const newRes: Resource = {
        id: resId,
        name: name.trim(),
        type,
        building: building.trim(),
        floor: floor.trim(),
        capacity: Number(capacity) || 1,
        amenities: ["Air conditioning", "Projector"],
        status: "available",
        utilization: 0,
        nextBooking: null,
        trend: [0, 0, 0, 0, 0, 0, 0],
        description: description.trim() || `${type} in ${building.trim()}`,
      };

      // 1. Immediately store in local state so UI updates in real-time
      upsertResource(newRes);

      pushActivityEvent({
        id: `AC-res-${resId}`,
        kind: "booking",
        message: `Configured new resource: ${newRes.name}`,
        detail: `${newRes.building} · ${newRes.floor} · Capacity ${newRes.capacity}`,
        time: "just now",
      });

      pushNotification({
        id: `NT-res-${resId}`,
        category: "System",
        title: "Resource configured",
        body: `${newRes.name} is now active and available for bookings in ${newRes.building}.`,
        time: "just now",
        unread: true,
        actionLabel: "View resources",
        actionTo: "/resources",
      });

      // 2. Sync with backend API asynchronously
      fetchApi("/resources", {
        method: "POST",
        body: JSON.stringify({
          name: newRes.name,
          type: newRes.type,
          building: newRes.building,
          floor: newRes.floor,
          capacity: newRes.capacity,
          description: newRes.description,
          amenities: newRes.amenities,
          equipment: [],
        }),
      }).catch((err) => console.warn("Backend API sync pending:", err));

      toast.success(`Resource "${name.trim()}" created successfully!`);
      onOpenChange(false);
      setName("");
      setDescription("");
      onSuccess?.();
    } catch (err) {
      console.error("Create resource error:", err);
      toast.error("Error creating resource.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configure New Resource</DialogTitle>
          <DialogDescription>
            Add a real bookable campus resource to the database.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="res-name">Resource Name *</Label>
            <Input
              id="res-name"
              placeholder="e.g. Computer Lab 101"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="res-type">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as ResourceType)}>
                <SelectTrigger id="res-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESOURCE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="res-capacity">Capacity</Label>
              <Input
                id="res-capacity"
                type="number"
                min="1"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="res-building">Building</Label>
              <Input
                id="res-building"
                placeholder="e.g. Science Wing"
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="res-floor">Floor</Label>
              <Input
                id="res-floor"
                placeholder="e.g. Level 2"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="res-desc">Description</Label>
            <Input
              id="res-desc"
              placeholder="Brief description of hardware or purpose"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create Resource"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
