# @beautiful-ccg/mcp-server

MCP server that exposes bccg capabilities as tools via the [Model Context Protocol](https://modelcontextprotocol.io).

## Usage

```typescript
import { createServer, startServer } from "@beautiful-ccg/mcp-server";
import { Orchestrator, Registry } from "@beautiful-ccg/core";

const orchestrator = new Orchestrator(registry);

// Option 1: Start stdio server (blocks)
await startServer(orchestrator);

// Option 2: Create server for custom transport
const server = createServer(orchestrator);
await server.connect(myTransport);
```

## MCP Tools

### `bccg_run`

Run a prompt through multiple AI CLIs with auto-routing.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `prompt` | string | yes | The prompt to run |
| `strategy` | enum | no | `cheap-first`, `quality-first`, `balanced`, `parallel` |
| `adapter` | string | no | Specific adapter name |
| `model` | string | no | Model for intra-CLI routing |

### `bccg_pipeline`

Execute a multi-step CCG pipeline.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `steps` | string | yes | Pipeline DSL (e.g. `gemini:summarize -> claude:review`) |
| `prompt` | string | no | Base prompt for the pipeline |

### `bccg_status`

Check available CLI adapters and their status. No parameters. Returns JSON.

## Recursion Guard

Both `bccg_run` and `bccg_pipeline` are blocked when `BCCG_DEPTH >= 1`, returning an error. This prevents infinite loops when a host CLI invokes bccg which would spawn the same CLI.

## Transport

Uses `StdioServerTransport` from `@modelcontextprotocol/sdk`. Handles `SIGINT` and `SIGTERM` for clean shutdown.

## Exports

- `createServer(orchestrator): McpServer` — create an MCP server instance
- `startServer(orchestrator): Promise<void>` — start stdio server (blocks until signal)
