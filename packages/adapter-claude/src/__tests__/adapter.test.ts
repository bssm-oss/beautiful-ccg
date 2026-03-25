import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ClaudeAdapter } from "../index.js";
import { AdapterError } from "@bccg/adapter-base";

// Mock execa module
vi.mock("execa", () => ({
  execa: vi.fn(),
}));

import { execa } from "execa";
const mockedExeca = vi.mocked(execa);

function makeExecaResult(overrides: Record<string, unknown> = {}) {
  return {
    stdout: "",
    stderr: "",
    exitCode: 0,
    timedOut: false,
    killed: false,
    failed: false,
    ...overrides,
  };
}

function makeJsonlOutput(model: string, content: string, exitCode = 0): string {
  return [
    `{"type":"assistant.message","data":{"content":${JSON.stringify(content)}}}`,
    `{"type":"result","exitCode":${exitCode},"model":"${model}"}`,
  ].join("\n");
}

describe("ClaudeAdapter", () => {
  let adapter: ClaudeAdapter;

  beforeEach(() => {
    adapter = new ClaudeAdapter();
    vi.clearAllMocks();
    delete process.env.BCCG_DEPTH;
    delete process.env.CLAUDECODE;
  });

  afterEach(() => {
    delete process.env.BCCG_DEPTH;
    delete process.env.CLAUDECODE;
  });

  describe("run()", () => {
    it("builds correct command args ['-p', prompt, '--output-format', 'json']", async () => {
      mockedExeca.mockResolvedValueOnce(
        makeExecaResult({ stdout: makeJsonlOutput("claude-sonnet-4-5", "response") }) as never,
      );

      await adapter.run("hello world");

      expect(mockedExeca).toHaveBeenCalledWith(
        "claude",
        ["-p", "hello world", "--output-format", "json"],
        expect.objectContaining({ reject: false }),
      );
    });

    it("sets BCCG_DEPTH env correctly, incrementing from current value", async () => {
      process.env.BCCG_DEPTH = "2";
      mockedExeca.mockResolvedValueOnce(
        makeExecaResult({ stdout: makeJsonlOutput("claude-sonnet-4-5", "response") }) as never,
      );

      await adapter.run("hello");

      const callArgs = mockedExeca.mock.calls[0];
      const opts = callArgs[2] as Record<string, unknown>;
      const env = opts.env as Record<string, string>;
      expect(env.BCCG_DEPTH).toBe("3");
    });

    it("sets BCCG_DEPTH to 1 when not previously set", async () => {
      mockedExeca.mockResolvedValueOnce(
        makeExecaResult({ stdout: makeJsonlOutput("claude-sonnet-4-5", "response") }) as never,
      );

      await adapter.run("hello");

      const callArgs = mockedExeca.mock.calls[0];
      const opts = callArgs[2] as Record<string, unknown>;
      const env = opts.env as Record<string, string>;
      expect(env.BCCG_DEPTH).toBe("1");
    });

    it("throws AdapterError on subprocess timeout", async () => {
      mockedExeca.mockResolvedValue(
        makeExecaResult({ timedOut: true, stdout: "", stderr: "timed out" }) as never,
      );

      await expect(adapter.run("hello", { timeout: 1000 })).rejects.toThrow(AdapterError);
      await expect(adapter.run("hello", { timeout: 1000 })).rejects.toThrow(/timed out/);
    });

    it("throws AdapterError on non-zero exit code", async () => {
      mockedExeca.mockResolvedValue(
        makeExecaResult({
          stdout: makeJsonlOutput("claude-sonnet-4-5", "", 1),
          exitCode: 1,
        }) as never,
      );

      await expect(adapter.run("hello")).rejects.toThrow(AdapterError);
    });

    it("returns correct AdapterResult on success", async () => {
      mockedExeca.mockResolvedValueOnce(
        makeExecaResult({
          stdout: makeJsonlOutput("claude-sonnet-4-5", "Hello there!"),
        }) as never,
      );

      const result = await adapter.run("say hello");

      expect(result.output).toBe("Hello there!");
      expect(result.adapter).toBe("claude");
      expect(result.exitCode).toBe(0);
      expect(typeof result.latency).toBe("number");
    });
  });

  describe("checkAvailability()", () => {
    it("returns installed:false when binary is missing", async () => {
      mockedExeca.mockRejectedValueOnce(new Error("ENOENT: claude not found") as never);

      const status = await adapter.checkAvailability();

      expect(status.installed).toBe(false);
      expect(status.authenticated).toBe(false);
      expect(status.version).toBeNull();
    });

    it("detects nested Claude session via CLAUDECODE env var", async () => {
      process.env.CLAUDECODE = "1";
      mockedExeca.mockResolvedValueOnce(
        makeExecaResult({ stdout: "1.0.0", exitCode: 0 }) as never,
      );

      const status = await adapter.checkAvailability();

      expect(status.installed).toBe(true);
      expect(status.authenticated).toBe(false);
      expect(status.jsonOutput).toBe(true);
      expect(status.multiModel).toBe(false);
    });

    it("returns installed:true and authenticated:true when binary exists and not nested", async () => {
      mockedExeca.mockResolvedValueOnce(
        makeExecaResult({ stdout: "1.2.3", exitCode: 0 }) as never,
      );

      const status = await adapter.checkAvailability();

      expect(status.installed).toBe(true);
      expect(status.authenticated).toBe(true);
      expect(status.version).toBe("1.2.3");
      expect(status.jsonOutput).toBe(true);
      expect(status.multiModel).toBe(false);
    });
  });

  describe("parser edge cases via run()", () => {
    it("handles empty stdout gracefully (falls back to empty string)", async () => {
      mockedExeca.mockResolvedValueOnce(
        makeExecaResult({ stdout: "", exitCode: 0 }) as never,
      );

      // Empty output has exitCode 0 from result, but parsed exitCode will also be 0
      // Content will be empty string (trimmed empty stdout)
      const result = await adapter.run("hello");
      expect(result.output).toBe("");
      expect(result.exitCode).toBe(0);
    });
  });
});
