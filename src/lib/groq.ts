// Groq API klijent (Llama 3.3 70B) — fallback mozak.
import { getKey } from "./storage";

const URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function groqChat(messages: GroqMessage[]): Promise<string> {
  const key = getKey("groq");
  if (!key) throw new Error("Nedostaje Groq ključ");
  const res = await fetch(URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);
  const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = j.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("Groq je vratio prazan odgovor");
  return text;
}

export async function testGroq(): Promise<{ ok: boolean; msg: string }> {
  try {
    const t = await groqChat([
      { role: "system", content: "Odgovori samo riječju 'OK'." },
      { role: "user", content: "test" },
    ]);
    return { ok: true, msg: `Radi: ${t.trim().slice(0, 60)}` };
  } catch (e) {
    return { ok: false, msg: e instanceof Error ? e.message : String(e) };
  }
}