import type { Command } from "commander";
import { createOrchestrator } from "../bootstrap.js";

export function registerRunCommand(program: Command): void {
  program
    .command("run <prompt>")
    .description("Run a prompt through AI CLIs")
    .option("-s, --strategy <strategy>", "Routing strategy (cheap-first, quality-first, balanced)", "balanced")
    .option("-a, --adapter <adapter>", "Specific adapter to use")
    .option("-m, --model <model>", "Model for intra-CLI routing (e.g., opus, codex, gemini)")
    .option("-t, --timeout <ms>", "Timeout in milliseconds")
    .action(async (prompt, opts) => {
      try {
        const orchestrator = createOrchestrator();
        const result = await orchestrator.run(prompt, {
          strategy: opts.strategy,
          adapter: opts.adapter,
          model: opts.model,
          timeout: opts.timeout ? Number(opts.timeout) : undefined,
          cwd: process.cwd(),
        });

        console.log(result.output);

        // Print metadata to stderr so it doesn't pollute stdout
        console.error(`\n[bccg] adapter=${result.adapter} model=${result.model} latency=${result.latency}ms`);
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });
}
