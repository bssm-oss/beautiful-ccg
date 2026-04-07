# @beautiful-ccg/adapter-opencode

bccg adapter for [OpenCode CLI](https://github.com/sst/opencode). BYOK multi-model adapter supporting 75+ providers.

## Usage

```typescript
import { OpenCodeAdapter } from "@beautiful-ccg/adapter-opencode";

const adapter = new OpenCodeAdapter();

// Run with default model
const result = await adapter.run("explain this code");

// Run with a specific model
const result2 = await adapter.run("analyze complexity", { model: "opus" });

// List available models
const models = await adapter.getSupportedModels();
```

## Properties

| Property | Value |
|---|---|
| `name` | `"opencode"` |
| `costTier` | `"free"` (BYOK — uses your own API keys) |
| `multiModel` | `true` |

## CLI Command

```bash
opencode run <prompt> --format json [-m <provider/model>]
```

Output is NDJSON. The parser extracts content from `text` events and model info from `step_start` metadata.

## Model Aliases

| Alias | Model |
|---|---|
| `sonnet` | `anthropic/claude-sonnet-4-5` |
| `opus` | `anthropic/claude-opus-4-6` |
| `haiku` | `anthropic/claude-haiku-4-5` |
| `gpt` | `openai/gpt-5.4` |
| `gpt-mini` | `openai/gpt-5.4-mini` |
| `codex` | `openai/gpt-5.3-codex` |
| `gemini` | `google/gemini-3.1-pro` |
| `flash` | `google/gemini-3-flash` |
| `grok` | `xai/grok-3` |

Any model string not in the alias list is passed through as-is (e.g. `openai/o3-mini`).

## Exports

- `OpenCodeAdapter` — `ModelAdapter` implementation
- `parseOpenCodeOutput(stdout: string): OpenCodeParsed` — standalone parser
- `OpenCodeParsed` — `{ content, model, exitCode, error? }`
- `OPENCODE_MODELS` — supported model names
- `MODEL_ALIASES` — short alias → full model name mapping
- `resolveModel(input: string): string` — resolve aliases
- `OpenCodeModel` — union type of supported models
