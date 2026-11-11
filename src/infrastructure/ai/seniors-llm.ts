export type LlmChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type SeniorsLlmConfig = {
  provider: "openai" | "gemini" | "ollama";
  model: string;
  baseUrl?: string;
  apiKey?: string;
};

export class SeniorsLlmError extends Error {
  readonly retryable: boolean;
  readonly statusCode: number;

  constructor(message: string, options?: { retryable?: boolean; statusCode?: number }) {
    super(message);
    this.name = "SeniorsLlmError";
    this.retryable = options?.retryable ?? false;
    this.statusCode = options?.statusCode ?? 500;
  }
}

function env(name: string) {
  return process.env[name]?.trim() || "";
}

const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";
const GEMINI_FALLBACK_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
];
const RETIRED_GEMINI_MODELS = new Set([
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash-lite-001",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
]);
const GEMINI_RETRY_ATTEMPTS = 3;
const GEMINI_RETRY_BASE_MS = 900;

function resolveGeminiModel(raw: string) {
  const model = raw.trim() || DEFAULT_GEMINI_MODEL;
  return RETIRED_GEMINI_MODELS.has(model) ? DEFAULT_GEMINI_MODEL : model;
}

function geminiModelsToTry(preferred: string) {
  const primary = resolveGeminiModel(preferred);
  const models = [primary];
  for (const model of GEMINI_FALLBACK_MODELS) {
    if (!models.includes(model)) models.push(model);
  }
  const extra = env("SENIORS_AI_GEMINI_FALLBACK_MODELS")
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);
  for (const model of extra) {
    if (!models.includes(model)) models.push(model);
  }
  return models;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableGeminiFailure(status: number, message: string) {
  const lower = message.toLowerCase();
  return (
    status === 408 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    lower.includes("high demand") ||
    lower.includes("overloaded") ||
    lower.includes("rate limit") ||
    lower.includes("resource exhausted") ||
    lower.includes("try again later") ||
    lower.includes("temporarily unavailable")
  );
}

function overloadUserMessage() {
  return "The AI service is busy right now. Please wait a moment and try again.";
}

function ollamaBaseUrl() {
  const explicit = env("OLLAMA_BASE_URL") || env("OLLAMA_HOST") || env("SENIORS_AI_BASE_URL");
  if (!explicit) return "http://127.0.0.1:11434/v1";
  const cleaned = explicit.replace(/\/$/, "");
  if (cleaned.endsWith("/v1")) return cleaned;
  if (cleaned.endsWith("/api")) return `${cleaned.slice(0, -4)}/v1`;
  return `${cleaned}/v1`;
}

export function getSeniorsLlmConfig(): SeniorsLlmConfig | null {
  const provider = env("SENIORS_AI_PROVIDER").toLowerCase();
  const openaiKey = env("OPENAI_API_KEY") || env("SENIORS_AI_API_KEY");
  const geminiKey = env("GEMINI_API_KEY") || env("GOOGLE_AI_API_KEY");
  const ollamaHint =
    provider === "ollama" ||
    Boolean(env("OLLAMA_BASE_URL") || env("OLLAMA_HOST") || env("OLLAMA_MODEL")) ||
    /11434|ollama/i.test(env("SENIORS_AI_BASE_URL"));

  if (geminiKey && provider !== "openai" && provider !== "ollama") {
    return {
      provider: "gemini",
      model: resolveGeminiModel(env("SENIORS_AI_MODEL")),
      apiKey: geminiKey,
    };
  }
  if (provider === "openai" && openaiKey) {
    return {
      provider: "openai",
      model: env("SENIORS_AI_MODEL") || "gpt-4o-mini",
      apiKey: openaiKey,
      baseUrl: env("SENIORS_AI_BASE_URL") || "https://api.openai.com/v1",
    };
  }
  if (ollamaHint || provider === "ollama") {
    return {
      provider: "ollama",
      model: env("OLLAMA_MODEL") || env("SENIORS_AI_MODEL") || "llama3.2",
      baseUrl: ollamaBaseUrl(),
      apiKey: env("OLLAMA_API_KEY") || openaiKey || "ollama",
    };
  }
  if (openaiKey) {
    return {
      provider: "openai",
      model: env("SENIORS_AI_MODEL") || "gpt-4o-mini",
      apiKey: openaiKey,
      baseUrl: env("SENIORS_AI_BASE_URL") || "https://api.openai.com/v1",
    };
  }
  if (geminiKey) {
    return { provider: "gemini", model: resolveGeminiModel(env("SENIORS_AI_MODEL")), apiKey: geminiKey };
  }
  return null;
}

export function isSeniorsLlmConfigured() {
  return getSeniorsLlmConfig() != null;
}

export async function completeSeniorsChat(messages: LlmChatMessage[]): Promise<string> {
  const config = getSeniorsLlmConfig();
  if (!config) {
    throw new Error("Seniors AI is not configured. Use Ollama, OPENAI_API_KEY, or GEMINI_API_KEY.");
  }
  if (config.provider === "gemini") {
    return completeGemini(messages, config);
  }
  return completeOpenAiCompatible(messages, config);
}

async function completeOpenAiCompatible(
  messages: LlmChatMessage[],
  config: SeniorsLlmConfig,
): Promise<string> {
  const base = (config.baseUrl || "https://api.openai.com/v1").replace(/\/$/, "");
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey || "ollama"}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.25,
      messages,
    }),
  });
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(
      json.error?.message ||
        `${config.provider === "ollama" ? "Ollama" : "OpenAI"} request failed (${res.status})`,
    );
  }
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("AI returned an empty answer");
  return text;
}

async function completeGeminiOnce(
  messages: LlmChatMessage[],
  config: SeniorsLlmConfig,
  model: string,
): Promise<string> {
  const system = messages.find((m) => m.role === "system")?.content ?? "";
  const rest = messages.filter((m) => m.role !== "system");
  const contents = rest.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(config.apiKey ?? "")}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        contents,
        generationConfig: { temperature: 0.25 },
      }),
    },
  );
  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    error?: { message?: string };
  };
  if (!res.ok) {
    const message = json.error?.message || `Gemini request failed (${res.status})`;
    throw new SeniorsLlmError(message, {
      retryable: isRetryableGeminiFailure(res.status, message),
      statusCode: res.status,
    });
  }
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
  if (!text) {
    throw new SeniorsLlmError("AI returned an empty answer", { retryable: true, statusCode: 502 });
  }
  return text;
}

async function completeGemini(messages: LlmChatMessage[], config: SeniorsLlmConfig): Promise<string> {
  const models = geminiModelsToTry(config.model);
  let lastRetryable: SeniorsLlmError | null = null;

  for (const model of models) {
    for (let attempt = 0; attempt < GEMINI_RETRY_ATTEMPTS; attempt++) {
      try {
        return await completeGeminiOnce(messages, config, model);
      } catch (error) {
        if (!(error instanceof SeniorsLlmError)) throw error;
        if (!error.retryable) throw error;
        lastRetryable = error;
        const delay = Math.min(
          GEMINI_RETRY_BASE_MS * 2 ** attempt + Math.floor(Math.random() * 400),
          8000,
        );
        await sleep(delay);
      }
    }
  }

  if (lastRetryable?.retryable) {
    throw new SeniorsLlmError(overloadUserMessage(), {
      retryable: true,
      statusCode: lastRetryable.statusCode === 429 ? 429 : 503,
    });
  }
  throw lastRetryable ?? new SeniorsLlmError("Gemini request failed");
}
