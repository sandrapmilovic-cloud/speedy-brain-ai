import { getKey } from "./storage";

const URL = "https://openrouter.ai/api/v1/chat/completions";

export interface ORMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export const OR_MODELS = [
  { id: "meta-llama/llama-3.1-8b-instruct:free", label: "Llama 3.1 8B (Besplatno)" },
  { id: "mistralai/mistral-7b-instruct:free", label: "Mistral 7B (Besplatno)" },
  { id: "google/gemma-2-9b-it:free", label: "Gemma 2 9B (Besplatno)" },
];

const FALLBACK_CHAIN = [
  "meta-llama/llama-3.1-8b-instruct:free",
  "mistralai/mistral-7b-instruct:free",
  "google/gemma-2-9b-it:free"
];

export function specialistDefault(): string {
  return "meta-llama/llama-3.1-8b-instruct:free";
}

export async function openrouterChat(model: string, messages: ORMessage[]): Promise<string> {
  const key = getKey("openrouter");
  if (!key) throw new Error("Ključ nedostaje");

  const chain = [model, ...FALLBACK_CHAIN];
  let lastErr = "";

  for (const m of chain) {
    try {
      const res = await fetch(URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`,
          "X-Title": "Andromeda AI"
        },
        body: JSON.stringify({ model: m, messages, temperature: 0.5 })
      });
      const data = await res.json();
      if (res.ok && data.choices?.[0]?.message?.content) return data.choices[0].message.content.trim();
      lastErr = data.error?.message || "Greška modela";
    } catch (e: any) { lastErr = e.message; }
  }
  throw new Error(lastErr);
}
