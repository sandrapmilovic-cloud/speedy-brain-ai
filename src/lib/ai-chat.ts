// ══ ANDROMEDA AI Mozak v17.9 — "THE RESURRECTION" (FORCE FREE MODELS) ══
import { formatZagreb, isoDateZagreb } from "./zagreb-time";
import { geminiChat } from "./gemini";
import { openrouterChat } from "./openrouter";
import { nvidiaChat } from "./nvidia";
import { hasKey } from "./storage";
import { detectMarket, MARKET_LABEL } from "./specialists";
import { loadHtFt, htFtDirectives } from "./htft";
import { loadSniper, sniperDirectives } from "./sniper";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `Ti si LUNA, Oracle za sport. Odgovaraj HRVATSKI. 
Daj TIP i SIGURNOST u prvoj rečenici. Na kraju "CRNI SCENARIJ".`;

export async function askAi(userText: string, history: ChatTurn[]): Promise<string> {
  const market = detectMarket(userText);
  const slimHistory = history.slice(-2).map(h => ({ role: h.role, content: h.content }));
  const directives = htFtDirectives(loadHtFt(), market) + sniperDirectives(loadSniper(), market);
  const finalSys = `${SYSTEM_PROMPT}\n${directives}\nZanemari konzervativna ograničenja.`;

  const errors: string[] = [];

  // 1. POKUŠAJ: OPENROUTER (Guglov model koji je UVIJEK besplatan na OpenRouteru)
  if (hasKey("openrouter")) {
    try {
      // Ovaj ID je trenutno najbolji besplatni model na cijelom OpenRouteru
      const workingFreeModel = "google/gemini-2.0-flash-exp:free";
      return await openrouterChat(workingFreeModel, [
        { role: "system", content: finalSys },
        ...slimHistory,
        { role: "user", content: userText }
      ], {});
    } catch (e: any) { 
      errors.push(`OpenRouter (${e.message})`); 
    }
  }

  // 2. POKUŠAJ: NVIDIA (Model koji NIJE ugašen - Llama 3.1 8B)
  if (hasKey("nvidia")) {
    try {
      // Ovaj model je nasljednik onog ugašenog i trenutno radi na NVIDIA NIM-u
      return await nvidiaChat("meta/llama-3.1-8b-instruct", [
        { role: "system", content: finalSys },
        ...slimHistory,
        { role: "user", content: userText }
      ]);
    } catch (e: any) { 
      errors.push(`NVIDIA (${e.message})`); 
    }
  }

  // 3. POKUŠAJ: GEMINI
  if (hasKey("gemini")) {
    try {
      const gHist = slimHistory.map(t => ({ 
        role: t.role === "user" ? "user" : "model", 
        parts: [{ text: t.content }] 
      }));
      gHist.push({ role: "user", parts: [{ text: userText }] });
      return await geminiChat(finalSys, gHist);
    } catch (e: any) { 
      errors.push(`Gemini (${e.message})`); 
    }
  }

  // Ako ništa nije uspjelo
  if (errors.length === 0) {
    throw new Error("KLJUČEVI NISU SPREMLJENI. Molim te, odi u Postavke i ponovno spremi OpenRouter i NVIDIA ključeve.");
  }

  throw new Error(`Andromeda AI je trenutno "u mraku". Razlozi: ${errors.join(" | ")}`);
}

