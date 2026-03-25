import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CodexAdapter } from "../index.js";
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

function makeNdjsonOutput(content: string): string {
  return [
    '{"type":"thread.started","thread_id":"test-id"}',
    '{"type":"turn.started"}',
    `{"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":${JSON.stringify(content)}}}`,
    '{"type":"turn.completed","usage":{"input_tokens":100,"cached_input_tokens":0,"output_tokens":10}}',
  ].join("\n");
}

describe("CodexAdapter", () => {
  let adapter: CodexAdapter;

  beforeEach(() => {
    adapter = new CodexAdapter();
    vi.clearAllMocks();
    delete process.env.BCCG_DEPTH;
  });

  afterEach(() => {
    delete process.env.BCCG_DEPTH;
  });

  describe("run()", () => {
    it("builds correct args [exec, prompt, --json, --full-auto]", async () => {
      mockedExeca.mockResolvedValueOnce(
        makeExecaResult({ stdout: makeNdjsonOutput("response") }) as never,
      );

      await adapter.run("hello world");

      expect(mockedExeca).toHaveBeenCalledWith(
        "codex",
        ["exec", "hello world", "--json", "--full-auto"],
        expect.objectContaining({ reject: false }),
      );
    });

    it("sets BCCG_DEPTH env correctly, incrementing from current value", async () => {
      process.env.BCCG_DEPTH = "2";
      mockedExeca.mockResolvedValueOnce(
        makeExecaResult({ stdout: makeNdjsonOutput("response") }) as never,
      );

      await adapter.run("hello");

      const callArgs = mockedExeca.mock.calls[0];
      const opts = callArgs[2] as Record<string, unknown>;
      const env = opts.env as Record<string, string>;
      expect(env.BCCG_DEPTH).toBe("3");
    });

    it("sets BCCG_DEPTH to 1 when not previously set", async () => {
      mockedExeca.mockResolvedValueOnce(
        makeExecaResult({ stdout: makeNdjsonOutput("response") }) as never,
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
          stdout: "",
          exitCode: 1,
          stderr: "error occurred",
        }) as never,
      );

      await expect(adapter.run("hello")).rejects.toThrow(AdapterError);
    });

    it("returns correct AdapterResult on success", async () => {
      mockedExeca.mockResolvedValueOnce(
        makeExecaResult({ stdout: makeNdjsonOutput("Hello there!") }) as never,
      );

      const result = await adapter.run("say hello");

      expect(result.output).toBe("Hello there!");
      expect(result.model).toBe("gpt-5.3-codex");
      expect(result.adapter).toBe("codex");
      expect(result.exitCode).toBe(0);
      expect(typeof result.latency).toBe("number");
    });
  });

  describe("checkAvailability()", () => {
    it("returns installed:true and parses version when binary exists", async () => {
      mockedExeca.mockResolvedValueOnce(
        makeExecaResult({ stdout: "0.107.0", exitCode: 0 }) as never,
      );

      const status = await adapter.checkAvailability();

      expect(status.installed).toBe(true);
      expect(status.authenticated).toBe(true);
      expect(status.version).toBe("0.107.0");
      expect(status.jsonOutput).toBe(true);
      expect(status.multiModel).toBe(false);
    });

    it("returns installed:false when binary is missing", async () => {
      mockedExeca.mockRejectedValueOnce(new Error("ENOENT: codex not found") as never);

      const status = await adapter.checkAvailability();

      expect(status.installed).toBe(false);
      expect(status.authenticated).toBe(false);
      expect(status.version).toBeNull();
    });

    it("returns installed:false when binary exits with non-zero", async () => {
      mockedExeca.mockResolvedValueOnce(
        makeExecaResult({ exitCode: 1, stdout: "" }) as never,
      );

      const status = await adapter.checkAvailability();

      expect(status.installed).toBe(false);
    });
  });
});
