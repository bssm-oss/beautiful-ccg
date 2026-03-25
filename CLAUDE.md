# beautiful-bccg (bbccg)

MCP server that orchestrates multiple AI CLIs (Claude, ChatGPT, Gemini) into a unified CCG pipeline.

## Architecture

pnpm monorepo with 8 packages:

```
packages/
  adapter-base/     # Types, interfaces, constants (zero deps)
  adapter-copilot/  # ★ Core adapter — Copilot CLI with --model intra-CLI routing
  adapter-claude/   # Claude Code CLI adapter
  adapter-codex/    # Codex CLI adapter (NDJSON)
  adapter-gemini/   # Gemini CLI adapter (single JSON object)
  core/             # Registry, router, classifier, pipeline engine, orchestrator
  mcp-server/       # MCP server (stdio, @modelcontextprotocol/sdk)
  cli/              # `bccg` CLI binary (run, status, init, serve)
```

Dependency graph: `adapter-base → adapters → core → mcp-server + cli`

## Key Design Decisions

- **Copilot-first**: Copilot CLI is the project's core — it's the only CLI with `--model` flag for intra-CLI routing. All 4 PRD scenarios depend on it.
- **All CLIs output JSON**: PRD assumed Copilot needed plain text parsing, but validation proved `--output-format json` works (JSONL). No plain text parsing needed.
- **Registry pattern**: Core depends only on adapter-base types. Adapters register dynamically. New adapters don't require core changes.
- **BCCG_DEPTH env guard**: Prevents recursive invocation when host CLI spawns bbccg which spawns the same CLI.

## Build & Test

```bash
pnpm install
pnpm -r build        # Build all packages
pnpm test            # Run all tests
pnpm test -- --watch # Watch mode
```

## CLI Usage

```bash
bccg run "prompt"                              # Auto-route
bccg run --adapter copilot --model opus "prompt"  # Specific adapter + model
bccg run --strategy cheap-first "prompt"       # Strategy-based routing
bccg status                                    # Show adapter availability
bccg init                                      # Auto-detect CLIs + register MCP
bccg serve                                     # Start MCP server (stdio)
```

## Conventions

- TypeScript strict mode, ES2022 target, Node16 module resolution
- ESM-first (`type: "module"`), dual ESM+CJS output via tsup
- Tests: Vitest, fixtures in `/fixtures/` with real CLI output samples
- Adapters use `execa` for subprocess management
- All adapters increment `BCCG_DEPTH` env on subprocess spawn
