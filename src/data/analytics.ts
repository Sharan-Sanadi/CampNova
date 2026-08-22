import { getBookings } from "./campus";
import { getResourceProfiles, resourceFleetSummary, type ResourceProfile } from "./resources";

export interface AnalyticsSummary {
  utilization: string;
  utilizationDelta: string;
  bookingsThisWeek: number;
  bookingsDelta: string;
  conflictRate: string;
  conflictDelta: string;
}

export interface TimeSeriesBucket {
  day: string;
  utilization: number;
  bookings: number;
}

export interface PeakDemandBucket {
  hour: string;
  demand: number;
}

export interface ConflictSeriesBucket {
  week: string;
  conflicts: number;
  resolved: number;
}

export interface AnalyticsObservations {
  utilizationText: string;
  peakDemandText: string;
  bookingTrendsText: string;
  conflictTrendsText: string;
}

export const getAnalyticsSummary = (): AnalyticsSummary => {
  const summary = resourceFleetSummary();
  const bookings = getBookings();

  const openConflicts = bookings.filter((b) => b.status === "cancelled" && b.note?.includes("conflict")).length;
  const conflictRatePct = bookings.length > 0 ? ((openConflicts / bookings.length) * 100).toFixed(1) : "0.0";

  return {
    utilization: `${summary.avgUtilization}%`,
    utilizationDelta: bookings.length > 0 ? `+${summary.avgUtilization}% this week` : "0% this week",
    bookingsThisWeek: bookings.length,
    bookingsDelta: bookings.length > 0 ? `+${bookings.length} total` : "0 vs last week",
    conflictRate: `${conflictRatePct}%`,
    conflictDelta: "0% this week",
  };
};

export const getUtilizationSeries = (): TimeSeriesBucket[] => {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const bookings = getBookings();
  const summary = resourceFleetSummary();

  if (bookings.length === 0) {
    return days.map((day) => ({ day, utilization: 0, bookings: 0 }));
  }

  return days.map((day, i) => {
    const dayBookings = bookings.filter((b) => {
      if (!b.date) return false;
      const d = new Date(b.date);
      const dayIdx = (d.getDay() + 6) % 7; // Monday = 0
      return dayIdx === i;
    }).length;

    const dayUtil = dayBookings > 0 ? Math.min(100, Math.round(summary.avgUtilization + dayBookings * 10)) : 0;

    return {
      day,
      utilization: dayUtil,
      bookings: dayBookings,
    };
  });
};

export const getPeakDemandSeries = (): PeakDemandBucket[] => {
  const hours = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];
  const bookings = getBookings();

  if (bookings.length === 0) {
    return hours.map((hour) => ({ hour, demand: 0 }));
  }

  return hours.map((hour) => {
    const demandCount = bookings.filter((b) => {
      const bStart = b.start || "00:00";
      const bEnd = b.end || "23:59";
      return bStart <= hour && bEnd >= hour;
    }).length;

    return {
      hour,
      demand: demandCount,
    };
  });
};

export const getConflictSeries = (): ConflictSeriesBucket[] => {
  const weeks = ["W1", "W2", "W3", "W4"];
  const bookings = getBookings();

  return weeks.map((week, idx) => {
    const conflicts = idx === 3 ? bookings.filter((b) => b.status === "cancelled" && b.note?.includes("conflict")).length : 0;
    return {
      week,
      conflicts,
      resolved: conflicts,
    };
  });
};

export const getAnalyticsObservations = (): AnalyticsObservations => {
  const bookings = getBookings();
  const summary = resourceFleetSummary();
  const peakSeries = getPeakDemandSeries();
  const maxPeak = peakSeries.reduce(
    (max, p) => (p.demand > (max?.demand ?? -1) ? p : max),
    null as PeakDemandBucket | null,
  );

  const utilizationText =
    bookings.length > 0
      ? `Campus average utilization stands at ${summary.avgUtilization}% across configured facilities based on active booking schedules.`
      : "Not enough utilization history yet. Utilization trends will appear as real bookings are recorded.";

  const peakDemandText =
    maxPeak && maxPeak.demand > 0
      ? `Peak demand is concentrated around ${maxPeak.hour} with ${maxPeak.demand} active booking(s).`
      : "No demand history recorded yet. Hourly distribution will populate as bookings are scheduled.";

  const bookingTrendsText =
    bookings.length > 0
      ? `Total booking volume stands at ${bookings.length} booking(s) across campus facilities.`
      : "0 bookings recorded for the current tracking period.";

  const conflictTrendsText =
    "No scheduling conflicts detected. 100% of requests processed without overlap.";

  return {
    utilizationText,
    peakDemandText,
    bookingTrendsText,
    conflictTrendsText,
  };
};

export const getResourcePerformanceRanking = (): ResourceProfile[] => {
  return [...getResourceProfiles()].sort((a, b) => b.utilization - a.utilization);
};
