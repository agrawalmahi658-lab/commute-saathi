import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CommuteSaathiApp } from "@/components/CommuteSaathiApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CommuteSaathi — AI Mobility Companion for Bharat" },
      {
        name: "description",
        content:
          "CommuteSaathi is your AI travel companion for smarter, safer and cheaper commutes across Bharat — voice-first, multilingual, and built for every commuter.",
      },
      { property: "og:title", content: "CommuteSaathi — AI Mobility Companion for Bharat" },
      {
        property: "og:description",
        content:
          "Smarter, safer and cheaper commutes across Bharat. Voice-first AI mobility companion for daily workers, students, delivery partners and women commuters.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  // motion + recharts touch the DOM; render only on the client.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900" />
    );
  }

  return <CommuteSaathiApp />;
}
