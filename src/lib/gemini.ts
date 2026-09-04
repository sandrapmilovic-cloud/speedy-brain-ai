import { getKey } from "./storage";

// Google AI Studio URL
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export interface GeminiPart {
  text?: string;
  inline_data?: {
    mime_type: string;
    data: string;
  };
}

export interface GeminiMessage {
  role: "user" | "model";
  parts: GeminiPart[];
}

/** 
 * Direktni poziv Google Gemini 3.8 Flash API-ja
 */
export async function geminiChat(
  systemPrompt: string,
  history: GeminiMessage[]
): Promise<string> {
  const key = getKey("gemini");
  if (!key) throw new Error("Nedostaje Google Gemini API ključ");

  // Postavljamo najnoviji model koji si naveo
  const MODEL = "gemini-3.8-flash";
  const url = `${BASE_URL}/${MODEL}:generateContent?key=${key}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: history,
      system_instruction: {
        parts: [{ text: systemPrompt }]
      },
      generationConfig: {
        temperature: 0.6,
        topP: 0.95,
        maxOutputTokens: 2500,
      }
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || `Gemini API greška: ${response.status}`);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini je vratio prazan odgovor.");

  return text.trim();
}

/**
 * Funkcija za testiranje ključa u Postavkama
 */
export async function testGemini(): Promise<{ ok: boolean; msg: string }> {
  try {
    const res = await geminiChat("Odgovori samo sa OK", [
      { role: "user", parts: [{ text: "Test" }] }
    ]);
    return { ok: true, msg: `Google Gemini 3.8 radi savršeno!` };
  } catch (e: any) {
    return { ok: false, msg: e.message };
  }
}
