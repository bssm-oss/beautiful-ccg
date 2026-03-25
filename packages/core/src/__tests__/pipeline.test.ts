import { describe, it, expect, vi } from "vitest";
import type { ModelAdapter, AdapterResult, AvailabilityStatus, CostTier } from "@bccg/adapter-base";
import { PipelineError } from "@bccg/adapter-base";
import { Registry } from "../registry.js";
import { runPipeline } from "../pipeline.js";
import type { ParsedStep } from "../steps-parser.js";

function makeResult(adapter: string, output: string): AdapterResult {
  return { adapter, model: "test-model", output, latency: 10, exitCode: 0 };
}

function createMockAdapter(name: string, costTier: CostTier = "medium"): ModelAdapter {
  const status: AvailabilityStatus = {
    installed: true,
    authenticated: true,
    version: "1.0",
    jsonOutput: true,
    multiModel: false,
  };
  return {
    name,
    costTier,
    multiModel: false,
    run: vi.fn().mockResolvedValue(makeResult(name, `output-from-${name}`)),
    checkAvailability: vi.fn().mockResolvedValue(status),
  };
}

describe("runPipeline()", () => {
  it("runs 3-step sequential pipeline passing output between steps", async () => {
    const registry = new Registry();
    const gemini = createMockAdapter("gemini", "free");
    const codex = createMockAdapter("codex", "medium");
    const claude = createMockAdapter("claude", "high");
    registry.register(gemini);
    registry.register(codex);
    registry.register(claude);

    // Override mocks so each step returns distinct output
    (gemini.run as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeResult("gemini", "gemini-output"),
    );
    (codex.run as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeResult("codex", "codex-output"),
    );
    (claude.run as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeResult("claude", "claude-output"),
    );

    const steps: ParsedStep[] = [
      { adapter: "gemini", action: "summarize" },
      { adapter: "codex", action: "analyze" },
      { adapter: "claude", action: "judge" },
    ];

    const result = await runPipeline(steps, "base prompt", registry);

    expect(result.steps).toHaveLength(3);
    expect(result.finalOutput).toBe("claude-output");

    // Step 1: receives base prompt with action prefix
    const geminiCall = (gemini.run as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(geminiCall).toContain("summarize");
    expect(geminiCall).toContain("base prompt");

    // Step 2: receives gemini-output as context
    const codexCall = (codex.run as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(codexCall).toContain("analyze");
    expect(codexCall).toContain("gemini-output");

    // Step 3 (last): gets synthesis instruction
    const claudeCall = (claude.run as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(claudeCall).toContain("synthesize");
    expect(claudeCall).toContain("codex-output");
  });

  it("throws PipelineError with partial results when middle step fails", async () => {
    const registry = new Registry();
    const gemini = createMockAdapter("gemini", "free");
    const codex = createMockAdapter("codex", "medium");
    const claude = createMockAdapter("claude", "high");
    registry.register(gemini);
    registry.register(codex);
    registry.register(claude);

    (gemini.run as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeResult("gemini", "gemini-output"),
    );
    (codex.run as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("codex failed"));

    const steps: ParsedStep[] = [
      { adapter: "gemini", action: "summarize" },
      { adapter: "codex", action: "analyze" },
      { adapter: "claude", action: "judge" },
    ];

    await expect(runPipeline(steps, "base prompt", registry)).rejects.toThrow(PipelineError);
    // Reset mocks for second assertion
    (gemini.run as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeResult("gemini", "gemini-output"),
    );
    (codex.run as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("codex failed"));
    await expect(runPipeline(steps, "base prompt", registry)).rejects.toMatchObject({
      step: 1,
      partialResults: expect.arrayContaining([
        expect.objectContaining({ status: "success", adapter: "gemini" }),
        expect.objectContaining({ status: "error", error: "codex failed" }),
      ]),
    });
  });

  it("last step receives synthesis instruction when multi-step", async () => {
    const registry = new Registry();
    const gemini = createMockAdapter("gemini", "free");
    const claude = createMockAdapter("claude", "high");
    registry.register(gemini);
    registry.register(claude);

    (gemini.run as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeResult("gemini", "gemini-output"),
    );
    (claude.run as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeResult("claude", "final-output"),
    );

    const steps: ParsedStep[] = [
      { adapter: "gemini", action: "summarize" },
      { adapter: "claude", action: "judge" },
    ];

    await runPipeline(steps, "my prompt", registry);

    const claudeCall = (claude.run as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(claudeCall).toContain("synthesize a final answer");
  });

  it("throws PipelineError with partial results for unknown adapter", async () => {
    const registry = new Registry();
    const steps: ParsedStep[] = [{ adapter: "nonexistent", action: "analyze" }];

    await expect(runPipeline(steps, "prompt", registry)).rejects.toThrow(PipelineError);
    await expect(runPipeline(steps, "prompt", registry)).rejects.toMatchObject({
      step: 0,
      partialResults: expect.arrayContaining([
        expect.objectContaining({ status: "error", adapter: "nonexistent" }),
      ]),
    });
  });

  it("single step pipeline works without synthesis instruction", async () => {
    const registry = new Registry();
    const gemini = createMockAdapter("gemini", "free");
    registry.register(gemini);

    (gemini.run as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeResult("gemini", "single-output"),
    );

    const steps: ParsedStep[] = [{ adapter: "gemini", action: "summarize" }];
    const result = await runPipeline(steps, "hello", registry);

    expect(result.steps).toHaveLength(1);
    expect(result.finalOutput).toBe("single-output");

    const call = (gemini.run as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(call).not.toContain("synthesize");
  });
});
