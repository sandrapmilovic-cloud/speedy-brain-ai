import { getKey } from "./storage";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Ispravljena i samostalno-ispravljajuca lista modela (od novijeg prema starijem).
 * Ako Google povuce ili preimenuje jedan model, automatski se prelazi na sljedeci.
 */
const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

export async function geminiChat(systemPrompt: string, history: any[]): Promise<string> {
  const key = getKey("gemini");
  if (!key) throw new Error("Nedostaje Google API kljuc");

  let lastErr = "";
  for (const MODEL of GEMINI_MODELS) {
    let response: Response;
    try {
      response = await fetch(BASE_URL + "/" + MODEL + ":generateContent?key=" + key, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: history,
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { temperature: 0.6, maxOutputTokens: 2500 },
        }),
      });
    } catch (e) {
      lastErr = e instanceof Error ? e.message : "Mrezna greska";
      continue;
    }

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const msg =
        (data && (data.error?.message || ("HTTP " + response.status))) ||
        "HTTP " + response.status;
      // Kljuc/limit: nijedan drugi model nece proci -> prekini.
      if (response.status === 401 || response.status === 403 || response.status === 429) {
        throw new Error(msg);
      }
      lastErr = msg; // Nepostojeci model (404 i sl.) -> probaj sljedeci.
      continue;
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    if (text) return text;
    lastErr = "Gemini je vratio prazan odgovor";
  }
  throw new Error(lastErr ? "Gemini greska: " + lastErr : "Gemini greska");
}

export async function testGemini() {
  try {
    await geminiChat("Say OK", [{ role: "user", parts: [{ text: "Test" }] }]);
    return { ok: true, msg: "Google Gemini radi!" };
  } catch (e) {
    return { ok: false, msg: e instanceof Error ? e.message : String(e) };
  }
}
