// @/lib/driveUpdateCanon.ts (原 deriveCanonicalUpdate.ts)

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PROMPT_4_ISSUERCANON_URL =
  process.env.PROMPT_4_ISSUERCANON_URL ??
  "https://drive.google.com/uc?export=download&id=1vgkQ8Bk0iXLCKCEK1r5OG2WM-vBZcrSJ";

type PromptConfig = {
  system: string;
  user: string;
};
let cachedPrompts: PromptConfig | null = null;

async function fetchPrompts(): Promise<PromptConfig> {
  if (cachedPrompts) return cachedPrompts;
  // ... (implementation remains the same)
  const res = await fetch(PROMPT_4_ISSUERCANON_URL);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("❌ ISSUERCANON PROMPTS fetch failed", res.status, body);
    throw new Error(
      `ISSUERCANON PROMPTS HTTP ${res.status} error during fetch.`,
    );
  }

  const prompts = (await res.json()) as Partial<PromptConfig>;
  if (!prompts.system || !prompts.user) {
    throw new Error("Missing prompt fields in prompts.json");
  }

  cachedPrompts = {
    system: prompts.system,
    user: prompts.user,
  };

  return cachedPrompts;
}

/**
 * 呼叫 GPT 根據摘要和既有 Canonical Bible 判斷是否需要更新。
 * @returns 包含 canonical 和 alias 的配對，如果無需更新，則為 {"canonical": "", "alias": ""}。
 */
// ✅ 匯出名稱修正為 driveUpdateCanon
export async function driveUpdateCanon(params: { 
  canonicalBibleJson: string;
  draftSummary: string;
  editableSummary: string;
}): Promise<{ canonical: string; alias: string }> {
  const { canonicalBibleJson, draftSummary, editableSummary } = params;

  if (!OPENAI_API_KEY) {
    throw new Error("Missing environment variable OPENAI_API_KEY.");
  }

  const prompts = await fetchPrompts();

  // 構建 User Content for GPT
  const userContent = prompts.user
    .replace("{{CANONICAL_BIBLE_JSON}}", canonicalBibleJson)
    .replace("{{draftSummary}}", draftSummary)
    .replace("{{editableSummary}}", editableSummary);

  // 呼叫 GPT
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: prompts.system },
        { role: "user", content: userContent },
      ],
      max_tokens: 256,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Issuer Canon completion failed:", res.status, errText);
    throw new Error(`GPT completion failed with status ${res.status}`);
  }

  const data = await res.json();
  let jsonString = data?.choices?.[0]?.message?.content ?? "";

  // 解析 GPT 輸出
  try {
    jsonString = jsonString.replace(/```json\s*/g, "").replace(/\s*```/g, "");
    const resultPair = JSON.parse(jsonString) as {
      canonical: string;
      alias: string;
    };
    return resultPair;
  } catch (e) {
    console.error("Failed to parse GPT JSON output:", e, jsonString);
    throw new Error("Failed to parse GPT JSON output.");
  }
}