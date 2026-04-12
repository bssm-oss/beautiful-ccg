import type {
  AdapterResult,
  PipelineResult,
  Strategy,
  AvailabilityStatus,
  BccgConfig,
} from "@beautiful-ccg/adapter-base";
import { Registry } from "./registry.js";
import { route } from "./router.js";
import { parseSteps } from "./steps-parser.js";
import { runPipeline } from "./pipeline.js";

export class Orchestrator {
  constructor(
    readonly registry: Registry,
    private config?: BccgConfig,
  ) {}

  async run(
    prompt: string,
    opts?: {
      strategy?: Strategy;
      adapter?: string;
      model?: string;
      cwd?: string;
      timeout?: number;
      signal?: AbortSignal;
    },
  ): Promise<AdapterResult> {
    // If specific adapter requested, use it directly
    if (opts?.adapter) {
      const adapter = this.registry.get(opts.adapter);
      if (!adapter) throw new Error(`Adapter "${opts.adapter}" not found`);
      return adapter.run(prompt, {
        model: opts.model,
        cwd: opts.cwd,
        timeout: opts.timeout,
        signal: opts.signal,
      });
    }

    // Otherwise, route based on strategy
    const available = await this.registry.getAvailable();
    const strategy = opts?.strategy ?? this.config?.defaults?.strategy ?? "balanced";
    const plan = route(prompt, strategy, available, this.config);

    // Parallel: run all adapters concurrently
    if (plan.strategy === "parallel" && plan.steps.length > 1) {
      const promises = plan.steps.map(async (s) => {
        const a = this.registry.get(s.adapter);
        if (!a) return null;
        try {
          return await a.run(prompt, {
            model: s.model ?? opts?.model,
            cwd: opts?.cwd,
            timeout: opts?.timeout,
            signal: opts?.signal,
          });
        } catch {
          return null;
        }
      });

      const settled = await Promise.allSettled(promises);
      const results = settled
        .map(s => s.status === "fulfilled" ? s.value : null)
        .filter((r): r is AdapterResult => r !== null);

      if (results.length === 0) throw new Error("All parallel adapters failed");

      const combined = results
        .map(r => `--- ${r.adapter} (${r.model}) ---\n${r.output}`)
        .join("\n\n");

      return {
        output: combined,
        model: "parallel",
        adapter: results.map(r => r.adapter).join("+"),
        latency: Math.max(...results.map(r => r.latency)),
        exitCode: 0,
        raw: JSON.stringify(results),
      };
    }

    // Single step: execute primary with fallback
    const step = plan.steps[0];
    const adapter = this.registry.get(step.adapter);
    if (!adapter) throw new Error(`Routed adapter "${step.adapter}" not found`);

    try {
      return await adapter.run(prompt, {
        model: step.model ?? opts?.model,
        cwd: opts?.cwd,
        timeout: opts?.timeout,
        signal: opts?.signal,
      });
    } catch (err) {
      // Try fallback if available
      if (step.fallback) {
        const colonIdx = step.fallback.indexOf(":");
        const fallbackAdapter =
          colonIdx !== -1 ? step.fallback.slice(0, colonIdx) : step.fallback;
        const fallbackModel = colonIdx !== -1 ? step.fallback.slice(colonIdx + 1) : undefined;
        const fb = this.registry.get(fallbackAdapter);
        if (fb) {
          return fb.run(prompt, {
            model: fallbackModel,
            cwd: opts?.cwd,
            timeout: opts?.timeout,
            signal: opts?.signal,
          });
        }
      }
      throw err;
    }
  }

  async pipeline(
    stepsStr: string,
    opts?: { basePrompt?: string; cwd?: string; timeout?: number; signal?: AbortSignal },
  ): Promise<PipelineResult> {
    const steps = parseSteps(stepsStr);
    return runPipeline(steps, opts?.basePrompt ?? "", this.registry, {
      cwd: opts?.cwd,
      timeout: opts?.timeout,
      signal: opts?.signal,
    });
  }

  async status(): Promise<Record<string, AvailabilityStatus>> {
    const result: Record<string, AvailabilityStatus> = {};
    for (const adapter of this.registry.getAll()) {
      result[adapter.name] = await adapter.checkAvailability();
    }
    return result;
  }
}
