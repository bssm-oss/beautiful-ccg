import type { Command } from "commander";
import { createOrchestrator } from "../bootstrap.js";

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => { data += chunk; });
    process.stdin.on("end", () => resolve(data.trim()));
    process.stdin.on("error", reject);
  });
}

export function registerRunCommand(program: Command): void {
  program
    .command("run [prompt]")
    .description("Run a prompt through AI CLIs")
    .option("-s, --strategy <strategy>", "Routing strategy (cheap-first, quality-first, balanced, parallel)", "balanced")
    .option("-a, --adapter <adapter>", "Specific adapter to use")
    .option("-m, --model <model>", "Model for intra-CLI routing (e.g., opus, codex, gemini)")
    .option("-t, --timeout <ms>", "Timeout in milliseconds")
    .option("--json", "Output as JSON")
    .option("--verbose", "Show routing decisions")
    .action(async (prompt, opts) => {
      try {
        // Read from stdin if prompt is "-" or missing
        let input = prompt;
        if (!input || input === "-") {
          if (process.stdin.isTTY) {
            console.error("Error: No prompt provided. Pass a prompt or pipe via stdin.");
            process.exit(1);
          }
          input = await readStdin();
        }

        const orchestrator = createOrchestrator();

        if (opts.verbose) {
          console.error(`[bccg] strategy=${opts.strategy} adapter=${opts.adapter ?? "auto"} model=${opts.model ?? "default"}`);
        }

        const result = await orchestrator.run(input, {
          strategy: opts.strategy,
          adapter: opts.adapter,
          model: opts.model,
          timeout: opts.timeout ? Number(opts.timeout) : undefined,
          cwd: process.cwd(),
        });

        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(result.output);
          console.error(`\n[bccg] adapter=${result.adapter} model=${result.model} latency=${result.latency}ms`);
        }
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });
}
