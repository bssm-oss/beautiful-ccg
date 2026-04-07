# @beautiful-ccg/cli

The `bccg` command-line tool. Wraps all bccg functionality into four commands.

## Install

```bash
npm install -g @beautiful-ccg/cli
```

## Commands

### `bccg run <prompt>`

Run a prompt through AI CLIs.

```bash
bccg run "explain this error"
bccg run --strategy cheap-first "summarize this file"
bccg run --adapter copilot --model opus "complex analysis"
bccg run --timeout 30000 "quick question"
```

| Option | Description | Default |
|---|---|---|
| `-s, --strategy` | Routing strategy | `balanced` |
| `-a, --adapter` | Specific adapter | auto-route |
| `-m, --model` | Model for multi-model adapters | adapter default |
| `-t, --timeout` | Timeout (ms) | per-adapter default |

### `bccg status`

Show detected CLIs, versions, and capabilities.

### `bccg init`

Auto-detect CLIs and set up configuration.

1. Scans for installed CLIs (`copilot`, `claude`, `codex`, `gemini`)
2. Generates `.ccg/config.yaml`
3. Registers bccg MCP server in each CLI's config:
   - Claude: `~/.claude/mcp-servers.json`
   - Gemini: `~/.gemini/settings.json`
   - Copilot: `~/.copilot/mcp-config.json`

### `bccg serve`

Start the MCP server (stdio transport). Called automatically by host CLIs via MCP config.

## Output

- `bccg run` prints the result to **stdout** and metadata to **stderr**:
  ```
  [bccg] adapter=copilot model=claude-opus-4.6 latency=2340ms
  ```
- `bccg status` prints a formatted table to stdout
