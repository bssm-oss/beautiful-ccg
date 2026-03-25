import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CopilotAdapter } from "../index.js";
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
    `{"type":"session.tools_updated","data":{"model":"${model}"}}`,
    `{"type":"assistant.message","data":{"content":${JSON.stringify(content)},"toolRequests":[]}}`,
    `{"type":"result","exitCode":${exitCode},"usage":{"premiumRequests":1,"totalApiDurationMs":1000}}`,
  ].join("\n");
}

describe("CopilotAdapter", () => {
  let adapter: CopilotAdapter;

  beforeEach(() => {
    adapter = new CopilotAdapter();
    vi.clearAllMocks();
    delete process.env.BCCG_DEPTH;
  });

  afterEach(() => {
    delete process.env.BCCG_DEPTH;
  });

  describe("run()", () => {
    it("builds correct command args without model option", async () => {
      mockedExeca.mockResolvedValueOnce(
        makeExecaResult({ stdout: makeJsonlOutput("claude-sonnet-4.5", "response") }) as never,
      );

      await adapter.run("hello world");

      expect(mockedExeca).toHaveBeenCalledWith(
        "copilot",
        ["-p", "hello world", "-s", "--output-format", "json"],
        expect.objectContaining({ reject: false }),
      );
    });

    it("adds --allow-all-tools only when allowAutonomous is true", async () => {
      mockedExeca.mockResolvedValueOnce(
        makeExecaResult({ stdout: makeJsonlOutput("claude-sonnet-4.5", "response") }) as never,
      );

      await adapter.run("hello", { allowAutonomous: true });

      expect(mockedExeca).toHaveBeenCalledWith(
        "copilot",
        ["-p", "hello", "-s", "--output-format", "json", "--allow-all-tools"],
        expect.objectContaining({ reject: false }),
      );
    });

    it("adds --model flag when options.model is provided", async () => {
      mockedExeca.mockResolvedValueOnce(
        makeExecaResult({ stdout: makeJsonlOutput("claude-opus-4.6", "response") }) as never,
      );

      await adapter.run("hello", { model: "claude-opus-4.6" });

      expect(mockedExeca).toHaveBeenCalledWith(
        "copilot",
        ["-p", "hello", "-s", "--output-format", "json", "--model", "claude-opus-4.6"],
        expect.objectContaining({ reject: false }),
      );
    });

    it("resolves model aliases before passing to CLI", async () => {
      mockedExeca.mockResolvedValueOnce(
        makeExecaResult({ stdout: makeJsonlOutput("claude-opus-4.6", "response") }) as never,
      );

      await adapter.run("hello", { model: "opus" });

      expect(mockedExeca).toHaveBeenCalledWith(
        "copilot",
        ["-p", "hello", "-s", "--output-format", "json", "--model", "claude-opus-4.6"],
        expect.objectContaining({ reject: false }),
      );
    });

    it("sets BCCG_DEPTH env correctly, incrementing from current value", async () => {
      process.env.BCCG_DEPTH = "2";
      mockedExeca.mockResolvedValueOnce(
        makeExecaResult({ stdout: makeJsonlOutput("claude-sonnet-4.5", "response") }) as never,
      );

      await adapter.run("hello");

      const callArgs = mockedExeca.mock.calls[0];
      const opts = callArgs[2] as Record<string, unknown>;
      const env = opts.env as Record<string, string>;
      expect(env.BCCG_DEPTH).toBe("3");
    });

    it("sets BCCG_DEPTH to 1 when not previously set", async () => {
      mockedExeca.mockResolvedValueOnce(
        makeExecaResult({ stdout: makeJsonlOutput("claude-sonnet-4.5", "response") }) as never,
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
          stdout: makeJsonlOutput("claude-sonnet-4.5", "", 1),
          exitCode: 1,
        }) as never,
      );

      await expect(adapter.run("hello")).rejects.toThrow(AdapterError);
    });

    it("returns correct AdapterResult on success", async () => {
      mockedExeca.mockResolvedValueOnce(
        makeExecaResult({
          stdout: makeJsonlOutput("claude-sonnet-4.5", "Hello there!"),
        }) as never,
      );

      const result = await adapter.run("say hello");

      expect(result.output).toBe("Hello there!");
      expect(result.model).toBe("claude-sonnet-4.5");
      expect(result.adapter).toBe("copilot");
      expect(result.exitCode).toBe(0);
      expect(typeof result.latency).toBe("number");
    });
  });

  describe("checkAvailability()", () => {
    it("returns installed:true and parses version when binary exists", async () => {
      mockedExeca.mockResolvedValueOnce(
        makeExecaResult({ stdout: "1.0.9", exitCode: 0 }) as never,
      );

      const status = await adapter.checkAvailability();

      expect(status.installed).toBe(true);
      expect(status.authenticated).toBe(true);
      expect(status.version).toBe("1.0.9");
      expect(status.jsonOutput).toBe(true);
      expect(status.multiModel).toBe(true);
      expect(status.supportedModels).toBeDefined();
    });

    it("returns installed:false when binary is missing", async () => {
      mockedExeca.mockRejectedValueOnce(new Error("ENOENT: copilot not found") as never);

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
