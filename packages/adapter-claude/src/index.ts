import { execa } from "execa";
import type {
  ModelAdapter,
  CostTier,
  RunOptions,
  AdapterResult,
  AvailabilityStatus,
} from "@bccg/adapter-base";
import { AdapterError, DEFAULT_TIMEOUTS } from "@bccg/adapter-base";
import { parseClaudeOutput } from "./parser.js";

export { parseClaudeOutput } from "./parser.js";
export type { ClaudeParsed } from "./parser.js";

export class ClaudeAdapter implements ModelAdapter {
  readonly name = "claude";
  readonly costTier: CostTier = "high";
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

    const result = await execa("claude", args, {
      cwd: options?.cwd,
      timeout: options?.timeout ?? DEFAULT_TIMEOUTS.claude,
      cancelSignal: options?.signal as AbortSignal | undefined,
      env,
      reject: false,
    });

    const latency = Date.now() - start;

    if (result.timedOut) {
      throw new AdapterError(
        `claude timed out after ${options?.timeout ?? DEFAULT_TIMEOUTS.claude}ms`,
        "claude",
        undefined,
        result.stderr,
      );
    }

    const parsed = parseClaudeOutput(result.stdout ?? "");

    if (parsed.exitCode !== 0 || (result.exitCode !== 0 && result.exitCode !== null)) {
      const code = parsed.exitCode !== 0 ? parsed.exitCode : (result.exitCode ?? 1);
      throw new AdapterError(
        `claude exited with code ${code}`,
        "claude",
        code,
        result.stderr,
      );
    }

    return {
      output: parsed.content,
      model: parsed.model || "claude",
      adapter: "claude",
      latency,
      exitCode: parsed.exitCode,
      raw: result.stdout,
    };
  }

  async checkAvailability(): Promise<AvailabilityStatus> {
    // If CLAUDECODE is set, we're running inside a Claude Code session.
    // The binary is installed but cannot be used as a nested target.
    if (process.env.CLAUDECODE) {
      let version: string | null = null;
      try {
        const result = await execa("claude", ["--version"], { reject: false });
        if (result.exitCode === 0) {
          version = result.stdout?.trim() ?? null;
        }
      } catch {
        // ignore
      }
      return {
        installed: true,
        authenticated: false,
        version,
        jsonOutput: true,
        multiModel: false,
      };
    }

    try {
      const result = await execa("claude", ["--version"], { reject: false });
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
