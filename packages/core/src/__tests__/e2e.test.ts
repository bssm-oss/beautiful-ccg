import { vi, describe, it, expect, beforeEach } from "vitest";
import type {
  ModelAdapter,
  CostTier,
  RunOptions,
  AdapterResult,
  AvailabilityStatus,
} from "@beautiful-ccg/adapter-base";
import { PipelineError } from "@beautiful-ccg/adapter-base";
import { Registry } from "../registry.js";
import { Orchestrator } from "../orchestrator.js";

// ─── Mock adapter factory ───────────────────────────────────────────────────

function createMockAdapter(
  name: string,
  costTier: CostTier,
  multiModel = false,
  response = `Response from ${name}`,
): ModelAdapter {
  return {
    name,
    costTier,
    multiModel,
    run: vi.fn(async (prompt: string, opts?: RunOptions): Promise<AdapterResult> => {
      const model = opts?.model ?? `${name}-default-model`;
      return {
        output:
          multiModel && opts?.model
            ? `Response from ${name} using model ${opts.model}`
            : response,
        model,
        adapter: name,
        latency: 100,
        exitCode: 0,
      };
    }),
    checkAvailability: vi.fn(async (): Promise<AvailabilityStatus> => ({
      installed: true,
      authenticated: true,
      version: "1.0.0",
      jsonOutput: true,
      multiModel,
      ...(multiModel ? { supportedModels: ["opus", "codex", "gemini"] } : {}),
    })),
    getSupportedModels: multiModel ? vi.fn(async () => ["opus", "codex", "gemini"]) : undefined,
  };
}

function runMock(adapter: ModelAdapter) {
  return adapter.run as ReturnType<typeof vi.fn>;
}

// ─── Scenario 1: Claude Code user + Copilot for coding/cheap tasks ──────────

describe("Scenario 1: claude(high) + copilot(medium, multiModel)", () => {
  let registry: Registry;
  let orch: Orchestrator;
  let claude: ModelAdapter;
  let copilot: ModelAdapter;

  beforeEach(() => {
    registry = new Registry();
    claude = createMockAdapter("claude", "high");
    copilot = createMockAdapter("copilot", "medium", true);
    registry.register(claude);
    registry.register(copilot);
    orch = new Orchestrator(registry);
  });

  it("quality-first strategy routes to claude (highest tier)", async () => {
    const result = await orch.run("write a complex algorithm", { strategy: "quality-first" });
    expect(result.adapter).toBe("claude");
    expect(runMock(claude)).toHaveBeenCalledOnce();
    expect(runMock(copilot)).not.toHaveBeenCalled();
  });

  it("cheap-first strategy routes to copilot (lower tier)", async () => {
    const result = await orch.run("summarize this text", { strategy: "cheap-first" });
    expect(result.adapter).toBe("copilot");
    expect(runMock(copilot)).toHaveBeenCalledOnce();
    expect(runMock(claude)).not.toHaveBeenCalled();
  });

  it("balanced strategy routes coding task to medium tier (copilot)", async () => {
    // "implement login" classifies as coding → prefers medium tier
    const result = await orch.run("implement login function", { strategy: "balanced" });
    expect(result.adapter).toBe("copilot");
    expect(runMock(copilot)).toHaveBeenCalledOnce();
  });
});

// ─── Scenario 2: Gemini(free) + Copilot(medium, multiModel) = $0 CCG ────────

describe("Scenario 2: gemini(free) + copilot(medium, multiModel) — $0 CCG", () => {
  let registry: Registry;
  let orch: Orchestrator;
  let gemini: ModelAdapter;
  let copilot: ModelAdapter;

  beforeEach(() => {
    registry = new Registry();
    gemini = createMockAdapter("gemini", "free");
    copilot = createMockAdapter("copilot", "medium", true);
    registry.register(gemini);
    registry.register(copilot);
    orch = new Orchestrator(registry);
  });

  it("cheap-first picks gemini (free tier)", async () => {
    const result = await orch.run("summarize this doc", { strategy: "cheap-first" });
    expect(result.adapter).toBe("gemini");
    expect(runMock(gemini)).toHaveBeenCalledOnce();
    expect(runMock(copilot)).not.toHaveBeenCalled();
  });

  it("quality-first picks copilot (higher tier than gemini)", async () => {
    const result = await orch.run("reason through this problem", { strategy: "quality-first" });
    expect(result.adapter).toBe("copilot");
    expect(runMock(copilot)).toHaveBeenCalledOnce();
    expect(runMock(gemini)).not.toHaveBeenCalled();
  });

  it("pipeline 'gemini:summarize -> copilot:opus:judge' executes sequentially and chains output", async () => {
    runMock(gemini).mockResolvedValueOnce({
      output: "gemini-summary",
      model: "gemini-default-model",
      adapter: "gemini",
      latency: 100,
      exitCode: 0,
    });
    runMock(copilot).mockResolvedValueOnce({
      output: "copilot-judgment",
      model: "opus",
      adapter: "copilot",
      latency: 100,
      exitCode: 0,
    });

    const result = await orch.pipeline("gemini:summarize -> copilot:opus:judge", {
      basePrompt: "original text",
    });

    expect(result.steps).toHaveLength(2);
    expect(result.steps[0].adapter).toBe("gemini");
    expect(result.steps[0].status).toBe("success");
    expect(result.steps[1].adapter).toBe("copilot");
    expect(result.steps[1].status).toBe("success");
    expect(result.finalOutput).toBe("copilot-judgment");

    // copilot step receives gemini's output as context
    const copilotCallPrompt = runMock(copilot).mock.calls[0][0] as string;
    expect(copilotCallPrompt).toContain("gemini-summary");

    // copilot called with model "opus"
    const copilotCallOpts = runMock(copilot).mock.calls[0][1] as RunOptions;
    expect(copilotCallOpts.model).toBe("opus");
  });
});

