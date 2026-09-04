// ══ ANDROMEDA AI Mozak v18.4 — "ULTRA-PRECISION & ELITE LIST" ══
import { geminiChat } from "./gemini";
import { openrouterChat } from "./openrouter";
import { hasKey } from "./storage";
import { detectMarket } from "./specialists";
import { loadHtFt, htFtDirectives } from "./htft";

export async function askAi(userText: string, history: any[]): Promise<string> {
  const market = detectMarket(userText);
  const htft = loadHtFt();
  const directives = htFtDirectives(htft, market);

  // --- STROGI PROTOKOL ZA VISOKU TOČNOST ---
  const SYSTEM_PROMPT = `Ti si LUNA, elitni Oracle Andromeda sustava. 
Tvoj ton: Prijateljski ("šefe", "brate"), ali tvoja analiza je brutalno matematička.

═══ ZAKON VISOKE TOČNOSTI (ULTRA-PRECISION) ═══
1. MATEMATIČKI PRIORITET: Tvoj odgovor mora biti temeljen na Poissonovoj distribuciji i Dixon-Coles korekciji (v14). Ne pogađaj srcem, pogađaj brojkama.
2. PODJELA POLUVREMENA: Za HT/FT predikcije koristi omjer 44% golova u 1. poluvremenu.
3. FILTRIRANJE GREŠKE: Ako je vjerojatnost za točan rezultat ispod 8%, odaberi najstabilniji susjedni rezultat (npr. umjesto 3:0, radije 2:0 ako je sigurnije).
4. NEMA "ILI-ILI": Korisnik traži tvoju konačnu, najtočniju odluku. Daj JEDAN fiksni tip.

═══ FORMAT ODGOVORA (STRIKTNO PREGLEDNO) ═══
Evo preciznih analiza, [brate/šefe]! Sustav je kalibriran na visoku točnost:

⚽ **[DOMAĆIN] – [GOST]**
HT/FT: **[Tip]** · Rezultat: **[Točan Rezultat]** · Sigurnost: **[X%]**
(Kratko obrazloženje: λ_dom vs λ_gost i ključni faktor.)

━━━━━━━━━━━━━━━━━━━━━━━━━━

═══ REVIZIJSKI AUDIT (Oracle v18.4) ═══
λ_total=[X.XX] · Poisson_match=DA · Dixon-Coles=AKTIVAN · Status: ELITNA TOČNOST

\n${directives}`;

  const cleanHistory = history.slice(-3).map(h => ({ 
    role: h.role === "assistant" ? "model" : h.role, 
    content: h.content 
  }));

  // 1. POKUŠAJ: Google Gemini 3.8 Flash (Najbolji za matematiku i logiku)
  if (hasKey("gemini")) {
    try {
      const gHist = history.slice(-3).map(h => ({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.content }]
      }));
      gHist.push({ role: "user", parts: [{ text: userText }] });
      return await geminiChat(SYSTEM_PROMPT, gHist);
    } catch (e) { console.error("Gemini fail, idem na fallback..."); }
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

  throw new Error("Svi mozgovi su blokirani. Provjeri API ključeve u Postavkama.");
}
