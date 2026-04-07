# Contributing to beautiful-ccg

## Prerequisites

- Node.js >= 20
- pnpm >= 9

## Setup

```bash
git clone https://github.com/justn-hyeok/beautiful-ccg.git
cd beautiful-ccg
pnpm install
pnpm build
```

## Development Workflow

```bash
pnpm build            # Build all packages (order resolved by pnpm)
pnpm test             # Run all tests
pnpm test -- --watch  # Watch mode
pnpm lint             # Type-check with tsc --noEmit
pnpm clean            # Remove all dist/ directories
```

To build or test a single package:

```bash
pnpm --filter @beautiful-ccg/core build
pnpm --filter @beautiful-ccg/core test
```

## Project Structure

```
packages/
  adapter-base/     # Shared types, interfaces, constants
  adapter-claude/   # Claude Code CLI adapter
  adapter-codex/    # OpenAI Codex CLI adapter
  adapter-copilot/  # GitHub Copilot CLI adapter
  adapter-gemini/   # Google Gemini CLI adapter
  core/             # Registry, router, classifier, pipeline, orchestrator
  mcp-server/       # MCP server (stdio transport)
  cli/              # bccg CLI binary
fixtures/           # Real CLI output samples for parser tests
```

## Conventions

- **TypeScript strict mode** — `strict: true`, ES2022 target, Node16 module resolution
- **ESM-first** — all packages use `"type": "module"`. Dual ESM+CJS output via tsup
- **Tests** — Vitest. Mock `execa` for adapter tests. Use real fixture files for parser tests
- **Subprocess management** — `execa` for all CLI invocations
- **Errors** — throw `AdapterError` (single adapter failures) or `PipelineError` (pipeline step failures)
- **Recursion guard** — always increment `BCCG_DEPTH` env when spawning subprocesses

## Adding a New Adapter

1. Create `packages/adapter-<name>/` with the same structure as existing adapters
2. Implement the `ModelAdapter` interface from `@beautiful-ccg/adapter-base`:

```typescript
import type { ModelAdapter, RunOptions, AdapterResult, AvailabilityStatus } from "@beautiful-ccg/adapter-base";

export class MyAdapter implements ModelAdapter {
  readonly name = "myadapter";
  readonly costTier = "medium";
  readonly multiModel = false;

  async run(prompt: string, options?: RunOptions): Promise<AdapterResult> {
    // Spawn the CLI, parse output, return result
  }

  async checkAvailability(): Promise<AvailabilityStatus> {
    // Check if the CLI binary exists and is authenticated
  }
}
```

3. Export the adapter class and parser from `src/index.ts`
4. Add a real CLI output fixture to `fixtures/<name>/`
5. Register the adapter in `packages/cli/src/bootstrap.ts`
6. Add tests (adapter + parser)

Key rules for adapters:
- Always increment `BCCG_DEPTH` in the subprocess environment
- Use `DEFAULT_TIMEOUTS` from `adapter-base` for the default timeout
- Set `reject: false` on `execa` calls and handle errors manually
- Parse JSON/JSONL output — all supported CLIs output structured JSON

## Test Fixtures

Place real CLI output samples in `fixtures/<adapter-name>/`. These are captured from actual CLI runs and used by parser tests to ensure output parsing stays correct as CLI output formats evolve.

## Commit Messages

Use conventional commit style:

```
feat: add cursor adapter
fix: handle empty stdout in codex parser
test: add fixture for copilot model-switch output
docs: update CLI reference in README
```
