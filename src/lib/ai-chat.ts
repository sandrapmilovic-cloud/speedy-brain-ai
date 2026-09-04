// ══ ANDROMEDA AI Mozak v18.0 — "BULLETPROOF" ══
import { geminiChat } from "./gemini";
import { openrouterChat } from "./openrouter";
import { nvidiaChat } from "./nvidia";
import { hasKey } from "./storage";
import { detectMarket } from "./specialists";
import { loadHtFt, htFtDirectives } from "./htft";

export async function askAi(userText: string, history: any[]): Promise<string> {
  const market = detectMarket(userText);
  const directives = htFtDirectives(loadHtFt(), market);
  const sys = `Ti si LUNA. Odgovaraj HRVATSKI. Daj TIP i SIGURNOST.\n${directives}`;
  const cleanHistory = history.slice(-2).map(h => ({ role: h.role, content: h.content }));

  if (hasKey("openrouter")) {
    try {
      // Koristimo novi slug koji ti je OpenRouter sam predložio u greški
      return await openrouterChat("meta-llama/llama-3.1-8b-instruct:free", [
        { role: "system", content: sys },
        ...cleanHistory,
        { role: "user", content: userText }
      ]);
    } catch (e: any) { console.error("OpenRouter promašaj"); }
  }

  if (hasKey("nvidia")) {
    try {
      return await nvidiaChat("meta/llama-3.1-8b-instruct", [
        { role: "system", content: sys },
        ...cleanHistory,
        { role: "user", content: userText }
      ]);
    } catch (e) { console.error("NVIDIA promašaj"); }
  }

  throw new Error("Svi mozgovi su blokirani ili su ključevi neispravni. Provjeri Postavke.");
}
