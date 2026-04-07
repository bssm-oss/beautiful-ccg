# @bccg/adapter-gemini

bccg adapter for [Google Gemini CLI](https://github.com/google-gemini/gemini-cli).

## Usage

```typescript
import { GeminiAdapter } from "@bccg/adapter-gemini";

const adapter = new GeminiAdapter();
const result = await adapter.run("summarize this document");
console.log(result.output);
```

## Properties

| Property | Value |
|---|---|
| `name` | `"gemini"` |
| `costTier` | `"free"` |
| `multiModel` | `false` |

## CLI Command

```bash
gemini -p <prompt> --output-format json
```

Unlike other adapters, Gemini outputs a **single JSON object** (not JSONL/NDJSON). The parser extracts:
- `response` — the generated text
- `session_id` — session identifier
- Model name from `stats.models` (entry with `roles.main`, or first available)

## Exports

- `GeminiAdapter` — `ModelAdapter` implementation
- `parseGeminiOutput(stdout: string): GeminiParsed` — standalone parser
- `GeminiParsed` — `{ content: string; model: string; sessionId: string }`
