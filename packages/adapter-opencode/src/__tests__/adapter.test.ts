import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OpenCodeAdapter } from "../index.js";
import { AdapterError } from "@beautiful-ccg/adapter-base";

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

function makeNdjsonOutput(model: string, content: string): string {
  return [
    `{"type":"step_start","timestamp":1,"sessionID":"s","metadata":{"model":"${model}"}}`,
    `{"type":"text","timestamp":2,"sessionID":"s","part":{"text":${JSON.stringify(content)}}}`,
    `{"type":"step_finish","timestamp":3,"sessionID":"s"}`,
  ].join("\n");
}

describe("OpenCodeAdapter", () => {
  let adapter: OpenCodeAdapter;

  beforeEach(() => {
    adapter = new OpenCodeAdapter();
    vi.clearAllMocks();
    delete process.env.BCCG_DEPTH;
  });

  afterEach(() => {
    delete process.env.BCCG_DEPTH;
  });

  describe("run()", () => {
    it("builds correct command args ['run', prompt, '--format', 'json']", async () => {
      mockedExeca.mockResolvedValueOnce(
        makeExecaResult({ stdout: makeNdjsonOutput("anthropic/claude-sonnet-4-5", "response") }) as never,
      );

      await adapter.run("hello world");

      expect(mockedExeca).toHaveBeenCalledWith(
        "opencode",
        ["run", "hello world", "--format", "json"],
        expect.objectContaining({ reject: false }),
      );
    });

    it("adds -m flag when options.model is provided", async () => {
      mockedExeca.mockResolvedValueOnce(
        makeExecaResult({ stdout: makeNdjsonOutput("anthropic/claude-opus-4-6", "response") }) as never,
      );

      await adapter.run("hello", { model: "anthropic/claude-opus-4-6" });

      expect(mockedExeca).toHaveBeenCalledWith(
        "opencode",
        ["run", "hello", "--format", "json", "-m", "anthropic/claude-opus-4-6"],
        expect.objectContaining({ reject: false }),
      );
    });

    it("passes model string through as-is", async () => {
      mockedExeca.mockResolvedValueOnce(
        makeExecaResult({ stdout: makeNdjsonOutput("google/gemini-3-flash-preview", "response") }) as never,
      );

      await adapter.run("hello", { model: "google/gemini-3-flash-preview" });

      expect(mockedExeca).toHaveBeenCalledWith(
        "opencode",
        ["run", "hello", "--format", "json", "-m", "google/gemini-3-flash-preview"],
        expect.objectContaining({ reject: false }),
      );
    });

    it("sets BCCG_DEPTH env correctly, incrementing from current value", async () => {
      process.env.BCCG_DEPTH = "2";
      mockedExeca.mockResolvedValueOnce(
        makeExecaResult({ stdout: makeNdjsonOutput("anthropic/claude-sonnet-4-5", "response") }) as never,
      );

      await adapter.run("hello");

      const callArgs = mockedExeca.mock.calls[0];
      const opts = (callArgs as unknown[])[2] as Record<string, unknown>;
      const env = opts.env as Record<string, string>;
      expect(env.BCCG_DEPTH).toBe("3");
    });

    it("sets BCCG_DEPTH to 1 when not previously set", async () => {
      mockedExeca.mockResolvedValueOnce(
        makeExecaResult({ stdout: makeNdjsonOutput("anthropic/claude-sonnet-4-5", "response") }) as never,
      );

      await adapter.run("hello");

      const callArgs = mockedExeca.mock.calls[0];
      const opts = (callArgs as unknown[])[2] as Record<string, unknown>;
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
        makeExecaResult({ stdout: "", exitCode: 1 }) as never,
      );

      await expect(adapter.run("hello")).rejects.toThrow(AdapterError);
    });

    it("returns correct AdapterResult on success", async () => {
      mockedExeca.mockResolvedValueOnce(
        makeExecaResult({
          stdout: makeNdjsonOutput("anthropic/claude-sonnet-4-5", "Hello there!"),
        }) as never,
      );

      const result = await adapter.run("say hello");

      expect(result.output).toBe("Hello there!");
      expect(result.adapter).toBe("opencode");
      expect(result.model).toBe("anthropic/claude-sonnet-4-5");
      expect(result.exitCode).toBe(0);
      expect(typeof result.latency).toBe("number");
    });
  });

  describe("checkAvailability()", () => {
    it("returns installed:false when binary is missing", async () => {
      mockedExeca.mockRejectedValueOnce(new Error("ENOENT: opencode not found") as never);

      const status = await adapter.checkAvailability();

      expect(status.installed).toBe(false);
      expect(status.authenticated).toBe(false);
      expect(status.version).toBeNull();
    });

    it("returns installed:true with parsed version", async () => {
      mockedExeca.mockResolvedValueOnce(
        makeExecaResult({ stdout: "opencode v1.3.17", exitCode: 0 }) as never,
      );

      const status = await adapter.checkAvailability();

      expect(status.installed).toBe(true);
      expect(status.authenticated).toBe(true);
      expect(status.version).toBe("1.3.17");
      expect(status.multiModel).toBe(true);
    });
  });
});
