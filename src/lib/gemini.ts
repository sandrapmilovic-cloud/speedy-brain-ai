// Google Gemini API klijent (2.0 Flash) — direktan poziv iz preglednika.
import { getKey } from "./storage";

// gemini-flash-latest uvijek pokazuje na najnoviji stabilni Flash model
// (izbjegava probleme kad Google deprecira staru verziju kao 2.0-flash).
const MODEL = "gemini-flash-latest";
const URL_BASE = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

function humanizeGeminiError(status: number, body: string): string {
  let msg = body;
  try {
    const j = JSON.parse(body) as { error?: { message?: string; status?: string } };
    if (j.error?.message) msg = j.error.message;
  } catch {
    /* leave raw */
  }
  if (status === 400 && /API key not valid/i.test(msg))
    return "Gemini ključ nije važeći. Provjeri ga u Postavkama (mora biti iz aistudio.google.com/app/apikey).";
  if (status === 401 || status === 403)
    return "Gemini ključ odbijen (401/403). Provjeri je li ključ aktivan i ima li dozvolu za Generative Language API.";
  if (status === 429) return "Gemini je dosegao limit zahtjeva. Pokušaj za par sekundi.";
  if (status === 404) return "Gemini model nije dostupan (404). Aplikacija koristi gemini-flash-latest.";
  return `Gemini greška (${status}): ${msg.slice(0, 200)}`;
}

export type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

export interface GeminiMessage {
  role: "user" | "model";
  parts: GeminiPart[];
}

export async function geminiChat(system: string, history: GeminiMessage[]): Promise<string> {
  const key = getKey("gemini");
  if (!key) throw new Error("Nedostaje Gemini ključ");
  const res = await fetch(`${URL_BASE}?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { role: "user", parts: [{ text: system }] },
      contents: history,
      generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
    }),
  });
  if (!res.ok) throw new Error(humanizeGeminiError(res.status, await res.text()));
  const j = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text) throw new Error("Gemini je vratio prazan odgovor");
  return text;
}

export async function testGemini(): Promise<{ ok: boolean; msg: string }> {
  try {
    const t = await geminiChat("Odgovori samo riječju 'OK'.", [
      { role: "user", parts: [{ text: "test" }] },
    ]);
    return { ok: true, msg: `Radi: ${t.trim().slice(0, 60)}` };
  } catch (e) {
    return { ok: false, msg: e instanceof Error ? e.message : String(e) };
  }
}