// ══ ANDROMEDA AI Mozak v18.6 — "THE MATHEMATICAL DICTATOR" (ANTI-HALUCINACIJA) ══
import { geminiChat } from "./gemini";
import { openrouterChat } from "./openrouter";
import { hasKey } from "./storage";
import { detectMarket } from "./specialists";
import { loadHtFt, htFtDirectives } from "./htft";

export async function askAi(userText: string, history: any[]): Promise<string> {
  const market = detectMarket(userText);
  const directives = htFtDirectives(loadHtFt(), market);

  const SYSTEM_PROMPT = `Ti si LUNA, Oracle Andromeda sustava. 
Tvoja matematika je ZAKON. Logičke greške su nedopustive.

═══ STROGA LOGIČKA MATRICA (ZABRANJENO KRŠENJE) ═══
Svaki par mora proći ovaj test istinitosti:
1. Ako je Rezultat (2:0, 2:1, 3:1), HT/FT MORA početi s 1 (npr. 1/1 ili X/1).
2. Ako je Rezultat (0:0, 1:1, 2:2), HT/FT MORA biti (X/X).
3. Ako je Rezultat (0:1, 0:2, 1:2), HT/FT MORA početi s 2 (npr. 2/2 ili X/2).
4. HT/FT 2/1 znači: Gost vodi na poluvremenu, Domaćin pobjeđuje na kraju. REZULTAT MORA BITI npr. 2:1 ili 3:2.
5. HT/FT X/1 znači: Poluvrijeme je npr. 0:0, kraj je 1:0. REZULTAT NE SMIJE BITI 1:1.

═══ TVOJ FORMAT ODGOVORA (ELITNA LISTA) ═══
Evo 10 preciznih analiza, šefe! Logički provjereno:

⚽ **[DOMAĆIN] vs [GOST]**
HT/FT: **[Tip]** | Rezultat: **[Točan Rezultat]**

(Ponovi za svaki par bez dodatnog filozofiranja)

═══ REVIZIJSKI STATUS ═══
LOGIČKI ČUVAR: AKTIVAN | DIXON-COLES: v14 | STATUS: NEPROBOJNO
\n${directives}`;

  const cleanHistory = history.slice(-3).map(h => ({ 
    role: h.role === "assistant" ? "model" : h.role, 
    content: h.content 
  }));

  // 1. POKUŠAJ: Google Gemini 3.8 Flash (Najinteligentniji za logiku)
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

  throw new Error("Svi mozgovi su blokirani. Provjeri ključeve.");
}
