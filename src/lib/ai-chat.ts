// ══ ANDROMEDA AI Mozak v17 — "THE ORACLE" (FINALNA VERZIJA) ══
import { formatZagreb, isoDateZagreb } from "./zagreb-time";
import { geminiChat, type GeminiMessage, type GeminiPart } from "./gemini";
import { groqChat, type GroqMessage } from "./groq";
import { openrouterChat, type ORMessage, specialistDefault } from "./openrouter";
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

const SYSTEM_PROMPT = `Ti si LUNA (alias: Callisto) — Oracle modul Andromeda AI sustava. Tvoja svrha je matematička nepogrešivost i zaštita kapitala.

═══ PROTOKOL "ORACLE v17" (FINALNI AUDIT) ═══
Svaka predikcija MORA proći kroz ovaj filter prije nego se ispiše:
1. DE-VIG ANALIZA: Ako vidiš kvote (1 X 2), odmah izračunaj maržu. Ako je marža > 8%, upozori na lošu vrijednost.
2. λ-CALIBRATION: Izračunaj Poisson λ. Ako je tvoj λ veći od tržišnog (implied by odds), objasni ZAŠTO (npr. "kladionica podcjenjuje napadački potencijal domaćina").
3. KONTRA-ARGUMENT: Za svaki TIP koji predložiš, MORAŠ napisati jednu rečenicu pod naslovom "CRNI SCENARIJ" (zašto tip pada).
4. NO BET ZONA: Ako je tvoja sigurnost < 55% ili je Edge < 2%, tvoj savjet je obavezno "PRESKOČITI".

═══ IDENTITET I JEZIK ═══
- Odgovaraj ISKLJUČIVO na HRVATSKOM jeziku.
- Prva rečenica: **Tip: [KONKRETNO]** · **Sigurnost: [X%]** · **Value: [DA/NE]**.
- Budi hladna, analitična i izbjegavaj navijački optimizam.
`;

async function buildFootballContext(userText: string): Promise<string> {
  const wantsToday = /danas|današnj|today/i.test(userText);
  const wantsLive = /uživo|uzivo|live/i.test(userText);
  const parts: string[] = [];
  try {
    if (wantsLive) {
      const live = await getLiveFixtures();
      parts.push(`UŽIVO (${live.length}):\n` + live.slice(0, 15).map(f => {
        // Pokušaj izvući kvote ako su ugniježđene (ovisno o API tieru)
        const odds = (f as any).odds ? ` [Kvote: ${(f as any).odds}]` : "";
        return `- [${f.league.name}] ${f.teams.home.name} ${f.goals.home}:${f.goals.away} ${f.teams.away.name} (${f.fixture.status.short})${odds}`;
      }).join("\n"));
    } else if (wantsToday) {
      const list = await getFixturesByDate(isoDateZagreb());
      parts.push(`DANASNJI RASPORED:\n` + list.slice(0, 20).map(f => `- [${f.league.name}] ${f.teams.home.name} vs ${f.teams.away.name} (${new Date(f.fixture.date).toLocaleTimeString("hr-HR", {hour: "2-digit", minute:"2-digit", timeZone: "Europe/Zagreb"})})`).join("\n"));
    }
  } catch (e) { console.warn("Context Builder Error", e); }
  return parts.join("\n\n");
}

export async function askAi(
  userText: string, 
  history: ChatTurn[], 
  attachments: ChatAttachment[] = [], 
  opts: { voice?: boolean } = {}
): Promise<string> {
  const prefs = loadJSON<BrainPrefs>("tm.brain.prefs", { primary: "openrouter", prioritizeSpecialists: true });
  const market = detectMarket(userText);
  const modul = marketModule(market);
  
  // Moduli
  const mm = loadMastermind();
  const mmOn = mastermindActive(mm, market);
  const quantum = loadQuantum();
  const quantumOn = quantumActive(quantum, market);
  const omni = mmOn ? boostOmni(mm, loadOmni()) : loadOmni();
  const anti = mmOn ? boostAntiError(mm, loadAntiError()) : loadAntiError();
  const titanPrefs = mmOn ? boostTitan(mm, loadTitan()) : loadTitan();
  const sniperPrefs = mmOn ? boostSniper(mm, loadSniper()) : loadSniper();

  const turbo = !!prefs.turbo;
  const deadline = turbo ? 20000 : 55000;

  // Paralelno procesiranje motora
  const [omniRes, consensusRes] = await Promise.all([
    (omni.enabled && (market === "btts" || market === "ou25")) 
      ? withDeadline(runOmni(market as any, userText, "", { turbo }), deadline) 
      : Promise.resolve(null),
    (prefs.ensemble !== false && market !== "opce") 
      ? withDeadline(runConsensus(market, userText, "", { turbo }), deadline) 
      : Promise.resolve(null)
  ]);

  const auditDirective = `
═══ REVIZIJSKI PANEL (Oracle v17) ═══
- λ_model (Total): [X.XX]
- Implied P (Market): [XX%]
- My P (Andromeda): [XX%]
- Edge / Value: [X.X%] / [DA/NE]
- CRNI SCENARIJ: [Zašto ovaj tip pada?]
- KONAČNA PRESUDA: [IGRAJ / PRESKOČI]
`;

  const directives = 
    superPromptDirectives(loadSuper(), market) + 
    htFtDirectives(loadHtFt(), market) +
    sniperDirectives(sniperPrefs, market) +
    titanDirectives(titanPrefs, market) +
    quantumDirectives(quantum, market);

  const sys = SYSTEM_PROMPT + 
    `\n\nTRŽIŠTE: ${MARKET_LABEL[market]}. \n\n${directives}\n\n${modul}` +
    `\n\nBRIEFING MOTORA: ${omniBriefing(omniRes)} ${consensusBriefing(consensusRes)}` +
    `\n\n${auditDirective}`;

  const ctx = await buildFootballContext(userText);
  const finalSys = sys + "\n\nKONTEKST:\n" + ctx + "\n" + attachmentsContextText(attachments);

  const brains: Array<"openrouter" | "nvidia" | "gemini" | "groq"> = [
    prefs.primary as any, "openrouter", "nvidia", "gemini", "groq"
  ].filter((b, i, self) => b && self.indexOf(b) === i) as any;

  for (const b of brains) {
    try {
      if (b === "openrouter" && hasKey("openrouter")) return await runOpenRouter(finalSys, history, userText, attachments, prefs, market);
      if (b === "nvidia" && hasKey("nvidia")) return await runNim(finalSys, history, userText, prefs);
      if (b === "gemini" && hasKey("gemini")) return await runGemini(finalSys, history, userText, attachments);
      if (b === "groq" && hasKey("groq")) return await runGroq(finalSys, history, userText, attachments);
    } catch (e) { console.warn(`Mozak ${b} nije uspio, pokušavam sljedeći...`); }
  }

  throw new Error("Svi AI mozgovi su trenutno nedostupni. Provjeri API ključeve u Postavkama.");
}

async function withDeadline<T>(p: Promise<T>, ms: number): Promise<T | null> {
  let t: any;
  const timeout = new Promise<null>((res) => { t = setTimeout(() => res(null), ms); });
  const result = await Promise.race([p, timeout]);
  clearTimeout(t);
  return result;
}

// POMOĆNE FUNKCIJE ZA API POZIVE
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
  const gr: GroqMessage[] = [{ role: "system", content: sys }, ...history.map((t): GroqMessage => ({ role: t.role === "user" ? "user" : "assistant", content: t.content })), { role: "user", content: userText }];
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
