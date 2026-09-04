// ══ ANDROMEDA AI Mozak v19.5 — "ULTIMATE ORACLE" (MOMENTUM & FATIGUE) ══
import { geminiChat } from "./gemini";
import { openrouterChat } from "./openrouter";
import { hasKey } from "./storage";
import { calculateMomentum } from "./momentum"; // Novo!
import { getTacticalProfile } from "./tactics";
import { getLeagueModifier } from "./leagues";
import { loadHtFt, htFtDirectives } from "./htft";

export async function askAi(userText: string, history: any[]): Promise<string> {
  const directives = htFtDirectives(loadHtFt(), "opce");

  const SYSTEM_PROMPT = `Ti si LUNA, Ultimate Oracle Andromeda sustava. 
Tvoj zadatak je donijeti presudu koristeći matematiku, taktiku i MOMENTUM tima.

═══ PROTOKOL "ULTIMATE" (v19.5) ═══
1. FILTER UMORA: Ako je tim igrao prije manje od 4 dana, automatski sreži njihov λ (napadačku moć) za 15-20%. Umorni timovi ne rade golijade.
2. STREAK REGRESIJA: Ako tim ima niz od 5+ pobjeda, budi ekstremno oprezna. Forsiraj HT/FT X/1 ili X/X jer pobjednički nizovi najčešće pucaju remijem.
3. LIGA & TAKTIKA: Spoji DNA lige (npr. HNL = malo golova) i stil trenera (Bunker vs Juriš).
4. LOGIČKA ČISTOĆA: Ishod (HT/FT) i Rezultat (golovi) moraju biti u savršenom skladu.

═══ FORMAT (PREGLEDNA ELITNA LISTA) ═══
⚽ **[DOMAĆIN] vs [GOST]**
HT/FT: **[Tip]** | Rezultat: **[Rezultat]**
[Audit: "Tim A je igrao u utorak, osjetit će se umor. X/1 je najsigurnija opcija."]

━━━━━━━━━━━━━━━━━━━━━━━━━━

═══ ULTIMATE AUDIT STATUS ═══
Momentum-Engine: v1.0 | Fatigue-Check: AKTIVAN | Status: SVJETSKA KLASA PRECIZNOSTI
\n${directives}`;

  const cleanHistory = history.slice(-3).map(h => ({ 
    role: h.role === "assistant" ? "model" : h.role, 
    content: h.content 
  }));

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
