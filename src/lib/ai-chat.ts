// ══ ANDROMEDA AI Mozak v18.1 — "THE ULTIMATE ORACLE" ══
import { geminiChat } from "./gemini";
import { openrouterChat } from "./openrouter";
import { hasKey } from "./storage";
import { detectMarket } from "./specialists";
import { loadHtFt, htFtDirectives } from "./htft";

export async function askAi(userText: string, history: any[]): Promise<string> {
  const market = detectMarket(userText);
  const directives = htFtDirectives(loadHtFt(), market);
  const sys = `Ti si LUNA (Oracle v18). Odgovaraj isključivo HRVATSKI. 
Daj TIP i SIGURNOST u prvoj rečenici. Fokusiraj se na HT/FT i Točne Rezultate.
Zanemari skip filtere. \n${directives}`;

  const cleanHistory = history.slice(-3).map(h => ({ 
    role: h.role === "assistant" ? "model" : h.role, 
    content: h.content 
  }));

  // 1. POKUŠAJ: Izravni Google Gemini 3.8 Flash (Najbrži i najtočniji)
  if (hasKey("gemini")) {
    try {
      const gHist = history.slice(-3).map(h => ({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.content }]
      }));
      gHist.push({ role: "user", parts: [{ text: userText }] });
      return await geminiChat(sys, gHist);
    } catch (e) { console.error("Direct Gemini fail, idem na fallback..."); }
  }

  // 2. POKUŠAJ: OpenRouter FREE ROUTER (Uvijek nalazi radni besplatni model)
  if (hasKey("openrouter")) {
    try {
      return await openrouterChat("openrouter/free", [
        { role: "system", content: sys },
        ...history.slice(-3).map(h => ({ role: h.role, content: h.content })),
        { role: "user", content: userText }
      ]);
    } catch (e) { console.error("OpenRouter Free Router fail..."); }
  }

  throw new Error("Nijedan mozak nije dostupan. Provjeri API ključeve u Postavkama.");
}
