// ══ ANDROMEDA AI Mozak v17.4 — "FIXED MODELS & FREE TIER" ══
import { formatZagreb, isoDateZagreb } from "./zagreb-time";
import { geminiChat, type GeminiMessage, type GeminiPart } from "./gemini";
import { groqChat, type GroqMessage } from "./groq";
import { openrouterChat, type ORMessage } from "./openrouter";
import { nvidiaChat } from "./nvidia";
import { hasKey, loadJSON } from "./storage";
import { detectMarket, MARKET_LABEL } from "./specialists";
import { loadHtFt, htFtDirectives } from "./htft";
import { loadSniper, sniperDirectives } from "./sniper";
import { getFixturesByDate, getLiveFixtures, ApiFootballError } from "./api-football";
import { attachmentsContextText } from "./attachments";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

// ULTRA-KRATKI PROMPT (da Groq ne javlja 413 Error)
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
  
  // Šaljemo samo zadnje 2 poruke da uštedimo prostor (vrijednost tokena)
  const slimHistory = history.slice(-2).map(h => ({ role: h.role, content: h.content }));

  const directives = htFtDirectives(loadHtFt(), market) + sniperDirectives(loadSniper(), market);
  const finalSys = `${SYSTEM_PROMPT}\nTRŽIŠTE: ${MARKET_LABEL[market]}\n${directives}\nKONTEKST: ${ctx}`;

  const errors: string[] = [];

  // 1. POKUŠAJ: OPENROUTER (Samo besplatni modeli)
  if (hasKey("openrouter")) {
    try {
      // Ovdje koristimo isključivo :free modele da izbjegnemo 402 error
      const freeModels = [
        "google/gemini-2.0-flash-exp:free",
        "meta-llama/llama-3.1-8b-instruct:free",
        "mistralai/mistral-7b-instruct:free"
      ];
      return await openrouterChat(freeModels[0], [
        { role: "system", content: finalSys },
        ...slimHistory,
        { role: "user", content: userText }
      ], { extraFallbacks: freeModels.slice(1) });
    } catch (e: any) { errors.push(`OpenRouter: ${e.message}`); }
  }

  // 2. POKUŠAJ: NVIDIA (Novi model umjesto ugašenog)
  if (hasKey("nvidia")) {
    try {
      // meta/llama-3.1-8b-instruct je trenutno najstabilniji besplatni model na Nvidiji
      return await nvidiaChat("meta/llama-3.1-8b-instruct", [
        { role: "system", content: finalSys },
        ...slimHistory,
        { role: "user", content: userText }
      ]);
    } catch (e: any) { errors.push(`NVIDIA: ${e.message}`); }
  }

  // 3. POKUŠAJ: GROQ (Smanjen payload da izbjegnemo 413)
  if (hasKey("groq")) {
    try {
      return await groqChat([
        { role: "system", content: finalSys },
        ...slimHistory.map(h => ({ role: h.role === "user" ? "user" : "assistant", content: h.content })),
        { role: "user", content: userText }
      ]);
    } catch (e: any) { errors.push(`Groq: ${e.message}`); }
  }

  // 4. POKUŠAJ: GEMINI
  if (hasKey("gemini")) {
    try {
      const gHist: GeminiMessage[] = slimHistory.map(t => ({ 
        role: t.role === "user" ? "user" : "model", 
        parts: [{ text: t.content }] 
      }));
      gHist.push({ role: "user", parts: [{ text: userText }] });
      return await geminiChat(finalSys, gHist);
    } catch (e: any) { errors.push(`Gemini: ${e.message}`); }
  }

  throw new Error(`Svi mozgovi su blokirani. Detalji: ${errors.join(" | ")}`);
}
