# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-04-01

### Added

- **Monorepo** with 8 packages (`adapter-base`, `adapter-claude`, `adapter-codex`, `adapter-copilot`, `adapter-gemini`, `core`, `mcp-server`, `cli`)
- **4 CLI adapters**: Claude Code, GitHub Copilot, OpenAI Codex, Google Gemini
- **Copilot multi-model routing** with `--model` flag and short aliases (`opus`, `sonnet`, `codex`, `gemini`, `haiku`)
- **Routing strategies**: `cheap-first`, `quality-first`, `balanced`, `parallel`
- **Pipeline DSL** for chaining CLIs (`gemini:summarize -> codex:implement -> claude:review`)
- **Task classifier** (keyword-based: `reasoning`, `coding`, `summarize`, `general`)
- **MCP server** with 3 tools: `bccg_run`, `bccg_pipeline`, `bccg_status`
- **CLI** with 4 commands: `run`, `status`, `init`, `serve`
- **Recursion guard** via `BCCG_DEPTH` environment variable
- **Auto-setup** via `bccg init` (CLI detection + MCP server registration)
- 125 tests across all packages
