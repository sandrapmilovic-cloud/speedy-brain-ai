// ══ ANDROMEDA AI Mozak v17.8 — "FULL-RECOVERY" (DIAGNOSTIC MODE) ══
import { formatZagreb, isoDateZagreb } from "./zagreb-time";
import { geminiChat } from "./gemini";
import { openrouterChat } from "./openrouter";
import { nvidiaChat } from "./nvidia";
import { hasKey, getKey } from "./storage";
import { detectMarket, MARKET_LABEL } from "./specialists";
import { loadHtFt, htFtDirectives } from "./htft";
import { loadSniper, sniperDirectives } from "./sniper";
import { getFixturesByDate } from "./api-football";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `Ti si LUNA, matematički Oracle za sport. Odgovaraj ISKLJUČIVO na HRVATSKOM.
Fokus: HT/FT i TOČNI REZULTATI.
Pravilo: Prvi red = TIP + SIGURNOST. Na kraju "CRNI SCENARIJ".`;

export async function askAi(userText: string, history: ChatTurn[]): Promise<string> {
  const market = detectMarket(userText);
  const slimHistory = history.slice(-2).map(h => ({ role: h.role, content: h.content }));
  const directives = htFtDirectives(loadHtFt(), market) + sniperDirectives(loadSniper(), market);
  const finalSys = `${SYSTEM_PROMPT}\n${directives}\nZanemari skip filtere.`;

  // --- LOGIKA POKUŠAJA (S DIJAGNOSTIKOM) ---
  const errors: string[] = [];

  // 1. OPENROUTER
  if (hasKey("openrouter")) {
    try {
      console.log("Pokušavam OpenRouter...");
      return await openrouterChat("google/gemini-2.0-flash-exp:free", [
        { role: "system", content: finalSys },
        ...slimHistory,
        { role: "user", content: userText }
      ], {});
    } catch (e: any) { 
      console.error("OpenRouter fail:", e.message);
      errors.push(`OpenRouter (${e.message})`); 
    }
  } else {
    console.warn("OpenRouter ključ nedostaje u Postavkama.");
  }

  // 2. NVIDIA
  if (hasKey("nvidia")) {
    try {
      console.log("Pokušavam NVIDIA...");
      return await nvidiaChat("meta/llama-3.1-8b-instruct", [
        { role: "system", content: finalSys },
        ...slimHistory,
        { role: "user", content: userText }
      ]);
    } catch (e: any) { 
      console.error("NVIDIA fail:", e.message);
      errors.push(`NVIDIA (${e.message})`); 
    }
  }

  // 3. GEMINI
  if (hasKey("gemini")) {
    try {
      console.log("Pokušavam Gemini...");
      const gHist = slimHistory.map(t => ({ role: t.role === "user" ? "user" : "model", parts: [{ text: t.content }] }));
      gHist.push({ role: "user", parts: [{ text: userText }] });
      return await geminiChat(finalSys, gHist);
    } catch (e: any) { 
      console.error("Gemini fail:", e.message);
      errors.push(`Gemini (${e.message})`); 
    }
  }

  // Ako smo došli do ovdje, ništa nije radilo
  if (errors.length === 0) {
    throw new Error("KLJUČEVI NISU SPREMLJENI. Odi u Postavke, zalijepi ključeve i klikni SPREMI.");
  }

  throw new Error(`Svi mozgovi su blokirani. Detalji: ${errors.join(" | ")}`);
}
