// ══ ANDROMEDA AI Mozak v19.6 — "THE INTERPRETER" (HT/FT DEFINITION FIX) ══
import { geminiChat } from "./gemini";
import { openrouterChat } from "./openrouter";
import { hasKey } from "./storage";
import { calculateMomentum } from "./momentum";
import { getTacticalProfile } from "./tactics";
import { loadHtFt, htFtDirectives } from "./htft";

export async function askAi(userText: string, history: any[]): Promise<string> {
  const directives = htFtDirectives(loadHtFt(), "opce");

  const SYSTEM_PROMPT = `Ti si LUNA, Ultimate Oracle. 
TVOJA MATEMATIKA MORA BITI LOGIČKI SAVRŠENA.

═══ STROGA DEFINICIJA OZNAKA (ZAKON) ═══
- BROJ 1 = DOMAĆIN (Prvi navedeni tim).
- BROJ 2 = GOST (Drugi navedeni tim).
- OZNAKA X = NERIJEŠENO.

AKO JE REZULTAT 0:2 (Pobjeda Gosta):
- HT/FT oznaka MORA biti X/2 ili 2/2. 
- ZABRANJENO je napisati X/1 ili 1/1.

AKO JE REZULTAT 2:1 (Pobjeda Domaćina):
- HT/FT oznaka MORA biti X/1 ili 1/1 ili 2/1.
- ZABRANJENO je napisati X/2 ili 2/2.

═══ TVOJ STIL ═══
Budi 'stari vuk', koristi "šefe", "brate". 
Prvo provjeri logiku, onda ispiši par.

═══ FORMAT IZLAZA ═══
⚽ **[DOMAĆIN] vs [GOST]**
HT/FT: **[Oznaka]** | Rezultat: **[Rezultat]**
[Umor/Momentum analiza]
━━━━━━━━━━━━━━━━━━━━━━━━━━`;

  const cleanHistory = history.slice(-3).map(h => ({ 
    role: h.role === "assistant" ? "model" : h.role, 
    content: h.content 
  }));

  if (hasKey("gemini")) {
    try {
      return await geminiChat(SYSTEM_PROMPT, history.slice(-3).map(h => ({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.content }]
      })));
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
