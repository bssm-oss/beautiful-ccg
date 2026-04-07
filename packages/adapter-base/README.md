# @beautiful-ccg/adapter-base

Shared types, interfaces, error classes, and constants for bccg adapters. Zero runtime dependencies.

## Install

```bash
pnpm add @beautiful-ccg/adapter-base
```

## Interfaces

### `ModelAdapter`

The core contract every adapter must implement.

```typescript
interface ModelAdapter {
  readonly name: string;
  readonly costTier: CostTier;        // "free" | "low" | "medium" | "high"
  readonly multiModel: boolean;

  run(prompt: string, options?: RunOptions): Promise<AdapterResult>;
  checkAvailability(): Promise<AvailabilityStatus>;
  getSupportedModels?(): Promise<string[]>;
}
```

### `RunOptions`

```typescript
interface RunOptions {
  timeout?: number;
  model?: string;
  cwd?: string;
  signal?: AbortSignal;
  env?: Record<string, string>;
}
```

### `AdapterResult`

```typescript
interface AdapterResult {
  output: string;
  model: string;
  adapter: string;
  latency: number;
  exitCode: number;
  raw?: string;
}
```

## Error Classes

- **`AdapterError`** — single adapter failure (includes `adapter`, `exitCode?`, `stderr?`)
- **`PipelineError`** — pipeline step failure (includes `step` index, `partialResults`)

## Constants

| Constant | Value |
|---|---|
| `BCCG_DEPTH_ENV` | `"BCCG_DEPTH"` |
| `BCCG_HOST_CLI_ENV` | `"BCCG_HOST_CLI"` |
| `MAX_PIPELINE_STEPS` | `10` |
| `MAX_OUTPUT_SIZE` | `102400` (100KB) |

### Default Timeouts

| Adapter | Timeout |
|---|---|
| `claude` | 180s |
| `codex` | 120s |
| `copilot` | 60s |
| `gemini` | 30s |
| `cursor` | 120s |

## CLI Output Schemas

Type definitions for parsing each CLI's JSON output:

- **Copilot** — `CopilotMessageEvent`, `CopilotToolsUpdatedEvent`, `CopilotResultEvent` (JSONL)
- **Codex** — `CodexItemCompletedEvent`, `CodexTurnCompletedEvent` (NDJSON)
- **Gemini** — `GeminiOutput` (single JSON object)
