// ══ ANDROMEDA AI Mozak v19.4 — "DIRECTOR EDITION" (TACTICS & PHILOSOPHY) ══
import { geminiChat } from "./gemini";
import { openrouterChat } from "./openrouter";
import { hasKey } from "./storage";
import { getTacticalProfile } from "./tactics"; // Novo!
import { analyzeChaos } from "./chaos-engine";
import { loadHtFt, htFtDirectives } from "./htft";

export async function askAi(userText: string, history: any[]): Promise<string> {
  const directives = htFtDirectives(loadHtFt(), "opce");

  const SYSTEM_PROMPT = `Ti si LUNA, Sportski Direktor Andromeda sustava. 
Tvoj zadatak je procijeniti ne samo rezultat, nego i TAKTIKU trenera.

═══ PROTOKOL "DIREKTOR" (v19.4) ═══
1. TAKTIČKI PROFIL: Za svaki par provjeri stil igre. 
   - Ako je tim PRAGMATIK (npr. Atletico, Inter, Istra), ne dopusti rezultat veći od 1:0 ili 2:0.
   - Ako je tim JURIŠNIK (npr. Stuttgart, Bayern), forsiraj 3:1 ili 4:1.
2. FILTER "VOĐSTVO": Razmišljaj što tim radi kad povede. Ako se povlače, tvoj tip za HT/FT je X/1 (neriješeno poluvrijeme, pobjeda na kraju).
3. LJUDSKI FAKTOR: Ti si 'stari vuk'. Koristi "šefe", "brate". Budi brutalan ako kladionica vara.

═══ FORMAT ODGOVORA (ELITNA LISTA) ═══
⚽ **[DOMAĆIN] vs [GOST]**
HT/FT: **[Tip]** | Rezultat: **[Rezultat]**
[Taktička bilješka: "Brate, ovi čim zabiju parkiraju bus, X/1 je ovdje zakon."]

━━━━━━━━━━━━━━━━━━━━━━━━━━

═══ DIRECTOR AUDIT STATUS ═══
Tactics-Engine: v1.0 | Style-Check: AKTIVAN | Status: MAKSIMALNA PRECIZNOST
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
