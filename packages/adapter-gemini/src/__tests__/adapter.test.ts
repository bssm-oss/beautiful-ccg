import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GeminiAdapter } from "../index.js";
import { AdapterError } from "@beautiful-ccg/adapter-base";

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

function makeGeminiJsonOutput(model: string, content: string): string {
  return JSON.stringify({
    session_id: "test-session-id",
    response: content,
    stats: {
      models: {
        "gemini-2.5-flash-lite": {
          api: { totalRequests: 1, totalLatencyMs: 100 },
          roles: { utility_router: {} },
        },
        [model]: {
          api: { totalRequests: 1, totalLatencyMs: 200 },
          roles: { main: {} },
        },
      },
    },
  });
}

describe("GeminiAdapter", () => {
  let adapter: GeminiAdapter;

  beforeEach(() => {
    adapter = new GeminiAdapter();
    vi.clearAllMocks();
    delete process.env.BCCG_DEPTH;
  });

  afterEach(() => {
    delete process.env.BCCG_DEPTH;
  });

  describe("run()", () => {
    it("builds correct args ['-p', prompt, '--output-format', 'json']", async () => {
      mockedExeca.mockResolvedValueOnce(
        makeExecaResult({ stdout: makeGeminiJsonOutput("gemini-3-flash-preview", "response") }) as never,
      );

      await adapter.run("hello world");

      expect(mockedExeca).toHaveBeenCalledWith(
        "gemini",
        ["-p", "hello world", "--output-format", "json"],
        expect.objectContaining({ reject: false }),
      );
    });

    it("sets BCCG_DEPTH env, incrementing from current value", async () => {
      process.env.BCCG_DEPTH = "2";
      mockedExeca.mockResolvedValueOnce(
        makeExecaResult({ stdout: makeGeminiJsonOutput("gemini-3-flash-preview", "response") }) as never,
      );

      await adapter.run("hello");

      const callArgs = mockedExeca.mock.calls[0];
      const opts = (callArgs as unknown[])[2] as Record<string, unknown>;
      const env = opts.env as Record<string, string>;
      expect(env.BCCG_DEPTH).toBe("3");
    });

    it("sets BCCG_DEPTH to 1 when not previously set", async () => {
      mockedExeca.mockResolvedValueOnce(
        makeExecaResult({ stdout: makeGeminiJsonOutput("gemini-3-flash-preview", "response") }) as never,
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
        makeExecaResult({ exitCode: 1, stdout: "", stderr: "error" }) as never,
      );

      await expect(adapter.run("hello")).rejects.toThrow(AdapterError);
    });

    it("returns correct AdapterResult on success", async () => {
      mockedExeca.mockResolvedValueOnce(
        makeExecaResult({
          stdout: makeGeminiJsonOutput("gemini-3-flash-preview", "Hello there!"),
        }) as never,
      );

      const result = await adapter.run("say hello");

      expect(result.output).toBe("Hello there!");
      expect(result.model).toBe("gemini-3-flash-preview");
      expect(result.adapter).toBe("gemini");
      expect(result.exitCode).toBe(0);
      expect(typeof result.latency).toBe("number");
    });
  });

  describe("checkAvailability()", () => {
    it("parses version '0.31.0' when binary exists", async () => {
      mockedExeca.mockResolvedValueOnce(
        makeExecaResult({ stdout: "0.31.0", exitCode: 0 }) as never,
      );

      const status = await adapter.checkAvailability();

      expect(status.installed).toBe(true);
      expect(status.authenticated).toBe(true);
      expect(status.version).toBe("0.31.0");
      expect(status.jsonOutput).toBe(true);
      expect(status.multiModel).toBe(false);
    });

    it("returns installed:false when binary is missing (throws)", async () => {
      mockedExeca.mockRejectedValueOnce(new Error("ENOENT: gemini not found") as never);

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
