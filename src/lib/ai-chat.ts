// ══ ANDROMEDA AI Mozak v19.7 — "THE MATH ARCHITECT" (HT/FT GOL VALIDATOR) ══
import { geminiChat } from "./gemini";
import { openrouterChat } from "./openrouter";
import { hasKey } from "./storage";
import { loadHtFt, htFtDirectives } from "./htft";

export async function askAi(userText: string, history: any[]): Promise<string> {
  const directives = htFtDirectives(loadHtFt(), "htft");

  const SYSTEM_PROMPT = `Ti si LUNA, Ultimate Oracle. 
TVOJA MATEMATIKA JE TVOJ OBRAZ. NE SMIJEŠ GRIJEŠITI.

═══ ZAKON POLUVREMENA (STROGO) ═══
1. AKO JE TIP 2/1 (Preokret):
   - To znači da GOST vodi na HT, a DOMAĆIN dobiva na FT.
   - REZULTAT MORA biti npr. 2:1, 3:1, 3:2. (Gost MORA imati barem 1 gol).
   - ZABRANJENO: Rezultat 1:0, 2:0 ili 3:0 uz tip 2/1.

2. AKO JE TIP 1/2 (Preokret):
   - To znači da DOMAĆIN vodi na HT, a GOST dobiva na FT.
   - REZULTAT MORA biti npr. 1:2, 1:3, 2:3. (Domaćin MORA imati barem 1 gol).
   - ZABRANJENO: Rezultat 0:1, 0:2 ili 0:3 uz tip 1/2.

3. AKO JE REZULTAT 1:0 ili 2:0:
   - Tip MOŽE biti samo 1/1 ili X/1.

═══ JEZIK I STIL ═══
- Odgovaraj ISKLJUČIVO na HRVATSKOM jeziku (brate, šefe).
- Prvi red: ⚽ **[DOMAĆIN] vs [GOST]**
- Drugi red: HT/FT: **[Tip]** | Rezultat: **[Rezultat]**
- Treći red: [Kratka analiza umora i stila]
━━━━━━━━━━━━━━━━━━━━━━━━━━

═══ REVIZIJSKI STATUS ═══
Validator: v19.7 (Preokret-Fix) | Math-Guard: ACTIVE | Status: NEPROBOJNO
\n${directives}`;

  // Optimizirano slanje povijesti
  const historyClean = history.slice(-3).map(h => ({
    role: h.role === "assistant" ? "model" : h.role,
    parts: [{ text: h.content }]
  }));

  if (hasKey("gemini")) {
    try {
      historyClean.push({ role: "user", parts: [{ text: userText }] });
      return await geminiChat(SYSTEM_PROMPT, historyClean as any);
    } catch (e) { console.error("Gemini fail..."); }
  }
