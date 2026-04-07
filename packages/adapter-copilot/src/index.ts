import { execa } from "execa";
import type {
  ModelAdapter,
  CostTier,
  RunOptions,
  AdapterResult,
  AvailabilityStatus,
} from "@beautiful-ccg/adapter-base";
import { AdapterError, DEFAULT_TIMEOUTS } from "@beautiful-ccg/adapter-base";
import { parseCopilotOutput } from "./parser.js";
import { COPILOT_MODELS, resolveModel } from "./models.js";

export { parseCopilotOutput } from "./parser.js";
export type { CopilotParsed } from "./parser.js";
export { COPILOT_MODELS, COPILOT_MODEL_INFO, MODEL_ALIASES, resolveModel, getModelMultiplier } from "./models.js";
export type { CopilotModel, CopilotModelInfo } from "./models.js";

export class CopilotAdapter implements ModelAdapter {
  readonly name = "copilot";
  readonly costTier: CostTier = "medium";
  readonly multiModel = true;

  async run(prompt: string, options?: RunOptions): Promise<AdapterResult> {
    const depth = Number(process.env.BCCG_DEPTH ?? "0");
    const args: string[] = ["-p", prompt, "-s", "--output-format", "json", "--allow-all-tools"];

    if (options?.model) {
      args.push("--model", resolveModel(options.model));
    }

    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      ...(options?.env ?? {}),
      BCCG_DEPTH: String(depth + 1),
    };

    const start = Date.now();

    const result = await execa("copilot", args, {
      cwd: options?.cwd,
      timeout: options?.timeout ?? DEFAULT_TIMEOUTS.copilot,
      cancelSignal: options?.signal as AbortSignal | undefined,
      env,
      reject: false,
    });

    const latency = Date.now() - start;

    if (result.timedOut) {
      throw new AdapterError(
        `copilot timed out after ${options?.timeout ?? DEFAULT_TIMEOUTS.copilot}ms`,
        "copilot",
        undefined,
        result.stderr,
      );
    }

    const parsed = parseCopilotOutput(result.stdout ?? "");

    if (parsed.exitCode !== 0 || (result.exitCode !== 0 && result.exitCode !== null)) {
      const code = parsed.exitCode !== 0 ? parsed.exitCode : (result.exitCode ?? 1);
      throw new AdapterError(
        `copilot exited with code ${code}`,
        "copilot",
        code,
        result.stderr,
      );
    }

    return {
      output: parsed.content,
      model: parsed.model || "copilot",
      adapter: "copilot",
      latency,
      exitCode: parsed.exitCode,
      raw: result.stdout,
    };
  }

  async checkAvailability(): Promise<AvailabilityStatus> {
    try {
      const result = await execa("copilot", ["--version"], { reject: false });
      const installed = result.exitCode === 0;
      const raw = result.stdout?.trim() ?? "";
      const version = installed ? (raw.match(/\d+\.\d+\.\d+/)?.[0] ?? raw.split("\n")[0]) : null;

      return {
        installed,
        authenticated: installed, // assume authenticated if installed
        version,
        jsonOutput: true,
        multiModel: true,
        supportedModels: [...COPILOT_MODELS],
      };
    } catch {
      return {
        installed: false,
        authenticated: false,
        version: null,
        jsonOutput: true,
        multiModel: true,
        supportedModels: [...COPILOT_MODELS],
      };
    }
  }

  async getSupportedModels(): Promise<string[]> {
    return [...COPILOT_MODELS];
  }
}
