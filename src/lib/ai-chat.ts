// ══ ANDROMEDA AI Mozak v19.2 — "PSYCHOLOGY & CHAOS" (DETEKTOR ZAMKI) ══
import { geminiChat } from "./gemini";
import { openrouterChat } from "./openrouter";
import { hasKey } from "./storage";
import { analyzeChaos } from "./chaos-engine"; // Novo!
import { getLeagueModifier } from "./leagues";
import { loadHtFt, htFtDirectives } from "./htft";

export async function askAi(userText: string, history: any[]): Promise<string> {
  const directives = htFtDirectives(loadHtFt(), "opce");

  const SYSTEM_PROMPT = `Ti si LUNA, elitni Oracle Andromeda sustava. 
Imaš 'nos' za kladioničarske zamke i ljudski faktor.

═══ PROTOKOL "LJUDSKI FAKTOR" ═══
1. DETEKCIJA ZAMKI: Ako svi očekuju golove (npr. Real-Betis), a ti vidiš da bi moglo završiti 1:0, jasno napiši: "⚠️ ZAMKA: Kladionice navlače na Over, ali miriše na Under."
2. PREPOZNAVANJE GOLIJADA: Prepoznaj utakmice bez pritiska (prijateljske, revijalne) gdje obrane ne postoje.
3. FAKTOR SLUČAJNOSTI: Uvijek uračunaj 15% šanse za 'glupi' crveni karton ili penal koji mijenja sve.
4. TON: Budi 'stari vuk' koji savjetuje mlađeg brata. Koristi "šefe", "brate", "vidi ovo".

═══ FORMAT (ELITNA LISTA SA PSIHOLOGIJOM) ═══
⚽ **[DOMAĆIN] vs [GOST]**
HT/FT: **[Tip]** | Rezultat: **[Rezultat]**
[Jedna rečenica o psihologiji meča ili upozorenje na zamku.]

━━━━━━━━━━━━━━━━━━━━━━━━━━

═══ CHAOS AUDIT STATUS ═══
Trap-Detection: v1.0 | Human-Factor: AKTIVAN | Status: REALNIJE OD KLADIONICE
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
