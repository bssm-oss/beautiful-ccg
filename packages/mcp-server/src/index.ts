import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Orchestrator } from "@bccg/core";
import { createServer } from "./server.js";

export { createServer } from "./server.js";

export async function startServer(orchestrator: Orchestrator): Promise<void> {
  const server = createServer(orchestrator);
  const transport = new StdioServerTransport();

  const cleanup = () => {
    process.exit(0);
  };
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  await server.connect(transport);
}
