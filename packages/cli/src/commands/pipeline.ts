import type { Command } from "commander";
import { createOrchestrator } from "../bootstrap.js";

export function registerPipelineCommand(program: Command): void {
  program
    .command("pipeline <steps>")
    .description("Execute a multi-step CCG pipeline (e.g., 'gemini:summarize -> claude:review')")
    .option("-p, --prompt <prompt>", "Base prompt for the pipeline")
    .option("-t, --timeout <ms>", "Timeout in milliseconds")
    .option("--json", "Output as JSON")
    .action(async (steps, opts) => {
      try {
        const orchestrator = createOrchestrator();
        const result = await orchestrator.pipeline(steps, {
          basePrompt: opts.prompt,
          timeout: opts.timeout ? Number(opts.timeout) : undefined,
          cwd: process.cwd(),
        });

        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(result.finalOutput);
          console.error(
            `\n[bccg] steps=${result.steps.length} totalLatency=${result.totalLatency}ms`,
          );
        }
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });
}
