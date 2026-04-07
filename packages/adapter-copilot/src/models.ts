export const COPILOT_MODELS = [
  // Anthropic Claude
  "claude-sonnet-4.5",
  "claude-sonnet-4.6",
  "claude-opus-4.6",
  "claude-opus-4-6-fast",
  "claude-haiku-4.5",
  // OpenAI GPT
  "gpt-5.3-codex",
  "gpt-5.4",
  "gpt-5.4-mini",
  "gpt-5-mini",
  "gpt-4.1",
  // Google Gemini
  "gemini-3.1-pro",
  "gemini-3-flash",
  // xAI
  "grok-code-fast-1",
] as const;

export type CopilotModel = (typeof COPILOT_MODELS)[number];

// Short aliases for convenience
export const MODEL_ALIASES: Record<string, string> = {
  opus: "claude-opus-4.6",
  "opus-fast": "claude-opus-4-6-fast",
  sonnet: "claude-sonnet-4.5",
  haiku: "claude-haiku-4.5",
  codex: "gpt-5.3-codex",
  gpt: "gpt-5.4",
  "gpt-mini": "gpt-5.4-mini",
  gemini: "gemini-3.1-pro",
  flash: "gemini-3-flash",
  grok: "grok-code-fast-1",
};

export function resolveModel(input: string): string {
  return MODEL_ALIASES[input] ?? input;
}
