import { execa } from "execa";
import type {
  ModelAdapter,
  CostTier,
  RunOptions,
  AdapterResult,
  AvailabilityStatus,
} from "@bccg/adapter-base";
import { AdapterError, DEFAULT_TIMEOUTS } from "@bccg/adapter-base";
import { parseGeminiOutput } from "./parser.js";

export { parseGeminiOutput } from "./parser.js";
export type { GeminiParsed } from "./parser.js";

export class GeminiAdapter implements ModelAdapter {
  readonly name = "gemini";
  readonly costTier: CostTier = "free";
  readonly multiModel = false;

  async run(prompt: string, options?: RunOptions): Promise<AdapterResult> {
    const depth = Number(process.env.BCCG_DEPTH ?? "0");
    const args: string[] = ["-p", prompt, "--output-format", "json"];

    const env: Record<string, string> = {
      ...(process.env as Record<string, string>),
      ...(options?.env ?? {}),
      BCCG_DEPTH: String(depth + 1),
    };

    const start = Date.now();

    const result = await execa("gemini", args, {
      cwd: options?.cwd,
      timeout: options?.timeout ?? DEFAULT_TIMEOUTS.gemini,
      cancelSignal: options?.signal as AbortSignal | undefined,
      env,
      reject: false,
    });

    const latency = Date.now() - start;

    if (result.timedOut) {
      throw new AdapterError(
        `gemini timed out after ${options?.timeout ?? DEFAULT_TIMEOUTS.gemini}ms`,
        "gemini",
        undefined,
        result.stderr,
      );
    }

    if (result.exitCode !== 0 && result.exitCode !== null) {
      throw new AdapterError(
        `gemini exited with code ${result.exitCode}`,
        "gemini",
        result.exitCode,
        result.stderr,
      );
    }

    const parsed = parseGeminiOutput(result.stdout ?? "");

    return {
      output: parsed.content,
      model: parsed.model || "gemini",
      adapter: "gemini",
      latency,
      exitCode: result.exitCode ?? 0,
      raw: result.stdout,
    };
  }

  async checkAvailability(): Promise<AvailabilityStatus> {
    try {
      const result = await execa("gemini", ["--version"], { reject: false });
      const installed = result.exitCode === 0;
      const version = installed ? (result.stdout?.trim() ?? null) : null;

      return {
        installed,
        authenticated: installed,
        version,
        jsonOutput: true,
        multiModel: false,
      };
    } catch {
      return {
        installed: false,
        authenticated: false,
        version: null,
        jsonOutput: true,
        multiModel: false,
      };
    }
  }
}
