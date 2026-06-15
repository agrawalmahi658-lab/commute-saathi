import { createFileRoute } from "@tanstack/react-router";
import { streamText } from "ai";
import { z } from "zod";
import { getGroqModel } from "@/lib/ai-gateway.server";

const ChatTurn = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});
const Body = z.object({
  message: z.string().min(1).max(2000),
  history: z.array(ChatTurn).max(20).optional(),
  language: z.string().max(40).optional(),
});

const SYSTEM_PROMPT = `You are "Saathi", the friendly AI mobility companion inside CommuteSaathi — an app for daily-wage workers, delivery partners, college students and women commuters across Bharat (India).

Your job: help people travel smarter, safer and cheaper.
- Answer about routes, bus/metro/auto/train options, fares, travel time, safety and money-saving tips.
- Be warm, concise and encouraging. Keep replies short (2-4 sentences) since they are often read aloud.
- Reply in the SAME language the user used (Hindi, Hinglish, English, or other Indian languages). Use simple, everyday words.
- When you don't have live data, give a realistic, helpful estimate and clearly say it's an estimate.
- For safety concerns, be reassuring and practical (well-lit routes, sharing live location, SOS).
- Never give unsafe, illegal or medical advice. Redirect emergencies to the in-app SOS / 112.`;

export const Route = createFileRoute("/api/saathi/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!process.env.GROQ_API_KEY) {
          return new Response("AI not configured", { status: 503 });
        }
        let data: z.infer<typeof Body>;
        try {
          data = Body.parse(await request.json());
        } catch {
          return new Response("Invalid input", { status: 400 });
        }
        const result = streamText({
          model: getGroqModel("llama-3.3-70b-versatile"),
          system: data.language
            ? `${SYSTEM_PROMPT}\n\nPreferred reply language: ${data.language}.`
            : SYSTEM_PROMPT,
          messages: [
            ...(data.history ?? []).map((t) => ({ role: t.role, content: t.content })),
            { role: "user" as const, content: data.message },
          ],
          abortSignal: request.signal,
        });
        return result.toTextStreamResponse();
      },
    },
  },
});