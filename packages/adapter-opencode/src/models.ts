// OpenCode uses provider/model format (e.g. "anthropic/claude-sonnet-4-5")
export const OPENCODE_MODELS = [
  // Anthropic
  "anthropic/claude-sonnet-4-5",
  "anthropic/claude-sonnet-4-6",
  "anthropic/claude-opus-4-6",
  "anthropic/claude-haiku-4-5",
  // OpenAI
  "openai/gpt-5.4",
  "openai/gpt-5.4-mini",
  "openai/gpt-5.3-codex",
  "openai/gpt-4.1",
  // Google
  "google/gemini-3.1-pro",
  "google/gemini-3-flash",
  // xAI
  "xai/grok-3",
] as const;

export type OpenCodeModel = (typeof OPENCODE_MODELS)[number];

export const MODEL_ALIASES: Record<string, string> = {
  sonnet: "anthropic/claude-sonnet-4-5",
  opus: "anthropic/claude-opus-4-6",
  haiku: "anthropic/claude-haiku-4-5",
  gpt: "openai/gpt-5.4",
  "gpt-mini": "openai/gpt-5.4-mini",
  codex: "openai/gpt-5.3-codex",
  gemini: "google/gemini-3.1-pro",
  flash: "google/gemini-3-flash",
  grok: "xai/grok-3",
};

export function resolveModel(input: string): string {
  return MODEL_ALIASES[input] ?? input;
}
