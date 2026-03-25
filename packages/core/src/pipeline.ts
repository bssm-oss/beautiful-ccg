import type { AdapterResult, PipelineResult, StepResult, RunOptions } from "@bccg/adapter-base";
import { PipelineError } from "@bccg/adapter-base";
import type { ParsedStep } from "./steps-parser.js";
import type { Registry } from "./registry.js";

export async function runPipeline(
  steps: ParsedStep[],
  basePrompt: string,
  registry: Registry,
  options?: { signal?: AbortSignal; cwd?: string; timeout?: number },
): Promise<PipelineResult> {
  const results: StepResult[] = [];
  let currentPrompt = basePrompt;
  const startTime = Date.now();

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const isLastStep = i === steps.length - 1;

    // Resolve adapter
    let adapter = step.adapter ? registry.get(step.adapter) : undefined;
    if (step.adapter && !adapter) {
      results.push({
        step: i,
        adapter: step.adapter,
        model: step.model ?? "unknown",
        output: "",
        status: "error",
        error: `Adapter "${step.adapter}" not found`,
        latency: 0,
      });
      throw new PipelineError(`Adapter "${step.adapter}" not found at step ${i}`, i, results);
    }

    // If no adapter specified, use first available
    if (!adapter) {
      const available = registry.getAll();
      if (available.length === 0) throw new PipelineError("No adapters available", i, results);
      adapter = available[0];
    }

    // Build the prompt for this step
    let stepPrompt = currentPrompt;
    if (step.action) {
      stepPrompt = `${step.action}: ${currentPrompt}`;
    }
    if (isLastStep && steps.length > 1) {
      stepPrompt = `Based on the previous analysis, synthesize a final answer:\n\n${stepPrompt}`;
    }

    const stepStart = Date.now();
    try {
      const runOpts: RunOptions = {
        model: step.model,
        signal: options?.signal,
        cwd: options?.cwd,
        timeout: options?.timeout,
      };

      const result: AdapterResult = await adapter.run(stepPrompt, runOpts);

      results.push({
        step: i,
        adapter: result.adapter,
        model: result.model,
        output: result.output,
        status: "success",
        latency: result.latency,
      });

      // Pass this step's output as context to next step
      currentPrompt = result.output;
    } catch (err) {
      const latency = Date.now() - stepStart;
      results.push({
        step: i,
        adapter: step.adapter ?? "unknown",
        model: step.model ?? "unknown",
        output: "",
        status: "error",
        error: err instanceof Error ? err.message : String(err),
        latency,
      });

      throw new PipelineError(
        `Step ${i} (${step.adapter ?? "unknown"}) failed: ${err instanceof Error ? err.message : String(err)}`,
        i,
        results,
      );
    }
  }

  return {
    steps: results,
    finalOutput: results[results.length - 1]?.output ?? "",
    totalLatency: Date.now() - startTime,
  };
}
