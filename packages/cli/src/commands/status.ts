import type { Command } from "commander";
import { createOrchestrator } from "../bootstrap.js";

export function registerStatusCommand(program: Command): void {
  program
    .command("status")
    .description("Check available CLI adapters and their status")
    .action(async () => {
      try {
        const orchestrator = createOrchestrator();
        const status = await orchestrator.status();

        console.log("bccg adapter status:\n");
        for (const [name, s] of Object.entries(status)) {
          const icon = s.installed && s.authenticated ? "✅" : s.installed ? "⚠️" : "❌";
          const version = s.version ?? "not installed";
          const multi = s.multiModel ? " [multi-model]" : "";
          console.log(`  ${icon} ${name} (v${version})${multi}`);

          if (s.supportedModels && s.supportedModels.length > 0) {
            console.log(`     models: ${s.supportedModels.join(", ")}`);
          }
        }
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });
}
