// Hooks that back the Route History, Savings Dashboard and Wage Guardian
// screens with live Firestore / profile data, falling back to demo data when
// the user is signed out so the UI always looks complete.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { RouteHistory, type RouteRecord, type WithId } from "@/lib/firestore-service";

export interface TripView {
  id?: string;
  date: string;
  from: string;
  to: string;
  fare: number;
  time: string;
  safety: number;
  mode: string;
  saved: number;
  live?: boolean;
}

const WAGE_KEY = "commute-saathi.dailyWage";

const DEMO_TRIPS: TripView[] = [
  { date: "Today, 8:15 AM", from: "Sakinaka", to: "Andheri Stn", fare: 12, time: "32 min", safety: 9.2, mode: "Bus+Metro", saved: 168 },
  { date: "Yesterday, 8:20 AM", from: "Sakinaka", to: "Andheri Stn", fare: 12, time: "35 min", safety: 8.9, mode: "Bus+Metro", saved: 168 },
  { date: "Mon Jun 13, 8:30 AM", from: "Sakinaka", to: "Kurla Market", fare: 8, time: "18 min", safety: 8.4, mode: "Bus 312", saved: 42 },
  { date: "Sun Jun 12, 10:00 AM", from: "Andheri", to: "Dadar Station", fare: 22, time: "42 min", safety: 9.0, mode: "Metro L2", saved: 98 },
  { date: "Sat Jun 11, 9:15 AM", from: "Sakinaka", to: "Ghatkopar Mall", fare: 8, time: "20 min", safety: 8.7, mode: "Bus 421", saved: 52 },
  { date: "Fri Jun 10, 8:15 AM", from: "Sakinaka", to: "Andheri Stn", fare: 12, time: "31 min", safety: 9.3, mode: "Bus+Metro", saved: 168 },
  { date: "Thu Jun 9, 8:10 AM", from: "Sakinaka", to: "Andheri Stn", fare: 18, time: "38 min", safety: 8.5, mode: "Bus 402", saved: 102 },
];

function tsToDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const v = value as { toDate?: () => Date; seconds?: number };
  if (typeof v.toDate === "function") return v.toDate();
  if (typeof v.seconds === "number") return new Date(v.seconds * 1000);
  return null;
}

function formatDate(d: Date | null): string {
  if (!d) return "Recent";
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  if (sameDay) return `Today, ${time}`;
  return `${d.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })}, ${time}`;
}

function toTripView(r: RouteRecord & WithId): TripView {
  return {
    id: r.id,
    date: formatDate(tsToDate(r.createdAt) ?? tsToDate(r.savedAt)),
    from: r.from,
    to: r.to,
    fare: r.fare ?? 0,
    time: r.durationMin ? `${r.durationMin} min` : "—",
    safety: r.safety ?? 8.5,
    mode: r.mode ?? "Bus",
    saved: r.saved ?? 0,
    live: true,
  };
}

/**
 * Live route history. Returns demo trips when signed out or empty so the
 * timeline always renders. `isLive` indicates real Firestore data.
 */
export function useRouteHistory() {
  const { user } = useAuth();
  const [records, setRecords] = useState<(RouteRecord & WithId)[] | null>(null);

  useEffect(() => {
    if (!user) {
      setRecords(null);
      return;
    }
    const unsub = RouteHistory.subscribe(user.uid, setRecords);
    return unsub;
  }, [user]);

  const liveTrips = (records ?? []).map(toTripView);
  const isLive = !!user && liveTrips.length > 0;
  const trips = isLive ? liveTrips : DEMO_TRIPS;

  const logTrip = useCallback(
    async (trip: Omit<RouteRecord, "createdAt">) => {
      if (!user) return;
      await RouteHistory.add(user.uid, trip);
    },
    [user],
  );

  return {
    trips,
    isLive,
    canLog: !!user,
    logTrip,
    totalSaved: trips.reduce((a, t) => a + t.saved, 0),
    totalTrips: trips.length,
    avgSafety: trips.length
      ? Math.round((trips.reduce((a, t) => a + t.safety, 0) / trips.length) * 10) / 10
      : 0,
  };
}

/**
 * Derived savings analytics from live route history (or demo data).
 */
export function useSavings() {
  const { trips, isLive } = useRouteHistory();
  return useMemo(() => {
    const totalSaved = trips.reduce((a, t) => a + t.saved, 0);
    const totalSpent = trips.reduce((a, t) => a + t.fare, 0);
    const altCost = totalSaved + totalSpent;
    const costReduction = altCost > 0 ? Math.round((totalSaved / altCost) * 100) : 0;
    // Group savings by route for the per-route breakdown.
    const byRoute = new Map<string, { saved: number; trips: number }>();
    for (const t of trips) {
      const key = `${t.from} → ${t.to}`;
      const cur = byRoute.get(key) ?? { saved: 0, trips: 0 };
      byRoute.set(key, { saved: cur.saved + t.saved, trips: cur.trips + 1 });
    }
    const maxSaved = Math.max(1, ...[...byRoute.values()].map((r) => r.saved));
    const routes = [...byRoute.entries()]
      .map(([route, v]) => ({ route, saved: v.saved, trips: v.trips, pct: Math.round((v.saved / maxSaved) * 100) }))
      .sort((a, b) => b.saved - a.saved)
      .slice(0, 4);
    return { totalSaved, totalSpent, costReduction, totalTrips: trips.length, routes, isLive };
  }, [trips, isLive]);
}

/**
 * Daily wage with persistence: Firestore profile when signed in,
 * localStorage otherwise.
 */
export function useWage(defaultWage = 600) {
  const { user, profile, saveProfile } = useAuth();
  const [wage, setWageState] = useState<number>(defaultWage);

  // Hydrate from localStorage on mount (client only).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(WAGE_KEY);
    if (stored) setWageState(Number(stored));
  }, []);

  // Prefer the signed-in profile value when available.
  useEffect(() => {
    if (profile?.dailyWage) setWageState(profile.dailyWage);
  }, [profile?.dailyWage]);

  const setWage = useCallback(
    (value: number) => {
      setWageState(value);
      if (typeof window !== "undefined") window.localStorage.setItem(WAGE_KEY, String(value));
      if (user) void saveProfile({ dailyWage: value });
    },
    [user, saveProfile],
  );

  return { wage, setWage, persisted: !!user };
}
