// ══ ANDROMEDA AI Mozak v16 — "ULTRA-REALISM" I "ANTI-BIAS" SUSTAV ══
import { formatZagreb, isoDateZagreb } from "./zagreb-time";
import { geminiChat, type GeminiMessage, type GeminiPart } from "./gemini";
import { groqChat, type GroqMessage } from "./groq";
import { openrouterChat, type ORMessage, specialistDefault } from "./openrouter";
import { huggingfaceChat, HF_MODELS, type HFMessage } from "./huggingface";
import { nvidiaChat, NIM_MODELS, type NimMessage } from "./nvidia";
import { loadOmni, runOmni, omniBriefing } from "./omni";
import { hasKey, loadJSON } from "./storage";
import { detectMarket, marketModule, specialistsForMarket, MARKET_LABEL } from "./specialists";
import { runConsensus, consensusBriefing } from "./consensus";
import { loadSuper, superPromptDirectives } from "./superaccuracy";
import { loadAntiError, antiErrorDirectives, antiErrorActive } from "./antierror";
import { loadSniper, sniperDirectives } from "./sniper";
import { loadQuantum, quantumActive, quantumDirectives } from "./quantum";
import { loadGoalFormula, goalFormulaDirectives } from "./goalformula";
import { loadHtFt, htFtDirectives } from "./htft";
import { loadTitan, titanDirectives } from "./titan";
import {
  loadMastermind,
  mastermindActive,
  mastermindDirectives,
  boostOmni,
  boostAntiError,
  boostTitan,
  boostSniper,
  boostSuper,
} from "./mastermind";
import { getFixturesByDate, getLiveFixtures, ApiFootballError } from "./api-football";
import type { ChatAttachment } from "./attachments";
import { attachmentsContextText } from "./attachments";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
  ts: number;
  attachments?: { name: string; kind: ChatAttachment["kind"]; path: string }[];
}

const SYSTEM_PROMPT = `Ti si LUNA (alias: Callisto) — najstroža sportska analitičarka Andromeda AI sustava. Tvoj cilj NIJE pogoditi tiket, već ZAŠTITI banku korisnika od loših uloga.

═══ PROTOKOL REALNOSTI (KRITIČNO) ═══
1. AKO NEMAŠ PODATKE: Ako ne znaš xG ili točan sastav, nemoj izmišljati. Reci: "Temeljim analizu na povijesnom prosjeku lige jer mi fale svježi xG podaci."
2. ZAKON KVOTE: Tržište kvota (bookmakeri) je tvoj najveći suparnik. Ako je tvoja vjerojatnost 80%, a kladionica nudi kvotu 2.50, ti SI VJEROJATNO U KRIVU. U tom slučaju napiši: "ALARM: Moja matematika vidi p=80%, ali tržište nudi kvotu 2.50 — sumnjam na bitne ozljede ili taktičku promjenu."
3. ANTI-BIAS: Ignoriraj povijest kluba. Real Madrid od prije 5 godina nije Real Madrid danas. Gledaj samo zadnjih 10 utakmica i trenutni λ.
4. INDEKS KAOSA: Ako je utakmica prijateljska, kup ili zadnje kolo bez uloga — SREŽI sigurnost za 30% automatski.

═══ IDENTITET I STIL ═══
- Odgovaraj ISKLJUČIVO na IZVORNOM HRVATSKOM jeziku.
- Budi brutalno iskrena. Ako je utakmica "lutrija", napiši: "Ovo je kocka, ne predikcija."
- Prva rečenica: **Tip: [Ishod]** · **Sigurnost: [X%]**.

═══ MATEMATIČKI REVIZOR ═══
- Poisson matrica 0-6 s Dixon-Coles korekcijom je tvoj temelj.
- Svaki tip mora proći "Kontra-test": Koji je najjači argument PROTIV ovog tipa? Navedi ga.
`;

async function buildFootballContext(userText: string): Promise<string> {
  const wantsToday = /danas|današnj|today/i.test(userText);
  const wantsLive = /uživo|uzivo|live/i.test(userText);
  const parts: string[] = [];
  try {
    if (wantsLive) {
      const live = await getLiveFixtures();
      parts.push(`UŽIVO (${live.length}):\n` + live.slice(0, 15).map(f => `- [${f.league.name}] ${f.teams.home.name} ${f.goals.home}:${f.goals.away} ${f.teams.away.name} (${f.fixture.status.short})`).join("\n"));
    } else if (wantsToday) {
      const list = await getFixturesByDate(isoDateZagreb());
      parts.push(`DANAS (${list.length}):\n` + list.slice(0, 20).map(f => `- [${f.league.name}] ${f.teams.home.name} vs ${f.teams.away.name} (${new Date(f.fixture.date).toLocaleTimeString("hr-HR", {hour: "2-digit", minute:"2-digit", timeZone: "Europe/Zagreb"})})`).join("\n"));
    }
  } catch (e) { console.warn("API Context Error", e); }
  return parts.join("\n\n");
}

