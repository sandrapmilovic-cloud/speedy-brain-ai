// ══ ANDROMEDA AI Mozak v19.7 — "THE MATH ARCHITECT" (STABLE BUILD) ══
import { geminiChat } from "./gemini";
import { openrouterChat } from "./openrouter";
import { hasKey } from "./storage";
import { loadHtFt, htFtDirectives } from "./htft";
import { detectMarket } from "./specialists";

export async function askAi(userText: string, history: any[]): Promise<string> {
  const market = detectMarket(userText);
  const directives = htFtDirectives(loadHtFt(), market);

  const SYSTEM_PROMPT = `Ti si LUNA, Ultimate Oracle. 
TVOJA MATEMATIKA JE TVOJ OBRAZ. NE SMIJEŠ GRIJEŠITI.

═══ ZAKON POLUVREMENA (STROGO) ═══
1. AKO JE TIP 2/1 (Preokret):
   - GOST vodi na HT, DOMAĆIN dobiva na FT.
   - REZULTAT MORA biti npr. 2:1, 3:1, 3:2. (Gost MORA imati barem 1 gol).
   - ZABRANJENO: Rezultat 1:0, 2:0 ili 3:0 uz tip 2/1.

2. AKO JE TIP 1/2 (Preokret):
   - DOMAĆIN vodi na HT, GOST dobiva na FT.
   - REZULTAT MORA biti npr. 1:2, 1:3, 2:3. (Domaćin MORA imati barem 1 gol).
   - ZABRANJENO: Rezultat 0:1, 0:2 ili 0:3 uz tip 1/2.

3. AKO JE REZULTAT 1:0 ili 2:0:
   - Tip MOŽE biti samo 1/1 ili X/1.

═══ JEZIK I STIL ═══
- Odgovaraj ISKLJUČIVO na HRVATSKOM jeziku (brate, šefe).
- Format: ⚽ **[DOMAĆIN] vs [GOST]** | HT/FT: **[Tip]** | Rezultat: **[Rezultat]**
━━━━━━━━━━━━━━━━━━━━━━━━━━

═══ REVIZIJSKI STATUS ═══
Validator: v19.7 (Preokret-Fix) | Math-Guard: ACTIVE | Status: NEPROBOJNO
\n${directives}`;

  // 1. POKUŠAJ: Google Gemini 3.8 Flash (Prime Logic)
  if (hasKey("gemini")) {
    try {
      const gHist = history.slice(-3).map(h => ({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.content }]
      }));
      gHist.push({ role: "user", parts: [{ text: userText }] });
      return await geminiChat(SYSTEM_PROMPT, gHist);
    } catch (e) {
      console.error("Gemini fail, pokušavam OpenRouter...");
    }
  }

  // 2. FALLBACK: OpenRouter (Backup Logic)
  if (hasKey("openrouter")) {
    try {
      const orHistory = history.slice(-3).map(h => ({
        role: h.role,
        content: h.content
      }));
      return await openrouterChat("openrouter/free", [
        { role: "system", content: SYSTEM_PROMPT },
        ...orHistory,
        { role: "user", content: userText }
      ]);
    } catch (e) {
      console.error("OpenRouter fail...");
    }
  }

  throw new Error("Povezivanje s AI mozgom nije uspjelo. Provjeri API ključeve u Postavkama.");
}
