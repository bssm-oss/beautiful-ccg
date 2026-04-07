import { describe, it, expect, vi } from "vitest";
import type { ModelAdapter, AdapterResult, AvailabilityStatus, CostTier } from "@beautiful-ccg/adapter-base";
import { Registry } from "../registry.js";
import { Orchestrator } from "../orchestrator.js";

function makeResult(adapter: string, output = "output"): AdapterResult {
  return { adapter, model: "test-model", output, latency: 10, exitCode: 0 };
}

function createMockAdapter(
  name: string,
  costTier: CostTier = "medium",
  available = true,
): ModelAdapter {
  const status: AvailabilityStatus = {
    installed: available,
    authenticated: available,
    version: available ? "1.0" : null,
    jsonOutput: true,
    multiModel: false,
  };
  return {
    name,
    costTier,
    multiModel: false,
    run: vi.fn().mockResolvedValue(makeResult(name)),
    checkAvailability: vi.fn().mockResolvedValue(status),
  };
}

describe("Orchestrator", () => {
  it("run() with specific adapter calls that adapter directly", async () => {
    const registry = new Registry();
    const claude = createMockAdapter("claude", "high");
    const gemini = createMockAdapter("gemini", "free");
    registry.register(claude);
    registry.register(gemini);

    const orch = new Orchestrator(registry);
    const result = await orch.run("hello", { adapter: "claude" });

    expect(result.adapter).toBe("claude");
    expect((claude.run as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
    expect((gemini.run as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(0);
  });

  it("run() without adapter routes via strategy", async () => {
    const registry = new Registry();
    // cheap-first should pick free tier
    const gemini = createMockAdapter("gemini", "free");
    const claude = createMockAdapter("claude", "high");
    registry.register(gemini);
    registry.register(claude);

    const orch = new Orchestrator(registry);
    const result = await orch.run("do something", { strategy: "cheap-first" });

    expect(result.adapter).toBe("gemini");
    expect((gemini.run as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
  });

  it("run() falls back to secondary adapter on primary failure", async () => {
    const registry = new Registry();
    const gemini = createMockAdapter("gemini", "free");
    const claude = createMockAdapter("claude", "high");
    registry.register(gemini);
    registry.register(claude);

    // gemini fails
    (gemini.run as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("gemini down"));

    const orch = new Orchestrator(registry);
    // cheap-first picks gemini with claude as fallback
    const result = await orch.run("do something", { strategy: "cheap-first" });

    expect(result.adapter).toBe("claude");
    expect((claude.run as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
  });

  it("pipeline() parses DSL and executes steps", async () => {
    const registry = new Registry();
    const gemini = createMockAdapter("gemini", "free");
    const claude = createMockAdapter("claude", "high");
    registry.register(gemini);
    registry.register(claude);

    (gemini.run as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeResult("gemini", "gemini-output"),
    );
    (claude.run as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeResult("claude", "claude-output"),
    );

    const orch = new Orchestrator(registry);
    const result = await orch.pipeline("gemini:summarize -> claude:judge", {
      basePrompt: "hello",
    });

    expect(result.steps).toHaveLength(2);
    expect(result.finalOutput).toBe("claude-output");
  });

  it("run() with parallel strategy calls all adapters concurrently", async () => {
    const registry = new Registry();
    const gemini = createMockAdapter("gemini", "free");
    const claude = createMockAdapter("claude", "high");
    const codex = createMockAdapter("codex", "medium");
    registry.register(gemini);
    registry.register(claude);
    registry.register(codex);

    (gemini.run as ReturnType<typeof vi.fn>).mockResolvedValue(makeResult("gemini", "gemini-out"));
    (claude.run as ReturnType<typeof vi.fn>).mockResolvedValue(makeResult("claude", "claude-out"));
    (codex.run as ReturnType<typeof vi.fn>).mockResolvedValue(makeResult("codex", "codex-out"));

    const orch = new Orchestrator(registry);
    const result = await orch.run("test", { strategy: "parallel" });

    expect(result.model).toBe("parallel");
    expect(result.adapter).toContain("gemini");
    expect(result.adapter).toContain("claude");
    expect(result.adapter).toContain("codex");
    expect(result.output).toContain("gemini-out");
    expect(result.output).toContain("claude-out");
    expect(result.output).toContain("codex-out");
    expect((gemini.run as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
    expect((claude.run as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
    expect((codex.run as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
  });

  it("run() with parallel strategy tolerates partial failures", async () => {
    const registry = new Registry();
    const gemini = createMockAdapter("gemini", "free");
    const claude = createMockAdapter("claude", "high");
    registry.register(gemini);
    registry.register(claude);

    (gemini.run as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("gemini down"));
    (claude.run as ReturnType<typeof vi.fn>).mockResolvedValue(makeResult("claude", "claude-out"));

    const orch = new Orchestrator(registry);
    const result = await orch.run("test", { strategy: "parallel" });

    expect(result.output).toContain("claude-out");
    expect(result.output).not.toContain("gemini");
  });

  it("run() with parallel strategy throws when all adapters fail", async () => {
    const registry = new Registry();
    const gemini = createMockAdapter("gemini", "free");
    const claude = createMockAdapter("claude", "high");
    registry.register(gemini);
    registry.register(claude);

    (gemini.run as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("fail"));
    (claude.run as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("fail"));

    const orch = new Orchestrator(registry);
    await expect(orch.run("test", { strategy: "parallel" })).rejects.toThrow("All parallel adapters failed");
  });

  it("run() uses config defaults.strategy when no strategy specified", async () => {
    const registry = new Registry();
    const gemini = createMockAdapter("gemini", "free");
    const claude = createMockAdapter("claude", "high");
    registry.register(gemini);
    registry.register(claude);

    const config = {
      version: 1,
      defaults: { strategy: "cheap-first" as const, timeout: 60000 },
      adapters: {},
    };

    const orch = new Orchestrator(registry, config);
    const result = await orch.run("do something");

    // cheap-first should pick gemini (free tier)
    expect(result.adapter).toBe("gemini");
  });

  it("status() returns availability for all registered adapters", async () => {
    const registry = new Registry();
    const claude = createMockAdapter("claude", "high", true);
    const codex = createMockAdapter("codex", "medium", false);
    registry.register(claude);
    registry.register(codex);

    const orch = new Orchestrator(registry);
    const statuses = await orch.status();

    expect(statuses["claude"]).toBeDefined();
    expect(statuses["claude"].installed).toBe(true);
    expect(statuses["codex"]).toBeDefined();
    expect(statuses["codex"].installed).toBe(false);
  });
});
