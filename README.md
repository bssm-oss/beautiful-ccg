# beautiful-ccg (bccg)

Run Claude, ChatGPT, and Gemini together — with whatever CLI you already have.

bccg is an MCP server + CLI that orchestrates multiple AI CLIs (Claude Code, GitHub Copilot, OpenAI Codex, Google Gemini) into a unified pipeline. Route prompts to the best CLI automatically, chain them together, or use them all as one MCP tool from any host.

## Features

- **Auto-routing** — `cheap-first`, `quality-first`, `balanced` strategies pick the right CLI for each prompt
- **Multi-model via Copilot** — Access Claude, GPT, Gemini models through a single Copilot CLI with `--model`
- **Pipeline DSL** — Chain CLIs: `gemini:summarize -> codex:analyze -> claude:judge`
- **MCP server** — Expose all capabilities as MCP tools (`bccg_run`, `bccg_pipeline`, `bccg_status`)
- **Recursion guard** — `BCCG_DEPTH` env prevents infinite loops when a host CLI invokes bccg which spawns the same CLI
- **Zero config** — `bccg init` auto-detects installed CLIs and registers the MCP server

## Requirements

- Node.js >= 20
- At least one AI CLI installed:
  - [GitHub Copilot CLI](https://docs.github.com/en/copilot/github-copilot-in-the-cli) (`copilot`)
  - [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (`claude`)
  - [OpenAI Codex](https://github.com/openai/codex) (`codex`)
  - [Google Gemini CLI](https://github.com/google-gemini/gemini-cli) (`gemini`)

## Install

```bash
# npm
npm install -g @beautiful-ccg/cli

# or from source
git clone https://github.com/bssm-oss/beautiful-ccg.git
cd beautiful-ccg
pnpm install && pnpm build
cd packages/cli && pnpm link --global
```

## Quick Start

```bash
# 1. Detect installed CLIs and set up MCP
bccg init

# 2. Check what's available
bccg status

# 3. Run a prompt (auto-routed)
bccg run "explain this error: ENOENT"

# 4. Pick a specific CLI
bccg run --adapter claude "review this code"

# 5. Use Copilot's multi-model routing
bccg run --adapter copilot --model opus "analyze complexity"
```

## CLI Reference

### `bccg run <prompt>`

Run a prompt through AI CLIs.

| Option | Description | Default |
|---|---|---|
| `-s, --strategy <name>` | Routing strategy | `balanced` |
| `-a, --adapter <name>` | Use a specific adapter (`copilot`, `claude`, `codex`, `gemini`) | auto |
| `-m, --model <model>` | Model for intra-CLI routing (e.g. `opus`, `sonnet`, `codex`) | adapter default |
| `-t, --timeout <ms>` | Timeout in milliseconds | per-adapter default |

**Strategies:**

| Strategy | Behavior |
|---|---|
| `cheap-first` | Route to the lowest-cost available CLI |
| `quality-first` | Route to the highest-cost (best quality) CLI |
| `balanced` | Classify the prompt, pick the best tier for the task type |
| `parallel` | Run on all available CLIs (sequential in v0.1) |

Output goes to stdout, metadata (`adapter=`, `model=`, `latency=`) to stderr.

### `bccg status`

Show installed CLIs, versions, and multi-model support.

```
$ bccg status
  ✅ copilot v1.0.5 — multi-model
     Models: claude-sonnet-4.5, claude-opus-4.6, gpt-5.3-codex, gemini-3-pro, ...
  ✅ claude v1.0.16
  ❌ codex — not installed
  ✅ gemini v0.3.1
```

### `bccg init`

Auto-detect CLIs and configure bccg.

1. Scans for `copilot`, `claude`, `codex`, `gemini`
2. Generates `.ccg/config.yaml` with detected adapters
3. Registers bccg as an MCP server in each CLI's config

### `bccg serve`

Start the MCP server (stdio transport). Typically called by host CLIs, not directly.

## MCP Tools

When running as an MCP server, bccg exposes three tools:

### `bccg_run`

Run a prompt with auto-routing or a specific adapter.

```json
{
  "prompt": "explain this function",
  "strategy": "balanced",
  "adapter": "copilot",
  "model": "opus"
}
```

### `bccg_pipeline`

Execute a multi-step pipeline using the DSL.

```json
{
  "steps": "gemini:summarize -> codex:implement -> claude:review",
  "prompt": "add error handling to the auth module"
}
```

### `bccg_status`

Check available adapters and their status. No parameters.

## Pipeline DSL

Chain multiple CLIs with `->` (or `→`):

```
adapter:action -> adapter:action -> adapter:action
```

Each step runs sequentially. The output of each step feeds into the next as context. The final step receives a synthesis prompt.

**Examples:**

```bash
# Summarize with Gemini, then review with Claude
gemini:summarize -> claude:review

# Use Copilot with a specific model for analysis, then Codex for implementation
copilot:opus:analyze -> codex:implement

# Three-step pipeline
gemini:summarize -> codex:refactor -> claude:judge
```

**Format:**
- `adapter:action` — run on the named adapter with the action as prompt prefix
- `adapter:model:action` — specify a model (for multi-model adapters like Copilot)
- `action` — auto-route the step

Max 10 steps per pipeline.

## Architecture

```
┌──────────────────────────────────────────────────┐
│  Host CLI (Claude / Copilot / Gemini)            │
│  ┌────────────────────────────────────────────┐  │
│  │  MCP Server (stdio)                        │  │
│  │  bccg_run · bccg_pipeline · bccg_status    │  │
│  └────────────────┬───────────────────────────┘  │
│                   │                              │
│  ┌────────────────▼───────────────────────────┐  │
│  │  Core                                      │  │
│  │  Orchestrator → Router → Classifier        │  │
│  │  Pipeline Engine · Steps Parser · Registry │  │
│  └────────────────┬───────────────────────────┘  │
│                   │                              │
│  ┌────────┬───────┴───────┬───────────┐         │
│  │Copilot │ Claude        │ Codex     │ Gemini  │
│  │Adapter │ Adapter       │ Adapter   │ Adapter │
│  └───┬────┘───┬───────────┘───┬───────┘───┬──── │
│      │        │               │           │      │
└──────┼────────┼───────────────┼───────────┼──────┘
       ▼        ▼               ▼           ▼
   copilot    claude          codex       gemini
    CLI        CLI             CLI         CLI
```

## Monorepo Structure

```
packages/
  adapter-base/     # Types, interfaces, constants (zero deps)
  adapter-copilot/  # Copilot CLI adapter (multi-model, --model routing)
  adapter-claude/   # Claude Code CLI adapter
  adapter-codex/    # OpenAI Codex CLI adapter (NDJSON)
  adapter-gemini/   # Gemini CLI adapter (single JSON)
  core/             # Registry, router, classifier, pipeline, orchestrator
  mcp-server/       # MCP server (@modelcontextprotocol/sdk, stdio)
  cli/              # bccg CLI binary (commander)
```

Dependency graph: `adapter-base → adapters → core → mcp-server + cli`

## Copilot Multi-Model

Copilot CLI is the only adapter with `--model` support, enabling intra-CLI model routing. Short aliases are provided:

| Alias | Model |
|---|---|
| `opus` | `claude-opus-4.6` |
| `sonnet` | `claude-sonnet-4.5` |
| `codex` | `gpt-5.3-codex` |
| `gemini` | `gemini-3-pro` |
| `haiku` | `claude-haiku-4.5` |

```bash
bccg run --adapter copilot --model opus "complex reasoning task"
bccg run --adapter copilot --model codex "implement this feature"
```

## Development

```bash
pnpm install          # Install dependencies
pnpm build            # Build all packages
pnpm test             # Run all tests
pnpm test -- --watch  # Watch mode
pnpm lint             # Type-check (tsc --noEmit)
pnpm clean            # Remove all dist/ directories
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines.

## License

[MIT](./LICENSE)
