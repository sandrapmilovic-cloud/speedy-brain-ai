// ══ ANDROMEDA AI Mozak v19.1 — "MASTER ORACLE" (LEAGUE DNA & QUANTUM MATH) ══
import { geminiChat } from "./gemini";
import { openrouterChat } from "./openrouter";
import { hasKey } from "./storage";
import { simulateMatch } from "./quantum-math";
import { getLeagueModifier } from "./leagues"; // Uvozimo DNA liga
import { detectMarket } from "./specialists";
import { loadHtFt, htFtDirectives } from "./htft";

export async function askAi(userText: string, history: any[]): Promise<string> {
  const market = detectMarket(userText);
  const directives = htFtDirectives(loadHtFt(), market);

  // --- MASTER SYSTEM PROMPT ---
  const SYSTEM_PROMPT = `Ti si LUNA, elitni Master Oracle. 
Tvoja točnost dolazi iz spajanja matematičke simulacije i "League DNA" faktora.

═══ PROTOKOL "MASTER PRECISION" ═══
1. IDENTIFIKACIJA LIGE: Prepoznaj ligu iz upita. Ako je npr. HNL, automatski smanji broj očekivanih golova (Under bias).
2. QUANTUM SIMULACIJA: Interno pokreni 10,000 simulacija. Fokusiraj se na X/1 i X/2 ishode kod favorita.
3. BEZ HALUCINACIJA: HT/FT ishod i Rezultat moraju biti logički savršeni (Npr. 1:1 ne može biti 1/1).
4. JEDAN TIP: Ne daj "možda". Budi sigurna u svoj izračun.

═══ FORMAT (PREGLEDNO KAO NA SLICI) ═══
Evo tvojih elitnih analiza, šefe! Svaki par je prošao Master Audit:

⚽ **[DOMAĆIN] vs [GOST]**
HT/FT: **[Tip]** | Rezultat: **[Točan Rezultat]**
[Jedna rečenica: "League DNA sugerira tvrd meč, X na poluvremenu je vrlo izgledan."]

━━━━━━━━━━━━━━━━━━━━━━━━━━

═══ MASTER AUDIT STATUS ═══
Math: Quantum v1.0 | DNA: League-Factor v1.0 | Status: ELITNA REALNOST
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

  throw new Error("Povezivanje nije uspjelo. Provjeri ključeve.");
}
