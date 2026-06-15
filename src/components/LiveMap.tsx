import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export type MapPoint = { lat: number; lng: number; label?: string; color?: string };

type LiveMapProps = {
  center?: MapPoint;
  origin?: MapPoint | null;
  destination?: MapPoint | null;
  height?: number | string;
  className?: string;
  zoom?: number;
};

/**
 * Live OpenStreetMap map powered by Leaflet.
 * Imported dynamically so it only ever runs in the browser (no SSR window crash).
 */
export function LiveMap({
  center,
  origin,
  destination,
  height = 180,
  className = "",
  zoom = 13,
}: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layerRef = useRef<any>(null);

  const fallback = center ?? origin ?? destination ?? { lat: 19.076, lng: 72.8777 }; // Mumbai default

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current, {
          zoomControl: true,
          attributionControl: false,
          scrollWheelZoom: false,
        }).setView([fallback.lat, fallback.lng], zoom);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
        }).addTo(mapRef.current);
      }

      const map = mapRef.current;
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
      }
      const group = L.layerGroup().addTo(map);
      layerRef.current = group;

      const makeMarker = (p: MapPoint, fill: string) =>
        L.circleMarker([p.lat, p.lng], {
          radius: 9,
          color: "#ffffff",
          weight: 3,
          fillColor: fill,
          fillOpacity: 1,
        })
          .addTo(group)
          .bindTooltip(p.label ?? "", { permanent: false, direction: "top" });

      const pts: [number, number][] = [];
      if (origin) {
        makeMarker(origin, origin.color ?? "#14B8A6");
        pts.push([origin.lat, origin.lng]);
      }
      if (destination) {
        makeMarker(destination, destination.color ?? "#F59E0B");
        pts.push([destination.lat, destination.lng]);
      }
      if (!origin && !destination) {
        makeMarker(fallback, "#14B8A6");
      }
      if (origin && destination) {
        L.polyline(
          [
            [origin.lat, origin.lng],
            [destination.lat, destination.lng],
          ],
          { color: "#14B8A6", weight: 4, opacity: 0.7, dashArray: "8 8" },
        ).addTo(group);
      }

      if (pts.length === 2) {
        map.fitBounds(pts, { padding: [40, 40], maxZoom: 14 });
      } else if (pts.length === 1) {
        map.setView(pts[0], zoom);
      } else {
        map.setView([fallback.lat, fallback.lng], zoom);
      }

      // make sure the map sizes correctly inside animated containers
      setTimeout(() => map.invalidateSize(), 150);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng, zoom]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ height, width: "100%", zIndex: 0 }}
    />
  );
}
