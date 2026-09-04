import { getKey } from "./storage";

// Koristimo direktan NVIDIA API URL
const URL = "https://integrate.api.nvidia.com/v1/chat/completions";

export interface NimModel {
  id: string;
  label: string;
  specialist?: "predictions" | "reasoning" | "math" | "fast" | "vision";
}

// Katalog modela koji su trenutno aktivni i besplatni
export const NIM_MODELS: NimModel[] = [
  { id: "meta/llama-3.1-8b-instruct", label: "Llama 3.1 8B (besplatno)", specialist: "fast" },
  { id: "meta/llama-3.3-70b-instruct", label: "Llama 3.3 70B (besplatno)", specialist: "predictions" },
  { id: "nvidia/llama-3.1-nemotron-70b-instruct", label: "Nemotron 70B (besplatno)", specialist: "math" },
  { id: "deepseek-ai/deepseek-r1", label: "DeepSeek R1 (besplatno)", specialist: "reasoning" },
];

/** 
 * VAŽNO: Ovaj izvoz je bio obrisan, a potreban je za src/lib/omni.ts.
 * Ovdje navodimo modele koje Omni motor koristi za gol tržišta.
 */
export const NIM_GOAL_MODELS = [
  "meta/llama-3.3-70b-instruct",
  "meta/llama-3.1-8b-instruct",
  "nvidia/llama-3.1-nemotron-70b-instruct",
];

const FALLBACK_CHAIN = [
  "meta/llama-3.1-8b-instruct",
  "meta/llama-3.3-70b-instruct",
];

export interface NimMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function callOnce(
  key: string,
  model: string,
  messages: NimMessage[],
): Promise<string> {
  const res = await fetch(URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.5,
      max_tokens: 1500,
    }),
  });

  const data = await res.json();
  if (res.ok && data.choices?.[0]?.message?.content) {
    return data.choices[0].message.content.trim();
  }
  throw new Error(data.error?.message || "Model nedostupan");
}

export async function nvidiaChat(
  model: string,
  messages: NimMessage[],
): Promise<string> {
  const key = getKey("nvidia");
  if (!key) throw new Error("Nedostaje NVIDIA ključ");

  const chain = [model, ...FALLBACK_CHAIN];
  let lastErr = "";

  for (const m of chain) {
    try {
      return await callOnce(key, m, messages);
    } catch (e: any) {
      lastErr = e.message;
    }
  }
  throw new Error(lastErr);
}

export async function testNvidia(): Promise<{ ok: boolean; msg: string }> {
  try {
    await nvidiaChat("meta/llama-3.1-8b-instruct", [{ role: "user", content: "Say OK" }]);
    return { ok: true, msg: "NVIDIA NIM radi!" };
  } catch (e: any) {
    return { ok: false, msg: e.message };
  }
}
