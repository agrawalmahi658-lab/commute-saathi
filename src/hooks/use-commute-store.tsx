import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { PlannedRoute } from "@/lib/routes.functions";
import type { GeoCoords } from "@/hooks/use-geolocation";

export type RecentRoute = { destination: string; fare: string; time: string; at: number };

type CommuteStore = {
  destination: string;
  setDestination: (d: string) => void;
  originCoords: GeoCoords | null;
  setOriginCoords: (c: GeoCoords | null) => void;
  destinationCoords: GeoCoords | null;
  setDestinationCoords: (c: GeoCoords | null) => void;
  routes: PlannedRoute[];
  setRoutes: (r: PlannedRoute[]) => void;
  selectedRoute: PlannedRoute | null;
  setSelectedRoute: (r: PlannedRoute | null) => void;
  recents: RecentRoute[];
  addRecent: (r: RecentRoute) => void;
};

const Ctx = createContext<CommuteStore | null>(null);
const RECENTS_KEY = "commutesaathi:recents";

export function CommuteStoreProvider({ children }: { children: ReactNode }) {
  const [destination, setDestination] = useState("");
  const [originCoords, setOriginCoords] = useState<GeoCoords | null>(null);
  const [destinationCoords, setDestinationCoords] = useState<GeoCoords | null>(null);
  const [routes, setRoutes] = useState<PlannedRoute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<PlannedRoute | null>(null);
  const [recents, setRecents] = useState<RecentRoute[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENTS_KEY);
      if (raw) setRecents(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const addRecent = useCallback((r: RecentRoute) => {
    setRecents((prev) => {
      const next = [r, ...prev.filter((x) => x.destination !== r.destination)].slice(0, 8);
      try {
        localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return (
    <Ctx.Provider
      value={{
        destination,
        setDestination,
        originCoords,
        setOriginCoords,
        destinationCoords,
        setDestinationCoords,
        routes,
        setRoutes,
        selectedRoute,
        setSelectedRoute,
        recents,
        addRecent,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useCommuteStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCommuteStore must be used within CommuteStoreProvider");
  return ctx;
}
