import { createGroq } from "@ai-sdk/groq";

/**
 * Returns a Groq AI SDK model.
 * Reads GROQ_API_KEY from environment — set this in Replit Secrets.
 */
export function getGroqModel(modelId = "llama-3.3-70b-versatile") {
  const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
  return groq(modelId);
}
