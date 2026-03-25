// ─── Adapter Interface ───

export interface ModelAdapter {
  readonly name: string;
  readonly costTier: CostTier;
  readonly multiModel: boolean;

  run(prompt: string, options?: RunOptions): Promise<AdapterResult>;
  checkAvailability(): Promise<AvailabilityStatus>;
  getSupportedModels?(): Promise<string[]>;
}

export type CostTier = "free" | "low" | "medium" | "high";

export interface RunOptions {
  timeout?: number;
  model?: string;
  cwd?: string;
  signal?: AbortSignal;
  env?: Record<string, string>;
  /** When true, grant the spawned CLI unrestricted autonomous execution (e.g. --full-auto, --allow-all-tools). Defaults to false. */
  allowAutonomous?: boolean;
}

export interface AdapterResult {
  output: string;
  model: string;
  adapter: string;
  latency: number;
  exitCode: number;
  raw?: string;
}

export interface AvailabilityStatus {
  installed: boolean;
  authenticated: boolean;
  version: string | null;
  supportedModels?: string[];
  jsonOutput: boolean;
  multiModel: boolean;
}

// ─── Router Types ───

export type Strategy = "cheap-first" | "quality-first" | "balanced" | "parallel";
export type TaskType = "reasoning" | "coding" | "summarize" | "general";

export interface RoutingPlan {
  steps: RoutingStep[];
  strategy: Strategy;
}

export interface RoutingStep {
  adapter: string;
  model?: string;
  promptSuffix?: string;
  fallback?: string;
}

// ─── Pipeline Types ───

export interface PipelineResult {
  steps: StepResult[];
  finalOutput: string;
  totalLatency: number;
}

export interface StepResult {
  step: number;
  adapter: string;
  model: string;
  output: string;
  status: "success" | "error";
  error?: string;
  latency: number;
}

// ─── Config Types ───

export interface BccgConfig {
  version: number;
  defaults: { strategy: Strategy; timeout: number };
  adapters: Record<string, AdapterConfig>;
  routing?: { rules: RoutingRule[] };
  pipelines?: Record<string, PipelineConfig>;
}

export interface AdapterConfig {
  enabled: boolean;
  binary: string;
  headless: string[];
  costTier: CostTier;
  capabilities: string[];
  model?: string;
  multiModel?: boolean;
  models?: string[];
  dailyLimit?: number;
}

export interface RoutingRule {
  condition: { complexity?: string; type?: TaskType };
  target: string;
  fallback?: string;
}

export interface PipelineConfig {
  steps: { adapter: string; action: string }[];
  execution: "sequential" | "parallel";
}

// ─── Registry ───

export interface AdapterRegistry {
  register(adapter: ModelAdapter): void;
  get(name: string): ModelAdapter | undefined;
  getAvailable(): Promise<ModelAdapter[]>;
  getAll(): ModelAdapter[];
}

// ─── Errors ───

export class AdapterError extends Error {
  constructor(
    message: string,
    public readonly adapter: string,
    public readonly exitCode?: number,
    public readonly stderr?: string,
  ) {
    super(message);
    this.name = "AdapterError";
  }
}

export class PipelineError extends Error {
  constructor(
    message: string,
    public readonly step: number,
    public readonly partialResults: StepResult[],
  ) {
    super(message);
    this.name = "PipelineError";
  }
}

// ─── Constants ───

export const BCCG_DEPTH_ENV = "BCCG_DEPTH";
export const BCCG_HOST_CLI_ENV = "BCCG_HOST_CLI";
export const MAX_PIPELINE_STEPS = 10;
export const MAX_OUTPUT_SIZE = 100 * 1024; // 100KB per adapter
export const MAX_PROMPT_SIZE = 100 * 1024; // 100KB max prompt size

export const DEFAULT_TIMEOUTS: Record<string, number> = {
  claude: 180_000,
  codex: 120_000,
  gemini: 30_000,
  copilot: 60_000,
  cursor: 120_000,
};

// ─── JSONL Output Schemas (from Step 0 validation) ───

/** Copilot CLI JSONL event types */
export interface CopilotMessageEvent {
  type: "assistant.message";
  data: {
    messageId: string;
    content: string;
    toolRequests: unknown[];
    reasoningText?: string;
    outputTokens?: number;
  };
}

export interface CopilotToolsUpdatedEvent {
  type: "session.tools_updated";
  data: { model: string };
}

export interface CopilotResultEvent {
  type: "result";
  exitCode: number;
  sessionId: string;
  usage: {
    premiumRequests: number;
    totalApiDurationMs: number;
    sessionDurationMs: number;
  };
}

/** Codex CLI NDJSON event types */
export interface CodexItemCompletedEvent {
  type: "item.completed";
  item: { id: string; type: string; text: string };
}

export interface CodexTurnCompletedEvent {
  type: "turn.completed";
  usage: {
    input_tokens: number;
    cached_input_tokens: number;
    output_tokens: number;
  };
}

/** Gemini CLI JSON output (single object, not NDJSON) */
export interface GeminiOutput {
  session_id: string;
  response: string;
  stats: {
    models: Record<string, { api: { totalRequests: number; totalLatencyMs: number } }>;
  };
}
