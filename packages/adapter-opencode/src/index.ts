import { execa } from "execa";
import type {
  ModelAdapter,
  CostTier,
  RunOptions,
  AdapterResult,
  AvailabilityStatus,
} from "@beautiful-ccg/adapter-base";
import { AdapterError, DEFAULT_TIMEOUTS } from "@beautiful-ccg/adapter-base";
import { parseOpenCodeOutput } from "./parser.js";
import { OPENCODE_MODELS, resolveModel } from "./models.js";

export { parseOpenCodeOutput } from "./parser.js";
export type { OpenCodeParsed } from "./parser.js";
export { OPENCODE_MODELS, MODEL_ALIASES, resolveModel } from "./models.js";
export type { OpenCodeModel } from "./models.js";

export class OpenCodeAdapter implements ModelAdapter {
  readonly name = "opencode";
  readonly costTier: CostTier = "free";
  readonly multiModel = true;

  async run(prompt: string, options?: RunOptions): Promise<AdapterResult> {
    const depth = Number(process.env.BCCG_DEPTH ?? "0");
    const args: string[] = ["run", prompt, "--format", "json"];

    if (options?.model) {
      args.push("-m", resolveModel(options.model));
    }

    const env: Record<string, string> = {
      ...(process.env as Record<string, string>),
      ...(options?.env ?? {}),
      BCCG_DEPTH: String(depth + 1),
    };

    const start = Date.now();

    const result = await execa("opencode", args, {
      cwd: options?.cwd,
      timeout: options?.timeout ?? DEFAULT_TIMEOUTS.opencode,
      cancelSignal: options?.signal as AbortSignal | undefined,
      env,
      reject: false,
    });

    const latency = Date.now() - start;

    if (result.timedOut) {
      throw new AdapterError(
        `opencode timed out after ${options?.timeout ?? DEFAULT_TIMEOUTS.opencode}ms`,
        "opencode",
        undefined,
        result.stderr,
      );
    }

    const parsed = parseOpenCodeOutput(result.stdout ?? "");

    if (parsed.exitCode !== 0 || (result.exitCode !== 0 && result.exitCode !== null)) {
      const code = parsed.exitCode !== 0 ? parsed.exitCode : (result.exitCode ?? 1);
      throw new AdapterError(
        parsed.error ?? `opencode exited with code ${code}`,
        "opencode",
        code,
        result.stderr,
      );
    }

    return {
      output: parsed.content,
      model: parsed.model || "opencode",
      adapter: "opencode",
      latency,
      exitCode: parsed.exitCode,
      raw: result.stdout,
    };
  }

  async checkAvailability(): Promise<AvailabilityStatus> {
    try {
      const result = await execa("opencode", ["--version"], { reject: false });
      const installed = result.exitCode === 0;
      const raw = result.stdout?.trim() ?? "";
      const version = installed ? (raw.match(/\d+\.\d+\.\d+/)?.[0] ?? raw.split("\n")[0]) : null;

      return {
        installed,
        authenticated: installed,
        version,
        jsonOutput: true,
        multiModel: true,
        supportedModels: [...OPENCODE_MODELS],
      };
    } catch {
      return {
        installed: false,
        authenticated: false,
        version: null,
        jsonOutput: true,
        multiModel: true,
        supportedModels: [...OPENCODE_MODELS],
      };
    }
  }

  async getSupportedModels(): Promise<string[]> {
    return [...OPENCODE_MODELS];
  }
}
