import { useSyncExternalStore } from "react";
import { getCampusVersion, subscribeCampus } from "@/data/campus";

/**
 * Subscribes a component to the shared CampusOS mock state so bookings,
 * dashboard counters, notifications and resources stay in sync.
 */
export function useCampusVersion(): number {
  return useSyncExternalStore(subscribeCampus, getCampusVersion, () => 0);
}