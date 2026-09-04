// ══ ANDROMEDA AI Mozak v18.5 — "LOGICAL GUARD" (FIX ZA IPSWICH/ULJANIK GREŠKU) ══
import { geminiChat } from "./gemini";
import { openrouterChat } from "./openrouter";
import { hasKey } from "./storage";
import { detectMarket } from "./specialists";
import { loadHtFt, htFtDirectives } from "./htft";

export async function askAi(userText: string, history: any[]): Promise<string> {
  const market = detectMarket(userText);
  const directives = htFtDirectives(loadHtFt(), market);

  const SYSTEM_PROMPT = `Ti si LUNA, Oracle Andromeda sustava. Tvoj ton je prijateljski, ali tvoja matematika mora biti NEPROBOJNA.

═══ ZAKON LOGIČKE KONZISTENCIJE (KRITIČNO) ═══
Prije nego ispišeš par, provjeri:
- Ako je tip 1/1, rezultat MORA biti pobjeda domaćina (npr. 2:0, 2:1).
- Ako je tip X/X, rezultat MORA biti remi (npr. 0:0, 1:1).
- Ako je tip 2/2, rezultat MORA biti pobjeda gosta (npr. 0:2, 1:2).
- Ako je tip X/1, poluvrijeme mora biti X, a kraj pobjeda domaćina.
- NIKADA nemoj napisati "HT/FT 2/1" uz rezultat "1:2". To je matematička sramota.

═══ FORMAT ODGOVORA ═══
Evo precizne liste, šefe:

⚽ **[DOMAĆIN] vs [GOST]**
HT/FT: **[Tip]** | Rezultat: **[Točan Rezultat]**

(Samo čista lista, bez suvišnog teksta.)

═══ REVIZIJA ═══
Status: LOGIČKI PROVJERENO · Matematika: Poisson v14 
\n${directives}`;

  const cleanHistory = history.slice(-3).map(h => ({ 
    role: h.role === "assistant" ? "model" : h.role, 
    content: h.content 
  }));

  // 1. PRIORITET: Gemini 3.8
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

  // 2. FALLBACK: OpenRouter
  if (hasKey("openrouter")) {
    try {
      return await openrouterChat("openrouter/free", [
        { role: "system", content: SYSTEM_PROMPT },
        ...history.slice(-3).map(h => ({ role: h.role, content: h.content })),
        { role: "user", content: userText }
      ]);
    } catch (e) { console.error("OpenRouter fail..."); }
  }

  throw new Error("Greška u povezivanju s mozgom.");
}
