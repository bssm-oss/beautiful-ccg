# @beautiful-ccg/adapter-copilot

bccg adapter for [GitHub Copilot CLI](https://docs.github.com/en/copilot/github-copilot-in-the-cli). This is the project's core adapter — the only CLI with `--model` flag for intra-CLI model routing.

## Usage

```typescript
import { CopilotAdapter } from "@beautiful-ccg/adapter-copilot";

const adapter = new CopilotAdapter();

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
| `name` | `"copilot"` |
| `costTier` | `"medium"` |
| `multiModel` | `true` |

## CLI Command

```bash
copilot -p <prompt> -s --output-format json --allow-all-tools [--model <model>]
```

Output is JSONL. The parser handles `session.tools_updated` (model detection), `assistant.message` (content + reasoning), `assistant.message_delta` (streaming fallback), and `result` (exit code + usage).

## Multi-Model Support

The Copilot CLI supports multiple backend models via `--model`. Short aliases are available:

| Alias | Full Model Name |
|---|---|
| `opus` | `claude-opus-4.6` |
| `sonnet` | `claude-sonnet-4.5` |
| `codex` | `gpt-5.3-codex` |
| `gemini` | `gemini-3-pro` |
| `haiku` | `claude-haiku-4.5` |

```typescript
import { resolveModel, COPILOT_MODELS, MODEL_ALIASES } from "@beautiful-ccg/adapter-copilot";

resolveModel("opus");   // "claude-opus-4.6"
resolveModel("sonnet"); // "claude-sonnet-4.5"
```

## Exports

- `CopilotAdapter` — `ModelAdapter` implementation
- `parseCopilotOutput(stdout: string): CopilotParsed` — standalone parser
- `CopilotParsed` — `{ content, model, exitCode, premiumRequests?, reasoningText? }`
- `COPILOT_MODELS` — supported model names (const array)
- `MODEL_ALIASES` — short alias → full model name mapping
- `resolveModel(input: string): string` — resolve aliases
- `CopilotModel` — union type of supported models