// ─── Scenario 3: All CLIs available — cross-CLI orchestration ────────────────

describe("Scenario 3: claude(high) + codex(medium) + gemini(free) + copilot(medium, multiModel)", () => {
  let registry: Registry;
  let orch: Orchestrator;
  let claude: ModelAdapter;
  let codex: ModelAdapter;
  let gemini: ModelAdapter;
  let copilot: ModelAdapter;

  beforeEach(() => {
    registry = new Registry();
    claude = createMockAdapter("claude", "high");
    codex = createMockAdapter("codex", "medium");
    gemini = createMockAdapter("gemini", "free");
    copilot = createMockAdapter("copilot", "medium", true);
    registry.register(claude);
    registry.register(codex);
    registry.register(gemini);
    registry.register(copilot);
    orch = new Orchestrator(registry);
  });

  it("cheap-first routes to gemini (free tier)", async () => {
    const result = await orch.run("quick summary", { strategy: "cheap-first" });
    expect(result.adapter).toBe("gemini");
    expect(runMock(gemini)).toHaveBeenCalledOnce();
  });

  it("quality-first routes to claude (high tier)", async () => {
    const result = await orch.run("deep reasoning task", { strategy: "quality-first" });
    expect(result.adapter).toBe("claude");
    expect(runMock(claude)).toHaveBeenCalledOnce();
  });

  it("3-step pipeline 'gemini:summarize -> codex:analyze -> claude:judge' calls all 3 in order", async () => {
    runMock(gemini).mockResolvedValueOnce({
      output: "gemini-summary",
      model: "gemini-model",
      adapter: "gemini",
      latency: 100,
      exitCode: 0,
    });
    runMock(codex).mockResolvedValueOnce({
      output: "codex-analysis",
      model: "codex-model",
      adapter: "codex",
      latency: 100,
      exitCode: 0,
    });
    runMock(claude).mockResolvedValueOnce({
      output: "claude-judgment",
      model: "claude-model",
      adapter: "claude",
      latency: 100,
      exitCode: 0,
    });

    const result = await orch.pipeline("gemini:summarize -> codex:analyze -> claude:judge", {
      basePrompt: "original document",
    });

    expect(result.steps).toHaveLength(3);
    expect(result.steps[0].adapter).toBe("gemini");
    expect(result.steps[1].adapter).toBe("codex");
    expect(result.steps[2].adapter).toBe("claude");
    expect(result.finalOutput).toBe("claude-judgment");

    expect(runMock(gemini)).toHaveBeenCalledOnce();
    expect(runMock(codex)).toHaveBeenCalledOnce();
    expect(runMock(claude)).toHaveBeenCalledOnce();
  });

  it("pipeline output chains: each step receives the previous step's output", async () => {
    runMock(gemini).mockResolvedValueOnce({
      output: "step1-output",
      model: "gemini-model",
      adapter: "gemini",
      latency: 100,
      exitCode: 0,
    });
    runMock(codex).mockResolvedValueOnce({
      output: "step2-output",
      model: "codex-model",
      adapter: "codex",
      latency: 100,
      exitCode: 0,
    });
    runMock(claude).mockResolvedValueOnce({
      output: "step3-output",
      model: "claude-model",
      adapter: "claude",
      latency: 100,
      exitCode: 0,
    });

    await orch.pipeline("gemini:summarize -> codex:analyze -> claude:judge", {
      basePrompt: "original",
    });

    // step 2 prompt must contain step 1 output
    const codexPrompt = runMock(codex).mock.calls[0][0] as string;
    expect(codexPrompt).toContain("step1-output");

    // step 3 prompt must contain step 2 output
    const claudePrompt = runMock(claude).mock.calls[0][0] as string;
    expect(claudePrompt).toContain("step2-output");
  });
});

// ─── Scenario 4: Copilot-only CCG (THE core scenario) ───────────────────────

