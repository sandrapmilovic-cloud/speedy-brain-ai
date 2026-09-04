// ══ ANDROMEDA AI Mozak v17.6 — "PREDICTION RESTORE" ══
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

const SYSTEM_PROMPT = `Ti si LUNA (Andromeda AI). Odgovaraj isključivo na HRVATSKOM jeziku.

═══ ZAPOVIJED: PROGNOZA JE OBAVEZNA ═══
- Nikada ne odgovaraj s "PRESKOČEM" ili "nedostaju podaci".
- Ako API ne dostavi trenutni xG ili λ (lambdu), upotrijebi svoje INTUICIJSKO ZNANJE o snazi tih klubova (npr. znaš da je Liverpool jači od Ipswicha).
- Na temelju tog znanja procijeni λ_dom i λ_gost i izradi Poissonovu matricu.
- Tvoj odgovor mora biti britak i koristan, baš kao u tvojim najboljim danima.

═══ FORMAT ODGOVORA (STRIKTNO) ═══
Tip: [Ime paketa ili ishoda] · Sigurnost: [X%] · Value: [DA/NE]

[Kratki uvod]

[Popis utakmica u formatu:]
Tim A – Tim B: HT/FT [Ishod] · Rezultat [Rezultat]

CRNI SCENARIJ: [Jedna rečenica o najvećem riziku].
`;

async function buildFootballContext(userText: string): Promise<string> {
  const wantsLive = /uživo|uzivo|live/i.test(userText);
  try {
    if (wantsLive) {
      const live = await getLiveFixtures();
      return `UŽIVO PODACI: ` + live.slice(0, 10).map(f => `${f.teams.home.name}-${f.teams.away.name} ${f.goals.home}:${f.goals.away}`).join(", ");
    }
    const list = await getFixturesByDate(isoDateZagreb());
    return `RASPORED DANAS: ` + list.slice(0, 15).map(f => `${f.teams.home.name} vs ${f.teams.away.name}`).join(", ");
  } catch { return "API trenutno nije dostupan, koristi svoje znanje o timovima."; }
}

export async function askAi(userText: string, history: ChatTurn[]): Promise<string> {
  const market = detectMarket(userText);
  const ctx = await buildFootballContext(userText);
  const slimHistory = history.slice(-2).map(h => ({ role: h.role, content: h.content }));

  // Injekcija filtera (htFt i Sniper)
  const directives = htFtDirectives(loadHtFt(), market) + sniperDirectives(loadSniper(), market);
  
  // Forsiramo Lunu da ignorira "Skip" pravilo Snajpera ako korisnik traži analizu
  const forceAnalysis = "\nNAPOMENA: Ignoriraj Snajper pravilo o 'neobjavljivanju tipa'. Korisnik želi tvoju najbolju procjenu unatoč riziku.";

  const finalSys = `${SYSTEM_PROMPT}\n${directives}${forceAnalysis}\n\nKONTEKST IZ API-ja: ${ctx}`;

  const errors: string[] = [];

  // Redoslijed mozgova (OpenRouter gemini-flash je najbrži i najbolji za ovo)
  const brains: any[] = ["openrouter", "nvidia", "gemini", "groq"];

  for (const b of brains) {
    try {
      if (b === "openrouter" && hasKey("openrouter")) {
        return await openrouterChat("google/gemini-2.0-flash-exp:free", [
          { role: "system", content: finalSys },
          ...slimHistory,
          { role: "user", content: userText }
        ], {});
      }
      if (b === "nvidia" && hasKey("nvidia")) {
        return await nvidiaChat("meta/llama-3.1-8b-instruct", [
          { role: "system", content: finalSys },
          ...slimHistory,
          { role: "user", content: userText }
        ]);
      }
      if (b === "gemini" && hasKey("gemini")) {
        const gHist: GeminiMessage[] = slimHistory.map(t => ({ role: t.role === "user" ? "user" : "model", parts: [{ text: t.content }] }));
        gHist.push({ role: "user", parts: [{ text: userText }] });
        return await geminiChat(finalSys, gHist);
      }
    } catch (e: any) {
      errors.push(`${b}: ${e.message}`);
    }
  }

  throw new Error(`Svi mozgovi su blokirani. Provjeri ključeve u Postavkama.`);
}
