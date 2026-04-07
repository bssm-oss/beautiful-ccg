import type { Command } from "commander";
import { createOrchestrator } from "../bootstrap.js";
import { COPILOT_MODEL_INFO } from "@beautiful-ccg/adapter-copilot";

function formatMultiplier(m: number): string {
  if (m === 0) return "free";
  if (m < 1) return `${m}x`;
  return `${m}x`;
}

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
            const modelLines = s.supportedModels.map(m => {
              const info = COPILOT_MODEL_INFO.find(i => i.name === m);
              return info ? `${m} (${formatMultiplier(info.multiplier)})` : m;
            });
            console.log(`     models: ${modelLines.join(", ")}`);
          }
        }
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });
}
