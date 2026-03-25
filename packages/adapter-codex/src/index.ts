import { execa } from "execa";
import type {
  ModelAdapter,
  CostTier,
  RunOptions,
  AdapterResult,
  AvailabilityStatus,
} from "@bccg/adapter-base";
import { AdapterError, DEFAULT_TIMEOUTS, MAX_OUTPUT_SIZE } from "@bccg/adapter-base";
import { parseCodexOutput } from "./parser.js";

export { parseCodexOutput } from "./parser.js";
export type { CodexParsed } from "./parser.js";

export class CodexAdapter implements ModelAdapter {
  readonly name = "codex";
  readonly costTier: CostTier = "medium";
  readonly multiModel = false;

  async run(prompt: string, options?: RunOptions): Promise<AdapterResult> {
    const depth = Number(process.env.BCCG_DEPTH ?? "0");
    const args: string[] = ["exec", prompt, "--json", "--full-auto"];

    const env = {
      ...(options?.env ?? {}),
      BCCG_DEPTH: String(depth + 1),
    };

    const start = Date.now();

    const result = await execa("codex", args, {
      cwd: options?.cwd,
      timeout: options?.timeout ?? DEFAULT_TIMEOUTS.codex,
      cancelSignal: options?.signal as AbortSignal | undefined,
      env,
      reject: false,
    });

    const latency = Date.now() - start;

    if (result.timedOut) {
      throw new AdapterError(
        `codex timed out after ${options?.timeout ?? DEFAULT_TIMEOUTS.codex}ms`,
        "codex",
        undefined,
        result.stderr,
      );
    }

    const stdout = result.stdout ?? "";
    if (stdout.length > MAX_OUTPUT_SIZE) {
      throw new AdapterError(
        `codex output exceeded MAX_OUTPUT_SIZE (${MAX_OUTPUT_SIZE} bytes)`,
        "codex",
      );
    }

    const parsed = parseCodexOutput(stdout);

    if (result.exitCode !== 0 && result.exitCode !== null) {
      throw new AdapterError(
        `codex exited with code ${result.exitCode}`,
        "codex",
        result.exitCode,
        result.stderr,
      );
    }

    return {
      output: parsed.content,
      model: parsed.model,
      adapter: "codex",
      latency,
      exitCode: result.exitCode ?? 0,
      raw: result.stdout,
    };
  }

  async checkAvailability(): Promise<AvailabilityStatus> {
    try {
      const result = await execa("codex", ["--version"], { reject: false });
      const installed = result.exitCode === 0;
      const version = installed ? (result.stdout?.trim() ?? null) : null;

      return {
        installed,
        authenticated: installed, // assume authenticated if installed
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
