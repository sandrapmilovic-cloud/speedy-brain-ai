// ══ ANDROMEDA AI Mozak v19.6 — "THE INTERPRETER" (FIX ZA DOMAĆIN/GOST) ══
import { geminiChat } from "./gemini";
import { openrouterChat } from "./openrouter";
import { hasKey } from "./storage";
import { calculateMomentum } from "./momentum";
import { getTacticalProfile } from "./tactics";
import { loadHtFt, htFtDirectives } from "./htft";

export async function askAi(userText: string, history: any[]): Promise<string> {
  const market = "htft";
  const directives = htFtDirectives(loadHtFt(), market);

  const SYSTEM_PROMPT = `Ti si LUNA, Ultimate Oracle. 
TVOJA MATEMATIKA I OZNAKE MORAJU BITI SAVRŠENO USKLAĐENE.

═══ STROGI ZAKON OZNAKA ═══
- BROJ 1 = DOMAĆIN (Uvijek prvi navedeni tim u paru).
- BROJ 2 = GOST (Uvijek drugi navedeni tim u paru).
- OZNAKA X = NERIJEŠENO.

═══ LOGIČKI VALIDATOR (OBAVEZNO) ═══
Prije nego ispišeš par, provjeri ovu tablicu:
1. Pobjeda GOSTA (npr. 0:2, 1:2, 0:1) -> HT/FT MORA završiti na /2 (npr. X/2, 2/2, 1/2).
   - STROGO ZABRANJENO: Pisati X/1 ili 1/1 ako gost pobjeđuje.
2. Pobjeda DOMAĆINA (npr. 1:0, 2:1, 3:0) -> HT/FT MORA završiti na /1 (npr. X/1, 1/1, 2/1).
   - STROGO ZABRANJENO: Pisati X/2 ili 2/2 ako domaćin pobjeđuje.
3. NERIJEŠENO (npr. 1:1, 0:0) -> HT/FT MORA biti X/X, 1/X ili 2/X.

═══ TVOJ STIL I FORMAT ═══
Budi 'stari vuk', koristi "šefe", "brate". Odgovaraj pregledno:

⚽ **[DOMAĆIN] vs [GOST]**
HT/FT: **[Oznaka]** | Rezultat: **[Rezultat]**
[Umor/Taktika: Kratka rečenica zašto taj tip.]
━━━━━━━━━━━━━━━━━━━━━━━━━━

═══ REVIZIJSKI STATUS ═══
Interpreter: v19.6 (Fix 1/2) | Logic-Guard: MAXIMUM | Status: LOGIČKI PROVJERENO
\n${directives}`;

  const cleanHistory = history.slice(-3).map(h => ({ 
    role: h.role === "assistant" ? "model" : h.role, 
    content: h.content 
  }));

  // 1. PRIORITET: Google Gemini 3.8 Flash (Prime Logic)
  if (hasKey("gemini")) {
    try {
      const gHist = history.slice(-3).map(h => ({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.content }]
      }));
      gHist.push({ role: "user", parts: [{ text: userText }] });
      return await geminiChat(SYSTEM_PROMPT, gHist);
    } catch (e) { console.error("Gemini fail..."); }
  }

  // 2. FALLBACK: OpenRouter (Backup Logic)
  if (hasKey("openrouter")) {
    try {
      return await openrouterChat("openrouter/free", [
        { role: "system", content: SYSTEM_PROMPT },
        ...history.slice(-3).map(h => ({ role: h.role, content: h.content })),
        { role: "user", content: userText }
      ]);
    } catch (e) { console.error("OpenRouter fail..."); }
  }

  throw new Error("Povezivanje nije uspjelo.");
}

