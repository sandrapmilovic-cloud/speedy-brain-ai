// ══ ANDROMEDA AI Mozak v20 — "GROUNDED ORACLE" ══
// Svi matematički moduli (konsenzus, OMNI, gol-formula, HT/FT, Mastermind)
// spajaju se paralelno i ulaze u završni prompt kao autoritativne brojke.
import { geminiChat } from "./gemini";
import { openrouterChat } from "./openrouter";
import { groqChat, type GroqMessage } from "./groq";
import { nvidiaChat } from "./nvidia";
import { hasKey } from "./storage";
import { loadHtFt, htFtDirectives } from "./htft";
import { loadGoalFormula, goalFormulaActive, goalFormulaDirectives } from "./goalformula";
import { loadMastermind, mastermindDirectives } from "./mastermind";
import { detectMarket, MARKET_LABEL, type Market } from "./specialists";
import { runConsensus, consensusBriefing } from "./consensus";
import { runOmni, omniBriefing, loadOmni } from "./omni";
import { attachmentsContextText, type ChatAttachment } from "./attachments";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
  ts: number;
  attachments?: { name: string; kind: ChatAttachment["kind"]; path?: string }[];
}

export interface AskOptions {
  voice?: boolean;
  turbo?: boolean;
}

interface BrainPrefsLite {
  turbo?: boolean;
}

function loadTurbo(): boolean {
  try {
    const raw = localStorage.getItem("tm.brain.prefs");
    if (!raw) return false;
    return Boolean((JSON.parse(raw) as BrainPrefsLite).turbo);
  } catch {
    return false;
  }
}

/** Pomoćni motor ne smije zaustaviti odgovor: rok + tiho preskakanje greške. */
async function soft<T>(p: Promise<T>, ms: number): Promise<T | null> {
  try {
    return await Promise.race([
      p,
      new Promise<null>((res) => setTimeout(() => res(null), ms)),
    ]);
  } catch (e) {
    console.warn("Pomoćni motor preskočen:", e);
    return null;
  }
}

function buildSystemPrompt(market: Market, briefings: string[]): string {
  const math = briefings.filter(Boolean).join("\n\n");
  return `Ti si LUNA — hrvatska AI analitičarka nogometnih predikcija.

═══ TON ═══
- Piši isključivo na hrvatskom, toplo i prijateljski, kao dobra prijateljica koja zna statistiku.
- Bez obećanja sigurnog dobitka, ali bez suhoparnog tona — kratko, jasno, ljudski.
- Uvijek navedi razinu sigurnosti u postotku i reci što bi promijenilo procjenu.

═══ GLAVNI FOKUS ═══
${MARKET_LABEL[market] ?? "opći ishod"} (ali uvijek daj i sva četiri tipa ispod).

═══ OBAVEZAN ODGOVOR ZA SVAKU UTAKMICU ═══
Kad korisnik spomene utakmicu (dvije momčadi), UVIJEK daj sva četiri tipa, ovim redom:
1) 🎯 GG/NG (BTTS) — tip + sigurnost %
2) ⚽ Over/Under 2.5 — tip + sigurnost %
3) 🕐 HT/FT — najvjerojatnija kombinacija + 2 alternative, sa %
4) 🔢 Konačni rezultat — 3 najvjerojatnija rezultata sa %
Zatim: 💡 Najsigurniji tip dana (jedan), ⚠️ glavni rizik, i sigurnija alternativa.

═══ PRAVILA TOČNOSTI (obavezno) ═══
1) Izračuni motora dolje su AUTORITATIVNI. Prepiši njihove postotke; ne izmišljaj svoje niti im proturječi.
2) Ne izmišljaj formu, xG, ozljede, kartone ni kvote. Ako podatak nedostaje, reci to i zatraži ga.
3) Svi tipovi moraju biti međusobno konzistentni: GG, Over/Under, HT/FT i rezultat moraju opisivati isti scenarij.
4) Ako su podaci tanki ili se izvori ne slažu, spusti sigurnost i ponudi sigurniju liniju (Over 1.5, dvostruka šansa, DNB) ili preporuči preskakanje.
5) Logika HT/FT mora pratiti rezultat:
   - 2/1: gost vodi na poluvremenu, domaćin pobjeđuje (2:1, 3:2) — gost mora imati barem 1 gol.
   - 1/2: domaćin vodi na poluvremenu, gost pobjeđuje (1:2, 2:3) — domaćin mora imati barem 1 gol.
   - 1:0 ili 2:0 dopuštaju samo 1/1 ili X/1.
6) Zbroj vjerojatnosti za isto tržište mora biti ≈100%; provjeri prije slanja.

═══ FORMAT ═══
⚽ **[DOMAĆIN] vs [GOST]** | Glavni tip: **[tip]** | Sigurnost: **[%]**
Zatim četiri točke gore, kratko i pregledno.

${math ? `═══ IZRAČUNI MOTORA (autoritativno) ═══\n${math}` : "═══ NAPOMENA ═══\nNema aktivnih matematičkih motora — reci da je procjena orijentacijska i zatraži brojke (forma, xG, kvote)."}`;
}