describe("Scenario 4: copilot-only multiModel setup", () => {
  let registry: Registry;
  let orch: Orchestrator;
  let copilot: ModelAdapter;

  beforeEach(() => {
    registry = new Registry();
    copilot = createMockAdapter("copilot", "medium", true);
    registry.register(copilot);
    orch = new Orchestrator(registry);
  });

  it("orchestrator.run() works with a single multiModel adapter", async () => {
    const result = await orch.run("write a function");
    expect(result.adapter).toBe("copilot");
    expect(runMock(copilot)).toHaveBeenCalledOnce();
  });

  it("pipeline 'copilot:opus:reason -> copilot:codex:code -> copilot:gemini:summarize' calls copilot 3 times with different models", async () => {
    runMock(copilot)
      .mockResolvedValueOnce({
        output: "reasoning-output",
        model: "opus",
        adapter: "copilot",
        latency: 100,
        exitCode: 0,
      })
      .mockResolvedValueOnce({
        output: "code-output",
        model: "codex",
        adapter: "copilot",
        latency: 100,
        exitCode: 0,
      })
      .mockResolvedValueOnce({
        output: "summary-output",
        model: "gemini",
        adapter: "copilot",
        latency: 100,
        exitCode: 0,
      });

    const result = await orch.pipeline(
      "copilot:opus:reason -> copilot:codex:code -> copilot:gemini:summarize",
      { basePrompt: "build a feature" },
    );

    expect(result.steps).toHaveLength(3);
    expect(result.finalOutput).toBe("summary-output");

    // copilot.run called 3 times
    expect(runMock(copilot)).toHaveBeenCalledTimes(3);

    // each call uses a different model
    const call0Opts = runMock(copilot).mock.calls[0][1] as RunOptions;
    const call1Opts = runMock(copilot).mock.calls[1][1] as RunOptions;
    const call2Opts = runMock(copilot).mock.calls[2][1] as RunOptions;
    expect(call0Opts.model).toBe("opus");
    expect(call1Opts.model).toBe("codex");
    expect(call2Opts.model).toBe("gemini");
  });

  it("pipeline output chains correctly through all 3 copilot calls", async () => {
    runMock(copilot)
      .mockResolvedValueOnce({
        output: "reason-output",
        model: "opus",
        adapter: "copilot",
        latency: 100,
        exitCode: 0,
      })
      .mockResolvedValueOnce({
        output: "code-output",
        model: "codex",
        adapter: "copilot",
        latency: 100,
        exitCode: 0,
      })
      .mockResolvedValueOnce({
        output: "final-output",
        model: "gemini",
        adapter: "copilot",
        latency: 100,
        exitCode: 0,
      });

    await orch.pipeline(
      "copilot:opus:reason -> copilot:codex:code -> copilot:gemini:summarize",
      { basePrompt: "task" },
    );

    // step 2 receives step 1 output
    const step2Prompt = runMock(copilot).mock.calls[1][0] as string;
    expect(step2Prompt).toContain("reason-output");

    // step 3 receives step 2 output
    const step3Prompt = runMock(copilot).mock.calls[2][0] as string;
    expect(step3Prompt).toContain("code-output");
  });

  it("status() shows copilot with multiModel: true and supportedModels", async () => {
    const statuses = await orch.status();
    expect(statuses["copilot"]).toBeDefined();
    expect(statuses["copilot"].multiModel).toBe(true);
    expect(statuses["copilot"].supportedModels).toEqual(["opus", "codex", "gemini"]);
  });
});

// ─── Safety tests ────────────────────────────────────────────────────────────

describe("Safety: error handling and edge cases", () => {
  it("pipeline with unknown adapter throws PipelineError with partial results", async () => {
    const registry = new Registry();
    const gemini = createMockAdapter("gemini", "free");
    registry.register(gemini);

    runMock(gemini).mockResolvedValueOnce({
      output: "gemini-output",
      model: "gemini-model",
      adapter: "gemini",
      latency: 100,
      exitCode: 0,
    });

    const orch = new Orchestrator(registry);

    // "nonexistent" adapter doesn't exist — pipeline should throw PipelineError
    await expect(
      orch.pipeline("gemini:summarize -> nonexistent:analyze", { basePrompt: "test" }),
    ).rejects.toThrow(PipelineError);

    await expect(
      orch.pipeline("gemini:summarize -> nonexistent:analyze", { basePrompt: "test" }),
    ).rejects.toMatchObject({
      step: 1,
      partialResults: expect.arrayContaining([
        expect.objectContaining({ adapter: "nonexistent", status: "error" }),
      ]),
    });
  });

  it("primary adapter failure with fallback succeeds", async () => {
    const registry = new Registry();
    const gemini = createMockAdapter("gemini", "free");
    const claude = createMockAdapter("claude", "high");
    registry.register(gemini);
    registry.register(claude);

    // gemini fails on first call
    runMock(gemini).mockRejectedValueOnce(new Error("gemini unavailable"));

    const orch = new Orchestrator(registry);
    // cheap-first: gemini primary, claude fallback
    const result = await orch.run("do something", { strategy: "cheap-first" });

    expect(result.adapter).toBe("claude");
    expect(runMock(gemini)).toHaveBeenCalledOnce();
    expect(runMock(claude)).toHaveBeenCalledOnce();
  });

  it("empty pipeline string throws an error", async () => {
    const registry = new Registry();
    const orch = new Orchestrator(registry);

    await expect(orch.pipeline("", { basePrompt: "test" })).rejects.toThrow();
  });
});
