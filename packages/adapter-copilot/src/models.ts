export interface CopilotModelInfo {
  name: string;
  multiplier: number;
}

// Source: `copilot` interactive /model list (April 2026)
export const COPILOT_MODEL_INFO: CopilotModelInfo[] = [
  // Anthropic Claude
  { name: "claude-sonnet-4.5", multiplier: 1 },
  { name: "claude-sonnet-4", multiplier: 1 },
  { name: "claude-sonnet-4.6", multiplier: 1 },
  { name: "claude-opus-4.5", multiplier: 3 },
  { name: "claude-opus-4.6", multiplier: 3 },
  { name: "claude-opus-4.6-fast", multiplier: 30 },
  { name: "claude-haiku-4.5", multiplier: 0.33 },
  // OpenAI GPT
  { name: "gpt-5.3-codex", multiplier: 1 },
  { name: "gpt-5.2-codex", multiplier: 1 },
  { name: "gpt-5.2", multiplier: 1 },
  { name: "gpt-5.1", multiplier: 1 },
  { name: "gpt-5.4", multiplier: 1 },
  { name: "gpt-5.4-mini", multiplier: 0.33 },
  { name: "gpt-5-mini", multiplier: 0 },
  { name: "gpt-4.1", multiplier: 0 },
  // Google Gemini
  { name: "gemini-3.1-pro", multiplier: 1 },
  { name: "gemini-3-flash", multiplier: 0.33 },
  // xAI
  { name: "grok-code-fast-1", multiplier: 0.33 },
];

export const COPILOT_MODELS = COPILOT_MODEL_INFO.map(m => m.name);

export type CopilotModel = (typeof COPILOT_MODEL_INFO)[number]["name"];

// Short aliases for convenience
export const MODEL_ALIASES: Record<string, string> = {
  opus: "claude-opus-4.6",
  "opus-fast": "claude-opus-4.6-fast",
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

export function getModelMultiplier(model: string): number | undefined {
  return COPILOT_MODEL_INFO.find(m => m.name === model)?.multiplier;
}
