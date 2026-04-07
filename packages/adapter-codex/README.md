# @bccg/adapter-codex

bccg adapter for [OpenAI Codex CLI](https://github.com/openai/codex).

## Usage

```typescript
import { CodexAdapter } from "@bccg/adapter-codex";

const adapter = new CodexAdapter();
const result = await adapter.run("implement a retry function");
console.log(result.output);
```

## Properties

| Property | Value |
|---|---|
| `name` | `"codex"` |
| `costTier` | `"medium"` |
| `multiModel` | `false` |

## CLI Command

```bash
codex exec <prompt> --json --full-auto
```

Output is NDJSON. The parser collects text from `item.completed` events where `item.type === "agent_message"`, and extracts token counts from `turn.completed` events.

## Exports

- `CodexAdapter` — `ModelAdapter` implementation
- `parseCodexOutput(stdout: string): CodexParsed` — standalone parser
- `CodexParsed` — `{ content, model, exitCode, inputTokens?, outputTokens? }`