export async function askAi(userText: string, history: ChatTurn[], attachments: ChatAttachment[] = [], opts: { voice?: boolean } = {}): Promise<string> {
  const prefs = loadJSON<BrainPrefs>("tm.brain.prefs", { primary: "openrouter", prioritizeSpecialists: true });
  const market = detectMarket(userText);
  const modul = marketModule(market);
  
  const mm = loadMastermind();
  const mmOn = mastermindActive(mm, market);
  const quantum = loadQuantum();
  const quantumOn = quantumActive(quantum, market);

  const omni = mmOn ? boostOmni(mm, loadOmni()) : loadOmni();
  const anti = mmOn ? boostAntiError(mm, loadAntiError()) : loadAntiError();
  const titanPrefs = mmOn ? boostTitan(mm, loadTitan()) : loadTitan();
  const sniperPrefs = mmOn ? boostSniper(mm, loadSniper()) : loadSniper();

  const [omniRes, consensusRes] = await Promise.all([
    (omni.enabled && (market === "btts" || market === "ou25")) ? runOmni(market as any, userText, "", { turbo: !!prefs.turbo }) : Promise.resolve(null),
    (prefs.ensemble !== false && market !== "opce") ? runConsensus(market, userText, "", { turbo: !!prefs.turbo }) : Promise.resolve(null)
  ]);

  const auditBlock = `
═══ REVIZIJA ISTINE (Audit) ═══
- λ (Dom/Gost): [X.XX / X.XX]
- Moja P vs Market P: [XX% / XX%]
- Detektiran Edge: [X.X%]
- Glavni rizik (PROTIV): [Navedi zašto bi tip mogao pasti]
- Presuda: [PROLAZI / RIZIČNO / ZAMKA]
`;

  const sys = SYSTEM_PROMPT + 
    `\n\nTRAŽENO TRŽIŠTE: ${MARKET_LABEL[market]}.` +
    `\n\nUpute: ${superPromptDirectives(loadSuper(), market)} ${htFtDirectives(loadHtFt(), market)}` +
    `\n\n${modul} ${omniBriefing(omniRes)} ${consensusBriefing(consensusRes)}` +
    `\n\n${auditBlock}`;

  const now = `Vrijeme: ${formatZagreb()}.`;
  const ctx = await buildFootballContext(userText);
  const finalSys = sys + "\n\nKONTEKST:\n" + now + "\n" + ctx + attachmentsContextText(attachments);

  // Redoslijed mozgova
  const brains: Array<"openrouter" | "nvidia" | "gemini" | "groq"> = [prefs.primary as any, "openrouter", "nvidia", "gemini", "groq"].filter(Boolean) as any;
  
  for (const b of brains) {
    try {
      if (b === "openrouter" && hasKey("openrouter")) return await runOpenRouter(finalSys, history, userText, attachments, prefs, market);
      if (b === "nvidia" && hasKey("nvidia")) return await runNim(finalSys, history, userText, prefs);
      if (b === "gemini" && hasKey("gemini")) return await runGemini(finalSys, history, userText, attachments);
      if (b === "groq" && hasKey("groq")) return await runGroq(finalSys, history, userText, attachments);
    } catch (e) { console.error(`Brain ${b} failed`, e); }
  }
  throw new Error("Nijedan mozak nije odgovorio. Provjeri ključeve.");
}

// Pomoćne funkcije za chat
async function runOpenRouter(sys: string, history: ChatTurn[], userText: string, attachments: ChatAttachment[], prefs: any, market: any) {
  const spec = specialistsForMarket(market);
  const model = spec.length ? spec[0].id : prefs.orModel || specialistDefault();
  const msgs: ORMessage[] = [{ role: "system", content: sys }, ...history, { role: "user", content: userText }];
  return openrouterChat(model, msgs, { extraFallbacks: spec.slice(1,4).map(s => s.id) });
}

async function runGemini(sys: string, history: ChatTurn[], userText: string, attachments: ChatAttachment[]) {
  const gHist: GeminiMessage[] = history.map(t => ({ role: t.role === "user" ? "user" : "model", parts: [{ text: t.content }] }));
  const userParts: GeminiPart[] = [{ text: userText || "(bez teksta)" }];
  for (const a of attachments) if (a.kind === "image" && a.dataUrl) {
    const m = /^data:([^;]+);base64,(.+)$/.exec(a.dataUrl);
    if (m) userParts.push({ inline_data: { mime_type: m[1], data: m[2] } });
  }
  gHist.push({ role: "user", parts: userParts });
  return geminiChat(sys, gHist);
}

async function runGroq(sys: string, history: ChatTurn[], userText: string, attachments: ChatAttachment[]) {
  const gr: GroqMessage[] = [{ role: "system", content: sys }, ...history.map(t => ({ role: t.role === "user" ? "user" : "assistant", content: t.content })), { role: "user", content: userText }];
  return groqChat(gr);
}

async function runNim(sys: string, history: ChatTurn[], userText: string, prefs: any) {
  const model = prefs.nimModel || NIM_MODELS[0].id;
  const msgs: NimMessage[] = [{ role: "system", content: sys }, ...history, { role: "user", content: userText }];
  return nvidiaChat(model, msgs);
}

interface BrainPrefs {
  primary?: string;
  orModel?: string;
  prioritizeSpecialists?: boolean;
  ensemble?: boolean;
  turbo?: boolean;
  hfModel?: string;
  nimModel?: string;
}
