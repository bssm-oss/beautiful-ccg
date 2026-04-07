# @bccg/adapter-claude

bccg adapter for [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code).

## Usage

```typescript
import { ClaudeAdapter } from "@bccg/adapter-claude";

const adapter = new ClaudeAdapter();

// Check availability
const status = await adapter.checkAvailability();

// Run a prompt
const result = await adapter.run("explain this error", {
  timeout: 60_000,
  cwd: "/path/to/project",
});
console.log(result.output);
```

## Properties

| Property | Value |
|---|---|
| `name` | `"claude"` |
| `costTier` | `"high"` |
| `multiModel` | `false` |

## CLI Command

```bash
claude -p <prompt> --output-format json
```

Output is JSONL. The parser extracts content from `assistant.message` events, model from `system` events, and exit code from `result` events.

## Exports

- `ClaudeAdapter` — `ModelAdapter` implementation
- `parseClaudeOutput(stdout: string): ClaudeParsed` — standalone parser
- `ClaudeParsed` — `{ content: string; model: string; exitCode: number }`

## Recursion Safety

When running inside a Claude Code session (detected via `CLAUDECODE` env var), the adapter reports `authenticated: false` to prevent the host from invoking itself through bccg.
