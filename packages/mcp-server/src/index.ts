import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { BCCG_HOST_CLI_ENV } from "@bccg/adapter-base";
import type { Orchestrator } from "@bccg/core";
import { createServer } from "./server.js";

export { createServer } from "./server.js";

/** Auto-detect which CLI is hosting the bccg MCP server */
function detectHostCli(): string | undefined {
  if (process.env.CLAUDECODE) return "claude";
  if (process.env.CODEX_CLI) return "codex";
  if (process.env.COPILOT_CLI) return "copilot";
  if (process.env.GEMINI_CLI) return "gemini";
  return undefined;
}

export async function startServer(orchestrator: Orchestrator): Promise<void> {
  // Set BCCG_HOST_CLI so the registry can exclude the host CLI
  const hostCli = detectHostCli();
  if (hostCli) {
    process.env[BCCG_HOST_CLI_ENV] = hostCli;
  }

  const server = createServer(orchestrator);
  const transport = new StdioServerTransport();

  const cleanup = async () => {
    await server.close();
    process.exit(0);
  };
  process.on("SIGINT", () => void cleanup());
  process.on("SIGTERM", () => void cleanup());

  await server.connect(transport);
}
