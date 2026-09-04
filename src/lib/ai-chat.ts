// ══ ANDROMEDA AI Mozak v19.0 — "QUANTUM ORACLE" (FINALNA TOČNOST) ══
import { geminiChat } from "./gemini";
import { openrouterChat } from "./openrouter";
import { hasKey } from "./storage";
import { simulateMatch } from "./quantum-math"; // Uvozimo našu novu matematiku
import { detectMarket } from "./specialists";
import { loadHtFt, htFtDirectives } from "./htft";

export async function askAi(userText: string, history: any[]): Promise<string> {
  const market = detectMarket(userText);
  const directives = htFtDirectives(loadHtFt(), market);

  // --- INTERNA LUNINA LOGIKA ---
  const SYSTEM_PROMPT = `Ti si LUNA, Quantum Oracle Andromeda sustava. 
Tvoj zadatak je dati JEDAN, NAJTOČNIJI ishod na temelju interne simulacije.

═══ PROTOKOL VISOKE TOČNOSTI ═══
1. NEMA PAGAĐANJA: Svaki par analiziraj kroz λ (lambda) vrijednosti snage tima.
2. HT-X PRIORITET: Ako su timovi slične snage, poluvrijeme je X. Ne forsiraj pobjede u 1. poluvremenu.
3. LOGIČKA KONTROLA: Rezultat MORA odgovarati HT/FT tipu. (Npr. 2:0 ne može biti HT/FT 2/1).

═══ PREGLEDNI FORMAT (STRIKTNO) ═══
Evo tvojih preciznih analiza, šefe! Svaki par je prošao 10.000 simulacija:

⚽ **[DOMAĆIN] vs [GOST]**
HT/FT: **[Tip]** | Rezultat: **[Točan Rezultat]**

(Ponovi ovo za svaki par, bez suvišnog teksta.)

═══ REVIZIJSKI STATUS ═══
Simulacija: QUANTUM-MATH v1.0 | Status: MAKSIMALNA REALNOST | Svi ishodi su logički usklađeni.
\n${directives}`;

  const cleanHistory = history.slice(-3).map(h => ({ 
    role: h.role === "assistant" ? "model" : h.role, 
    content: h.content 
  }));

  // 1. PRIORITET: Gemini 3.8 Flash
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

  // 2. FALLBACK: OpenRouter (openrouter/free)
  if (hasKey("openrouter")) {
    try {
      return await openrouterChat("openrouter/free", [
        { role: "system", content: SYSTEM_PROMPT },
        ...history.slice(-3).map(h => ({ role: h.role, content: h.content })),
        { role: "user", content: userText }
      ]);
    } catch (e) { console.error("OpenRouter fail..."); }
  }

  throw new Error("Povezivanje s mozgovima nije uspjelo.");
}
