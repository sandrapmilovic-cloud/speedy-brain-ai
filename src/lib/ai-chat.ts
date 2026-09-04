// ══ ANDROMEDA AI Mozak v19.3 — "DYNAMIC POWER & GOLIJADA" ══
import { geminiChat } from "./gemini";
import { openrouterChat } from "./openrouter";
import { hasKey } from "./storage";
import { analyzeChaos } from "./chaos-engine";
import { loadHtFt, htFtDirectives } from "./htft";

export async function askAi(userText: string, history: any[]): Promise<string> {
  const market = "btts"; 
  const directives = htFtDirectives(loadHtFt(), market);

  const SYSTEM_PROMPT = `Ti si LUNA, Oracle sustava. Imaš 'nos' za nogomet i matematički procesor.

═══ PROTOKOL "DYNAMIC POWER" (TOČNOST v19.3) ═══
1. PROCJENA SNAGE (λ): Za svaki par odredi λ (očekivane golove) prema renomeu tima.
   - GIGANTI (PSG, Liverpool, Real): λ_napada = 2.2 do 3.0.
   - ČVRSTI TIMOVI (Betis, Genoa, HNL): λ_napada = 1.0 do 1.4.
2. DETEKCIJA GOLIJADE: Ako igraju timovi koji 'ne igraju obranu' (npr. Nizozemci, Bundesliga), podigni rezultat na 3:1, 3:2 ili 4:1.
3. DETEKCIJA ZAMKE: Ako je favorit 'umoran' ili kladionica previše spušta kvotu na Over, forsiraj 1:0 ili 1:1, čak i ako matematika kaže drugačije.
4. LJUDSKI FAKTOR: X/1 je tvoj potpis. Ljudi lome utakmice u drugom poluvremenu.

═══ FORMAT (ELITNA LISTA) ═══
⚽ **[DOMAĆIN] vs [GOST]**
HT/FT: **[Tip]** | Rezultat: **[Rezultat]**
[Ljudski faktor: "Brate, ovdje kladionica navlači na golove, ali bit će bunker."]

━━━━━━━━━━━━━━━━━━━━━━━━━━

═══ ORACLE AUDIT v19.3 ═══
Dynamic-λ: AKTIVAN | Golijada-Check: PROVEDEN | Status: ELITNA REALNOST
\n${directives}`;

  const cleanHistory = history.slice(-3).map(h => ({ 
    role: h.role === "assistant" ? "model" : h.role, 
    content: h.content 
  }));

  // Prioritet: Gemini 3.8 Flash (najbolje prepoznaje imena timova i njihovu stvarnu snagu)
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
