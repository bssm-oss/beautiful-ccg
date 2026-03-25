import type { Command } from "commander";
import { createOrchestrator } from "../bootstrap.js";
import { startServer } from "@bccg/mcp-server";

export function registerServeCommand(program: Command): void {
  program
    .command("serve")
    .description("Start bccg MCP server (stdio)")
    .action(async () => {
      const orchestrator = createOrchestrator();
      await startServer(orchestrator);
    });
}
