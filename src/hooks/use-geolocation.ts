import { useCallback, useEffect, useRef, useState } from "react";

export type GeoStatus = "idle" | "loading" | "granted" | "denied" | "unsupported";

export type GeoCoords = { lat: number; lng: number; accuracy?: number };

export type GeoState = {
  status: GeoStatus;
  coords: GeoCoords | null;
  error: string | null;
};

/**
 * Browser Geolocation with graceful fallbacks.
 * - status "unsupported" when the API is missing
 * - status "denied" when the user blocks access (UI should show manual city input)
 */
export function useGeolocation(auto = false) {
  const [state, setState] = useState<GeoState>({
    status: "idle",
    coords: null,
    error: null,
  });

  const request = useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setState({ status: "unsupported", coords: null, error: "Geolocation is not supported on this device." });
      return;
    }
    setState((s) => ({ ...s, status: "loading", error: null }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          status: "granted",
          coords: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          },
          error: null,
        });
      },
      (err) => {
        setState({
          status: err.code === err.PERMISSION_DENIED ? "denied" : "idle",
          coords: null,
          error:
            err.code === err.PERMISSION_DENIED
              ? "Location access denied. Enter your city manually."
              : "Couldn't get your location. Try again or enter your city.",
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, []);

  useEffect(() => {
    if (auto) request();
  }, [auto, request]);

  return { ...state, request };
}

/** Reverse-geocode lat/lng to a short human-readable address via Nominatim. */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`;
    const res = await fetch(url, { headers: { "Accept-Language": "en", "User-Agent": "CommuteSaathi/1.0" } });
    if (!res.ok) return null;
    const data = await res.json() as { address?: Record<string, string>; display_name?: string };
    const a = data.address ?? {};
    const parts = [
      a.road ?? a.pedestrian ?? a.footway,
      a.neighbourhood ?? a.suburb ?? a.city_district,
      a.city ?? a.town ?? a.village ?? a.county,
    ].filter(Boolean);
    return parts.length > 0
      ? parts.slice(0, 2).join(", ")
      : (data.display_name?.split(",").slice(0, 2).join(",").trim() ?? null);
  } catch {
    return null;
  }
}

/** React hook: resolves coords → address string automatically. */
export function useAddressFromCoords(coords: GeoCoords | null): { address: string | null; loading: boolean } {
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    if (!coords) { setAddress(null); return; }
    const key = `${coords.lat.toFixed(4)},${coords.lng.toFixed(4)}`;
    if (key === lastKey.current) return;
    lastKey.current = key;
    setLoading(true);
    reverseGeocode(coords.lat, coords.lng)
      .then(a => setAddress(a))
      .catch(() => setAddress(null))
      .finally(() => setLoading(false));
  }, [coords?.lat, coords?.lng]);

  return { address, loading };
}

/** Geocode a free-text place into coordinates using OpenStreetMap Nominatim. */
export async function geocodePlace(query: string): Promise<GeoCoords | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
      query + ", India",
    )}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}
