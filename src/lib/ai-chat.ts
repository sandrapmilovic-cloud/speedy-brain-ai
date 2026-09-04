// ══ ANDROMEDA AI Mozak v18.7 — "THE REALIST ORACLE" (FAVORITE-BIAS & HT-X FIX) ══
import { geminiChat } from "./gemini";
import { openrouterChat } from "./openrouter";
import { hasKey } from "./storage";
import { detectMarket } from "./specialists";
import { loadHtFt, htFtDirectives } from "./htft";

export async function askAi(userText: string, history: any[]): Promise<string> {
  const market = detectMarket(userText);
  const directives = htFtDirectives(loadHtFt(), market);

  const SYSTEM_PROMPT = `Ti si LUNA, Oracle Andromeda sustava. 
Tvoj ton je prijateljski ("šefe", "brate"), ali tvoja matematika je hladna i realna.

═══ PROTOKOL "REALIST" (ZABRANJEN OPTIMIZAM) ═══
1. STOP FAVORITE BIAS: Ako favorit nije apsolutni gigant (kvota > 1.40), tvoj prvi instinkt za HT/FT je X/1 ili X/2. Favoriti rijetko vode u 20. minuti.
2. LOGIČKA KONZISTENCIJA: 
   - Ako je rezultat 1:0 ili 0:1, HT/FT mora biti X/1, 1/1, X/2 ili 2/2. 
   - Nema preokreta (2/1) ako je krajnji rezultat 0:2. To je sramota za sustav.
3. REALNI REZULTATI: Forsiraj 1:0, 1:1, 2:1 i 0:0. To su najčešći rezultati u nogometu. Izbjegavaj 3:0 i 4:0 osim ako nije baš ogroman nesrazmjer.
4. NEMA OKLIJEVANJA: Daj jedan fiksni tip po paru.

═══ FORMAT ODGOVORA (ELITNA LISTA) ═══
Evo hladne analize, šefe! Uveo sam "Realist Mode" za ove parove:

⚽ **[DOMAĆIN] vs [GOST]**
HT/FT: **[Tip]** | Rezultat: **[Točan Rezultat]**

(Samo čista lista, bez filozofiranja.)

═══ REVIZIJSKI STATUS ═══
REALIST_ENGINE: AKTIVAN | BIAS_REDUCTION: -15% | LOGIČKI_ČUVAR: NEPROBOJAN
\n${directives}`;

  const cleanHistory = history.slice(-3).map(h => ({ 
    role: h.role === "assistant" ? "model" : h.role, 
    content: h.content 
  }));

  // 1. PRIORITET: Gemini 3.8 Flash (Oracle Prime)
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

  // 2. FALLBACK: OpenRouter (Oracle Backup)
  if (hasKey("openrouter")) {
    try {
      return await openrouterChat("openrouter/free", [
        { role: "system", content: SYSTEM_PROMPT },
        ...history.slice(-3).map(h => ({ role: h.role, content: h.content })),
        { role: "user", content: userText }
      ]);
    } catch (e) { console.error("OpenRouter fail..."); }
  }

  throw new Error("Svi mozgovi su blokirani. Provjeri ključeve u Postavkama.");
}
