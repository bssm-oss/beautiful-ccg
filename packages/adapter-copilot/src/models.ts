export const COPILOT_MODELS = [
  "claude-sonnet-4.5",
  "claude-sonnet-4",
  "claude-opus-4.6",
  "gpt-5.3-codex",
  "gemini-3-pro",
  "claude-haiku-4.5",
] as const;

export type CopilotModel = (typeof COPILOT_MODELS)[number];

// Short aliases for convenience
export const MODEL_ALIASES: Record<string, string> = {
  opus: "claude-opus-4.6",
  sonnet: "claude-sonnet-4.5",
  codex: "gpt-5.3-codex",
  gemini: "gemini-3-pro",
  haiku: "claude-haiku-4.5",
};

export function resolveModel(input: string): string {
  return MODEL_ALIASES[input] ?? input;
}
