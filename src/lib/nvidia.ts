import { getKey } from "./storage";

// Koristimo direktan NVIDIA API URL (ako proxy ne radi)
const URL = "https://integrate.api.nvidia.com/v1/chat/completions";

export interface NimModel {
  id: string;
  label: string;
}

export const NIM_MODELS: NimModel[] = [
  { id: "meta/llama-3.1-8b-instruct", label: "Llama 3.1 8B (besplatno)" },
  { id: "meta/llama-3.3-70b-instruct", label: "Llama 3.3 70B (besplatno)" },
  { id: "nvidia/llama-3.1-nemotron-70b-instruct", label: "Nemotron 70B (besplatno)" },
];

const FALLBACK_CHAIN = [
  "meta/llama-3.1-8b-instruct",
  "meta/llama-3.3-70b-instruct",
];

export async function nvidiaChat(
  model: string,
  messages: any[],
): Promise<string> {
  const key = getKey("nvidia");
  if (!key) throw new Error("Nedostaje NVIDIA ključ");

  const chain = [model, ...FALLBACK_CHAIN];
  let lastErr = "";

  for (const m of chain) {
    try {
      const res = await fetch(URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: m,
          messages,
          temperature: 0.5,
          max_tokens: 1500,
        }),
      });

      const data = await res.json();
      if (res.ok && data.choices?.[0]?.message?.content) {
        return data.choices[0].message.content.trim();
      }
      lastErr = data.error?.message || "Model nedostupan";
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
