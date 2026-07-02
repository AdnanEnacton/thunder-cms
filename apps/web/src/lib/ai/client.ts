const KEY_STORAGE = "thunder_openai_key";
const MODEL_STORAGE = "thunder_ai_model";

export function getApiKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(KEY_STORAGE) ?? "";
}

export function setApiKey(key: string) {
  if (typeof window === "undefined") return;
  if (key) localStorage.setItem(KEY_STORAGE, key);
  else localStorage.removeItem(KEY_STORAGE);
}

export function getModel(): string {
  if (typeof window === "undefined") return "gpt-4o-mini";
  return localStorage.getItem(MODEL_STORAGE) || "gpt-4o-mini";
}

export function setModel(model: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(MODEL_STORAGE, model);
}

export type AiAction = "improve" | "grammar" | "shorter" | "longer" | "title" | "summary";

const ACTION_PROMPTS: Record<AiAction, string> = {
  improve: "Improve the writing of the following Markdown content. Keep it as Markdown, preserve any frontmatter-style structure, links, and code blocks. Return only the improved Markdown.",
  grammar: "Fix grammar and spelling in the following Markdown content. Preserve all Markdown formatting, links, and code blocks. Return only the corrected Markdown.",
  shorter: "Make the following Markdown content more concise while keeping the meaning and Markdown formatting. Return only the shortened Markdown.",
  longer: "Expand the following Markdown content with more detail and depth while keeping the Markdown formatting. Return only the expanded Markdown.",
  title: "Suggest 5 concise, compelling titles for the following content. Return only a numbered list, one title per line.",
  summary: "Write a 2-sentence summary of the following content. Return only the summary text.",
};

export async function runAiAction(
  action: AiAction,
  text: string,
  customPrompt?: string,
): Promise<string> {
  const key = getApiKey();
  if (!key) throw new Error("No OpenAI API key set. Add one in the AI assistant.");

  const system = customPrompt
    ? `${customPrompt} Return only the rewritten Markdown, preserving formatting.`
    : ACTION_PROMPTS[action];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: getModel(),
      messages: [
        { role: "system", content: system },
        { role: "user", content: text || "(empty)" },
      ],
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    let msg = `OpenAI error (${res.status})`;
    try {
      const data = await res.json();
      msg = data?.error?.message ?? msg;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.trim() ?? "";
}
