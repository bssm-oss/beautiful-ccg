# beautiful-ccg (bccg)

[![CI](https://github.com/justn-hyeok/beautiful-ccg/actions/workflows/ci.yml/badge.svg)](https://github.com/justn-hyeok/beautiful-ccg/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@beautiful-ccg/cli)](https://www.npmjs.com/package/@beautiful-ccg/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

**English** | [한국어](./README.ko.md)

Run Claude, ChatGPT, and Gemini together — with whatever CLI you already have.

bccg is an MCP server + CLI that orchestrates multiple AI CLIs (Claude Code, GitHub Copilot, OpenAI Codex, Google Gemini) into a unified pipeline. Route prompts to the best CLI automatically, chain them together, or use them all as one MCP tool from any host.

<p align="center">
  <img src=".github/demo.png" alt="bccg demo" width="780">
</p>

## Features

- **Auto-routing** — `cheap-first`, `quality-first`, `balanced` strategies pick the right CLI for each prompt
- **Parallel execution** — `parallel` strategy runs all adapters concurrently and combines results
- **Multi-model via Copilot** — Access 18 models (Claude, GPT, Gemini, Grok) through a single Copilot CLI
- **Pipeline DSL** — Chain CLIs: `gemini:summarize -> codex:implement -> claude:review`
- **MCP server** — Expose all capabilities as MCP tools (`bccg_run`, `bccg_pipeline`, `bccg_status`)
- **Config-driven routing** — `.ccg/config.yaml` with custom routing rules and adapter settings
- **Recursion guard** — `BCCG_DEPTH` env prevents infinite loops when a host CLI invokes bccg
- **Zero config** — `bccg init` auto-detects installed CLIs, generates config, and registers MCP

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
git clone https://github.com/justn-hyeok/beautiful-ccg.git
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

# 6. Chain CLIs in a pipeline
bccg pipeline "gemini:summarize -> claude:review" -p "explain MCP protocol"

# 7. Run all CLIs in parallel
bccg run --strategy parallel "explain recursion in one sentence"
```

## CLI Reference

### `bccg run [prompt]`

Run a prompt through AI CLIs.

| Option | Description | Default |
|---|---|---|
| `-s, --strategy <name>` | Routing strategy | `balanced` |
| `-a, --adapter <name>` | Use a specific adapter (`copilot`, `claude`, `codex`, `gemini`) | auto |
| `-m, --model <model>` | Model for intra-CLI routing (e.g. `opus`, `sonnet`, `grok`) | adapter default |
| `-t, --timeout <ms>` | Timeout in milliseconds | per-adapter default |
| `--json` | Output result as JSON | |
| `--verbose` | Show routing decisions | |

Supports stdin: `echo "prompt" | bccg run -`

**Strategies:**

| Strategy | Behavior |
|---|---|
| `cheap-first` | Route to the lowest-cost available CLI |
| `quality-first` | Route to the highest-cost (best quality) CLI |
| `balanced` | Classify the prompt, pick the best tier for the task type |
| `parallel` | Run all available CLIs concurrently, combine results |

Output goes to stdout, metadata to stderr.

### `bccg pipeline <steps>`

Execute a multi-step CCG pipeline.

```bash
bccg pipeline "gemini:summarize -> codex:implement -> claude:review" -p "add retry logic"
```

| Option | Description |
|---|---|
| `-p, --prompt <prompt>` | Base prompt for the pipeline |
| `-t, --timeout <ms>` | Timeout in milliseconds |
| `--json` | Output result as JSON |

### `bccg status`

Show installed CLIs, versions, and supported models.

```
$ bccg status
  ✅ copilot (v1.0.19) [multi-model]
     models: claude-sonnet-4.5, claude-opus-4.6, gpt-5.3-codex, gemini-3.1-pro, ...
  ✅ claude (v2.1.92)
  ✅ codex (v0.107.0)
  ✅ gemini (v0.31.0)
```

### `bccg doctor`

Check bccg health: adapters, config, and MCP registration.

```
$ bccg doctor
📋 Config
  ✅ .ccg/config.yaml
📄 .mcp.json
  ✅ .mcp.json
🔌 Adapters
  ✅ copilot (1.0.19) [multi-model]
  ✅ claude (2.1.92)
🔗 MCP Registration
  ✅ claude → ~/.claude.json
⚠️  2 issue(s) found. Run 'bccg init' to fix most of them.
```

### `bccg init`

Auto-detect CLIs and configure bccg.

1. Scans for `copilot`, `claude`, `codex`, `gemini`
2. Generates `.ccg/config.yaml` with detected adapters
3. Creates `.mcp.json` for project-local MCP config
4. Registers bccg as an MCP server in each CLI's global config

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
bccg pipeline "gemini:summarize -> claude:review" -p "explain MCP"

# Use Copilot with a specific model, then Codex
bccg pipeline "copilot:opus:analyze -> codex:implement" -p "add caching"

# Three-step pipeline
bccg pipeline "gemini:summarize -> codex:refactor -> claude:judge" -p "optimize auth"
```

**Format:**
- `adapter:action` — run on the named adapter with the action as prompt prefix
- `adapter:model:action` — specify a model (for multi-model adapters like Copilot)
- `action` — auto-route the step

Max 10 steps per pipeline.

## Configuration

`bccg init` generates `.ccg/config.yaml`:

```yaml
version: 1
defaults:
  strategy: balanced
  timeout: 60000
adapters:
  copilot:
    enabled: true
    binary: copilot
    costTier: medium
    multiModel: true
  claude:
    enabled: true
    binary: claude
    costTier: high
  gemini:
    enabled: true
    binary: gemini
    costTier: free
routing:
  rules:
    - condition: { type: reasoning }
      target: claude
      fallback: copilot
    - condition: { type: summarize }
      target: gemini
```

Routing rules are checked before strategy-based routing. Set `enabled: false` to skip an adapter.

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

Copilot CLI supports 18 models via `--model`. Short aliases are provided:

| Alias | Model |
|---|---|
| `opus` | `claude-opus-4.6` |
| `opus-fast` | `claude-opus-4.6-fast` |
| `sonnet` | `claude-sonnet-4.5` |
| `haiku` | `claude-haiku-4.5` |
| `codex` | `gpt-5.3-codex` |
| `gpt` | `gpt-5.4` |
| `gpt-mini` | `gpt-5.4-mini` |
| `gemini` | `gemini-3.1-pro` |
| `flash` | `gemini-3-flash` |
| `grok` | `grok-code-fast-1` |

```bash
bccg run -a copilot -m opus "complex reasoning task"
bccg run -a copilot -m grok "quick code review"
bccg run -a copilot -m flash "summarize this"
```

Any model string not in the alias list is passed through as-is.

## Development

```bash
pnpm install          # Install dependencies
pnpm build            # Build all packages
pnpm test             # Run all tests (133 tests)
pnpm test -- --watch  # Watch mode
pnpm lint             # Type-check (tsc --noEmit)
pnpm clean            # Remove all dist/ directories
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines.

## License

[MIT](./LICENSE)