export async function askAi(
  userText: string,
  history: ChatTurn[] = [],
  attachments: ChatAttachment[] = [],
  opts: AskOptions = {},
): Promise<string> {
  const market = detectMarket(userText);
  const turbo = opts.turbo ?? loadTurbo();
  const attCtx = attachments.length ? attachmentsContextText(attachments) : "";
  const deadline = turbo ? 20000 : 45000;

  // ── Pomoćni motori paralelno (svaki smije zakazati bez rušenja odgovora)
  const omniPrefs = loadOmni();
  const [consensus, omniBtts, omniOu] = await Promise.all([
    soft(runConsensus(market, userText, attCtx, { turbo }), deadline),
    omniPrefs.enabled ? soft(runOmni("btts", userText, attCtx, { turbo }), deadline) : Promise.resolve(null),
    omniPrefs.enabled ? soft(runOmni("ou25", userText, attCtx, { turbo }), deadline) : Promise.resolve(null),
  ]);

  const gf = loadGoalFormula();
  const briefings = [
    consensusBriefing(consensus),
    omniBriefing(omniBtts),
    omniBriefing(omniOu),
    goalFormulaActive(gf) ? goalFormulaDirectives(gf) : "",
    htFtDirectives(loadHtFt(), market),
    mastermindDirectives(loadMastermind(), market),
  ];

  const SYSTEM_PROMPT = buildSystemPrompt(market, briefings);
  const fullUser = attCtx ? `${userText}\n\n${attCtx}` : userText;
  const hist = history.slice(-12);
  const errors: string[] = [];

  // 1) Gemini
  if (hasKey("gemini")) {
    try {
      const gHist = hist.map((h) => ({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.content }],
      }));
      gHist.push({ role: "user", parts: [{ text: fullUser }] });
      const out = await geminiChat(SYSTEM_PROMPT, gHist);
      if (out.trim()) return out;
      errors.push("Gemini: prazan odgovor");
    } catch (e) {
      errors.push(`Gemini: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // 2) OpenRouter
  if (hasKey("openrouter")) {
    try {
      const out = await openrouterChat("openrouter/free", [
        { role: "system", content: SYSTEM_PROMPT },
        ...hist.map((h) => ({ role: h.role, content: h.content })),
        { role: "user", content: fullUser },
      ]);
      if (out.trim()) return out;
      errors.push("OpenRouter: prazan odgovor");
    } catch (e) {
      errors.push(`OpenRouter: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // 3) Groq
  if (hasKey("groq")) {
    try {
      const out = await groqChat([
        { role: "system", content: SYSTEM_PROMPT },
        ...hist.map((h) => ({ role: h.role, content: h.content })),
        { role: "user", content: fullUser },
      ] as GroqMessage[]);
      if (out.trim()) return out;
      errors.push("Groq: prazan odgovor");
    } catch (e) {
      errors.push(`Groq: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // 4) NVIDIA NIM
  if (hasKey("nvidia")) {
    try {
      const out = await nvidiaChat("meta/llama-3.3-70b-instruct", [
        { role: "system", content: SYSTEM_PROMPT },
        ...hist.map((h) => ({ role: h.role, content: h.content })),
        { role: "user", content: fullUser },
      ]);
      if (out.trim()) return out;
      errors.push("NVIDIA NIM: prazan odgovor");
    } catch (e) {
      errors.push(`NVIDIA NIM: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (!errors.length)
    throw new Error("Nema unesenog AI ključa. Otvori Postavke i dodaj barem jedan (OpenRouter je besplatan).");
  throw new Error(`Nijedan AI mozak nije vratio odgovor:\n- ${errors.join("\n- ")}`);
}
