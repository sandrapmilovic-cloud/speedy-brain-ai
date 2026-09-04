// ══ ANDROMEDA AI Mozak v17.3 — "SLIM & REBORN" ══
import { formatZagreb, isoDateZagreb } from "./zagreb-time";
import { geminiChat, type GeminiMessage, type GeminiPart } from "./gemini";
import { groqChat, type GroqMessage } from "./groq";
import { openrouterChat, type ORMessage, specialistDefault } from "./openrouter";
import { nvidiaChat, NIM_MODELS, type NimMessage } from "./nvidia";
import { loadOmni, runOmni, omniBriefing } from "./omni";
import { hasKey, getKey, loadJSON } from "./storage";
import { detectMarket, marketModule, specialistsForMarket, MARKET_LABEL } from "./specialists";
import { runConsensus, consensusBriefing } from "./consensus";
import { loadSuper, superPromptDirectives } from "./superaccuracy";
import { loadHtFt, htFtDirectives } from "./htft";
import { loadSniper, sniperDirectives } from "./sniper";
import { loadTitan, titanDirectives } from "./titan";
import { getFixturesByDate, getLiveFixtures, ApiFootballError } from "./api-football";
import type { ChatAttachment } from "./attachments";
import { attachmentsContextText } from "./attachments";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
  ts: number;
}

// SKRAĆENI SISTEMSKI PROMPT (da izbjegnemo Groq 413 grešku)
const SYSTEM_PROMPT = `Ti si LUNA (Andromeda AI Oracle). Odgovaraj ISKLJUČIVO na hrvatskom jeziku.
Pravila: (1) Prva rečenica: TIP + SIGURNOST + VALUE. (2) Obavezan "CRNI SCENARIJ" na kraju. (3) Koristi Poisson λ analizu. (4) Budi hladna i analitična.`;

async function buildFootballContext(userText: string): Promise<string> {
  const wantsToday = /danas|današnj|today/i.test(userText);
  const wantsLive = /uživo|uzivo|live/i.test(userText);
  const parts: string[] = [];
  try {
    if (wantsLive) {
      const live = await getLiveFixtures();
      // Smanjeno na 8 utakmica da uštedimo tokene
      parts.push(`UŽIVO:\n` + live.slice(0, 8).map(f => `- ${f.teams.home.name} ${f.goals.home}:${f.goals.away} ${f.teams.away.name}`).join("\n"));
    } else if (wantsToday) {
      const list = await getFixturesByDate(isoDateZagreb());
      parts.push(`DANAS:\n` + list.slice(0, 12).map(f => `- ${f.teams.home.name} vs ${f.teams.away.name}`).join("\n"));
    }
  } catch (e) { console.warn("Context Error", e); }
  return parts.join("\n");
}

export async function askAi(userText: string, history: ChatTurn[], attachments: ChatAttachment[] = []): Promise<string> {
  const prefs = loadJSON<any>("tm.brain.prefs", { primary: "openrouter" });
  const market = detectMarket(userText);
  
  // Smanjujemo povijest na zadnje 3 poruke da ne probijemo limit tokena
  const slimHistory = history.slice(-3).map(h => ({ role: h.role, content: h.content }));

  // Upute iz modula - šaljemo samo osnovne da uštedimo prostor
  const directives = htFtDirectives(loadHtFt(), market) + sniperDirectives(loadSniper(), market);

  const auditBlock = `\n═══ REVIZIJA ═══\n- λ model: [X.X]\n- My P vs Market P: [X% / X%]\n- CRNI SCENARIJ: [Zašto pada?]\n- PRESUDA: [IGRAJ/PRESKOČI]`;

  const sys = SYSTEM_PROMPT + `\n\nTRŽIŠTE: ${MARKET_LABEL[market]}\n${directives}\n${auditBlock}`;
  const ctx = await buildFootballContext(userText);
  const finalSys = sys + "\n\nKONTEKST:\n" + ctx + "\n" + attachmentsContextText(attachments);

  const brains: any[] = [prefs.primary, "openrouter", "gemini", "groq"].filter(Boolean);
  const errors: string[] = [];

  for (const b of brains) {
    try {
      if (b === "openrouter" && hasKey("openrouter")) {
        // Prisiljavamo OpenRouter na BESPLATNI model ako korisnik nije postavio svoj
        const model = prefs.orModel || "google/gemini-2.0-flash-exp:free";
        return await openrouterChat(model, [{ role: "system", content: finalSys }, ...slimHistory, { role: "user", content: userText }], {});
      }
      if (b === "nvidia" && hasKey("nvidia")) {
        // KORISTIMO NOVI NVIDIA MODEL (Llama 3.1 70B je stabilan)
        return await nvidiaChat("meta/llama-3.1-70b-instruct", [{ role: "system", content: finalSys }, ...slimHistory, { role: "user", content: userText }]);
      }
      if (b === "gemini" && hasKey("gemini")) {
        return await runGemini(finalSys, history, userText, attachments);
      }
      if (b === "groq" && hasKey("groq")) {
        // Groq koristimo samo s Llama 3.3 70B modelom
        return await groqChat([{ role: "system", content: finalSys }, ...slimHistory.map(h => ({ role: h.role === "user" ? "user" : "assistant", content: h.content })), { role: "user", content: userText }]);
      }
    } catch (e: any) {
      errors.push(`${b}: ${e.message}`);
    }
  }

  throw new Error(`Greška: ${errors.join(" | ")}`);
}

async function runGemini(sys: string, history: any[], userText: string, attachments: any[]) {
  const gHist: GeminiMessage[] = history.slice(-3).map(t => ({ role: t.role === "user" ? "user" : "model", parts: [{ text: t.content }] }));
  const userParts: GeminiPart[] = [{ text: userText || "(bez teksta)" }];
  for (const a of attachments) if (a.kind === "image" && a.dataUrl) {
    const m = /^data:([^;]+);base64,(.+)$/.exec(a.dataUrl);
    if (m) userParts.push({ inline_data: { mime_type: m[1], data: m[2] } });
  }
  gHist.push({ role: "user", parts: userParts });
  return geminiChat(sys, gHist);
}
