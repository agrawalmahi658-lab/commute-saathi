import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { getGroqModel } from "./ai-gateway.server";

export type PlannedStep = { mode: string; icon: string; duration: string; detail: string };
export type FareItem = { item: string; fare: string };
export type PlannedRoute = {
  id: string;
  label: string;
  badge: string;
  desc: string;
  fare: string;
  time: string;
  safety: string;
  crowd: string;
  savings: string;
  highlight: boolean;
  steps: PlannedStep[];
  fareBreakdown: FareItem[];
};

const SuggestInput = z.object({
  origin: z.string().max(200).optional(),
  destination: z.string().min(1).max(200),
  profile: z.string().max(60).optional(),
  originLat: z.number().optional(),
  originLng: z.number().optional(),
  destinationLat: z.number().optional(),
  destinationLng: z.number().optional(),
});

export function fallbackRoutes(destination: string): PlannedRoute[] {
  return [
    {
      id: "recommended",
      label: "Recommended",
      badge: "🏆",
      desc: "Bus 312 + Metro Line 2",
      fare: "₹12",
      time: "32 min",
      safety: "9.2",
      crowd: "Low",
      savings: "Save ₹168 vs Auto",
      highlight: true,
      steps: [
        { mode: "Walk", icon: "🚶", duration: "3 min", detail: "Exit from your location" },
        { mode: "Bus 312", icon: "🚌", duration: "15 min", detail: `Towards ${destination}` },
        { mode: "Metro L2", icon: "🚇", duration: "10 min", detail: `Interchange → ${destination}` },
        { mode: "Walk", icon: "🚶", duration: "4 min", detail: "Metro exit → destination" },
      ],
      fareBreakdown: [
        { item: "Bus 312", fare: "₹8" },
        { item: "Metro Line 2", fare: "₹14" },
        { item: "Student Discount", fare: "−₹10" },
        { item: "Total", fare: "₹12" },
      ],
    },
    {
      id: "fastest",
      label: "Fastest",
      badge: "⚡",
      desc: "Ola / Uber Share",
      fare: "₹45",
      time: "20 min",
      safety: "8.5",
      crowd: "Medium",
      savings: "25 mins faster",
      highlight: false,
      steps: [
        { mode: "Walk", icon: "🚶", duration: "2 min", detail: "To pickup point" },
        { mode: "Cab Share", icon: "🚖", duration: "18 min", detail: `Direct to ${destination}` },
      ],
      fareBreakdown: [
        { item: "Base fare", fare: "₹35" },
        { item: "Distance", fare: "₹15" },
        { item: "Shared discount", fare: "−₹5" },
        { item: "Total", fare: "₹45" },
      ],
    },
    {
      id: "comfort",
      label: "Least Crowded",
      badge: "😌",
      desc: "Bus 402 + Walk 4 min",
      fare: "₹18",
      time: "38 min",
      safety: "8.9",
      crowd: "Very Low",
      savings: "Most comfortable",
      highlight: false,
      steps: [
        { mode: "Walk", icon: "🚶", duration: "5 min", detail: "To Bus 402 stop" },
        { mode: "Bus 402", icon: "🚌", duration: "29 min", detail: `Towards ${destination}` },
        { mode: "Walk", icon: "🚶", duration: "4 min", detail: "Stop → destination" },
      ],
      fareBreakdown: [
        { item: "Bus 402", fare: "₹18" },
        { item: "Total", fare: "₹18" },
      ],
    },
  ];
}

const PROMPT = (
  origin: string,
  destination: string,
  profile: string,
  originCoords?: string,
  destCoords?: string,
) => `You are Saathi, an AI mobility planner for commuters across Bharat (India).
Plan 3 realistic commute options from "${origin}" to "${destination}" for a ${profile}.
${originCoords ? `Exact GPS origin: ${originCoords} (use this for accurate distance and transit calculations)` : ""}
${destCoords ? `Exact GPS destination: ${destCoords}` : ""}
Use real public transport options available near these coordinates in India (city buses, metro, local train, auto-rickshaw, shared cab).
Keep all fares in Indian Rupees — realistic amounts for India (bus: ₹8-25, metro: ₹10-50, auto: ₹30-150, cab share: ₹40-200).
Estimate realistic travel times based on actual distance between the coordinates.
Show specific bus numbers, metro lines, or train names that actually serve the area when known.

Return ONLY valid minified JSON (no markdown, no prose) of this exact shape:
{"routes":[{"id":"string","label":"Recommended|Fastest|Least Crowded","badge":"emoji","desc":"short summary","fare":"₹NN","time":"NN min","safety":"N.N","crowd":"Low|Medium|High|Very Low","savings":"short benefit","highlight":true|false,"steps":[{"mode":"string","icon":"emoji","duration":"NN min","detail":"string"}],"fareBreakdown":[{"item":"string","fare":"₹NN"}]}]}
Exactly 3 routes. The first must have highlight:true and label "Recommended".`;

export const suggestRoutes = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SuggestInput.parse(input))
  .handler(async ({ data }) => {
    const origin = data.origin?.trim() || "current location";
    const destination = data.destination.trim();
    const profile = data.profile?.trim() || "daily commuter";
    const originCoords =
      data.originLat != null && data.originLng != null
        ? `${data.originLat.toFixed(6)},${data.originLng.toFixed(6)}`
        : undefined;
    const destCoords =
      data.destinationLat != null && data.destinationLng != null
        ? `${data.destinationLat.toFixed(6)},${data.destinationLng.toFixed(6)}`
        : undefined;

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return { routes: fallbackRoutes(destination), source: "fallback" as const, error: null };
    }

    try {
      const { text } = await generateText({
        model: getGroqModel("llama-3.3-70b-versatile"),
        prompt: PROMPT(origin, destination, profile, originCoords, destCoords),
      });
      const json = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(json) as { routes?: PlannedRoute[] };
      if (!parsed.routes || !Array.isArray(parsed.routes) || parsed.routes.length === 0) {
        throw new Error("empty");
      }
      const routes = parsed.routes.slice(0, 3).map((r, i) => ({
        id: r.id || `route-${i}`,
        label: r.label || (i === 0 ? "Recommended" : `Option ${i + 1}`),
        badge: r.badge || "🚌",
        desc: r.desc || "",
        fare: r.fare || "₹--",
        time: r.time || "-- min",
        safety: r.safety || "8.5",
        crowd: r.crowd || "Medium",
        savings: r.savings || "",
        highlight: i === 0,
        steps: Array.isArray(r.steps) ? r.steps : [],
        fareBreakdown: Array.isArray(r.fareBreakdown) ? r.fareBreakdown : [],
      }));
      return { routes, source: "ai" as const, error: null };
    } catch (err) {
      const status = (err as { statusCode?: number; status?: number })?.statusCode ??
        (err as { status?: number })?.status;
      if (status === 429) {
        return { routes: fallbackRoutes(destination), source: "fallback" as const, error: "Saathi is busy — showing saved routes." };
      }
      return { routes: fallbackRoutes(destination), source: "fallback" as const, error: null };
    }
  });
