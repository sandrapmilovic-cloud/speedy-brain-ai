// ══ ANDROMEDA AI Mozak v17.5 — "EMERGENCY RESET" (FIXED MODELS) ══
import { formatZagreb, isoDateZagreb } from "./zagreb-time";
import { geminiChat, type GeminiMessage, type GeminiPart } from "./gemini";
import { groqChat, type GroqMessage } from "./groq";
import { openrouterChat } from "./openrouter";
import { nvidiaChat } from "./nvidia";
import { hasKey, loadJSON } from "./storage";
import { detectMarket, MARKET_LABEL } from "./specialists";
import { loadHtFt, htFtDirectives } from "./htft";
import { loadSniper, sniperDirectives } from "./sniper";
import { getFixturesByDate, getLiveFixtures } from "./api-football";
import { attachmentsContextText } from "./attachments";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

// MINIMALNI PROMPT (Sprečava Groq 413 grešku i štedi tokene)
const SYSTEM_PROMPT = `Ti si LUNA (Andromeda AI). Odgovaraj HRVATSKI. 
Pravilo: Prvi red = TIP + SIGURNOST. Na kraju "CRNI SCENARIJ". Analiziraj matematički.`;

async function buildFootballContext(userText: string): Promise<string> {
  const wantsLive = /uživo|uzivo|live/i.test(userText);
  try {
    if (wantsLive) {
      const live = await getLiveFixtures();
      return `UŽIVO: ` + live.slice(0, 5).map(f => `${f.teams.home.name} ${f.goals.home}:${f.goals.away} ${f.teams.away.name}`).join(", ");
    }
    const list = await getFixturesByDate(isoDateZagreb());
    return `DANAS: ` + list.slice(0, 8).map(f => `${f.teams.home.name}-${f.teams.away.name}`).join(", ");
  } catch { return ""; }
}

export async function askAi(userText: string, history: ChatTurn[]): Promise<string> {
  const market = detectMarket(userText);
  const ctx = await buildFootballContext(userText);
  
  // Šaljemo samo zadnje 2 poruke da uštedimo prostor (izbjegavamo Error 413)
  const slimHistory = history.slice(-2).map(h => ({ role: h.role, content: h.content }));

  const directives = htFtDirectives(loadHtFt(), market) + sniperDirectives(loadSniper(), market);
  const finalSys = `${SYSTEM_PROMPT}\nTRŽIŠTE: ${MARKET_LABEL[market]}\n${directives}\nKONTEKST: ${ctx}`;

  const errors: string[] = [];

  // 1. POKUŠAJ: OPENROUTER (PRISILNO BESPLATNI MODELI)
  if (hasKey("openrouter")) {
    try {
      // Koristimo model koji je 100% besplatan i trenutno aktivan
      const model = "google/gemini-2.0-flash-exp:free"; 
      return await openrouterChat(model, [
        { role: "system", content: finalSys },
        ...slimHistory,
        { role: "user", content: userText }
      ], {});
    } catch (e: any) { 
        console.error("OpenRouter Error:", e.message);
        errors.push(`OpenRouter: ${e.message}`); 
    }
  }

  // 2. POKUŠAJ: NVIDIA (AŽURIRAN MODEL KOJI NIJE UGAŠEN)
  if (hasKey("nvidia")) {
    try {
      // Prebacujemo na Llama 3.1 8B koji je zamijenio ugašeni Nano model
      return await nvidiaChat("meta/llama-3.1-8b-instruct", [
        { role: "system", content: finalSys },
        ...slimHistory,
        { role: "user", content: userText }
      ]);
    } catch (e: any) { 
        console.error("NVIDIA Error:", e.message);
        errors.push(`NVIDIA: ${e.message}`); 
    }
  }

  // 3. POKUŠAJ: GROQ (ZAŠTITA OD PREVELIKOG ZAHTJEVA)
  if (hasKey("groq")) {
    try {
      return await groqChat([
        { role: "system", content: finalSys },
        ...slimHistory.map(h => ({ role: h.role === "user" ? "user" : "assistant", content: h.content })),
        { role: "user", content: userText }
      ]);
    } catch (e: any) { 
        console.error("Groq Error:", e.message);
        errors.push(`Groq: ${e.message}`); 
    }
  }

  // 4. POKUŠAJ: GEMINI (ZADNJI IZBOR)
  if (hasKey("gemini")) {
    try {
      const gHist: GeminiMessage[] = slimHistory.map(t => ({ 
        role: t.role === "user" ? "user" : "model", 
        parts: [{ text: t.content }] 
      }));
      gHist.push({ role: "user", parts: [{ text: userText }] });
      return await geminiChat(finalSys, gHist);
    } catch (e: any) { 
        console.error("Gemini Error:", e.message);
        errors.push(`Gemini: ${e.message}`); 
    }
  }

  throw new Error(`NIJEDAN AI MOZAK NE RADI. Detalji: ${errors.join(" | ")}`);
}
