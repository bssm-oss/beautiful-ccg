import { describe, it, expect, vi } from "vitest";
import type { ModelAdapter, CostTier, BccgConfig } from "@beautiful-ccg/adapter-base";
import { route } from "../router.js";

function createMockAdapter(name: string, costTier: CostTier, multiModel = false): ModelAdapter {
  return {
    name,
    costTier,
    multiModel,
    run: vi.fn(),
    checkAvailability: vi.fn().mockResolvedValue({
      installed: true,
      authenticated: true,
      version: "1.0",
      jsonOutput: true,
      multiModel,
    }),
  };
}

describe("route()", () => {
  it("cheap-first with gemini(free) + claude(high) → picks gemini", () => {
    const gemini = createMockAdapter("gemini", "free");
    const claude = createMockAdapter("claude", "high");
    const plan = route("do something", "cheap-first", [gemini, claude]);
    expect(plan.steps[0].adapter).toBe("gemini");
    expect(plan.strategy).toBe("cheap-first");
  });

  it("quality-first with gemini(free) + claude(high) → picks claude", () => {
    const gemini = createMockAdapter("gemini", "free");
    const claude = createMockAdapter("claude", "high");
    const plan = route("do something", "quality-first", [gemini, claude]);
    expect(plan.steps[0].adapter).toBe("claude");
    expect(plan.strategy).toBe("quality-first");
  });

  it('balanced with "review" prompt → picks high tier', () => {
    const gemini = createMockAdapter("gemini", "free");
    const claude = createMockAdapter("claude", "high");
    const plan = route("review this PR carefully", "balanced", [gemini, claude]);
    expect(plan.steps[0].adapter).toBe("claude");
    expect(plan.strategy).toBe("balanced");
  });

  it('balanced with "summarize" prompt → picks free tier', () => {
    const gemini = createMockAdapter("gemini", "free");
    const claude = createMockAdapter("claude", "high");
    const plan = route("summarize this document", "balanced", [gemini, claude]);
    expect(plan.steps[0].adapter).toBe("gemini");
    expect(plan.strategy).toBe("balanced");
  });

  it("parallel → returns all adapters", () => {
    const gemini = createMockAdapter("gemini", "free");
    const claude = createMockAdapter("claude", "high");
    const codex = createMockAdapter("codex", "medium");
    const plan = route("do something", "parallel", [gemini, claude, codex]);
    expect(plan.steps).toHaveLength(3);
    expect(plan.strategy).toBe("parallel");
    const names = plan.steps.map(s => s.adapter);
    expect(names).toContain("gemini");
    expect(names).toContain("claude");
    expect(names).toContain("codex");
  });

  it("Copilot-only scenario: single multiModel adapter → still returns valid plan", () => {
    const copilot = createMockAdapter("copilot", "medium", true);
    const plan = route("implement a feature", "balanced", [copilot]);
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0].adapter).toBe("copilot");
    expect(plan.strategy).toBe("balanced");
  });

  it("fallback is set when multiple adapters available (cheap-first)", () => {
    const gemini = createMockAdapter("gemini", "free");
    const claude = createMockAdapter("claude", "high");
    const plan = route("do something", "cheap-first", [gemini, claude]);
    expect(plan.steps[0].fallback).toBeDefined();
    expect(plan.steps[0].fallback).toBe("claude");
  });

  it("fallback is set when multiple adapters available (quality-first)", () => {
    const gemini = createMockAdapter("gemini", "free");
    const claude = createMockAdapter("claude", "high");
    const plan = route("do something", "quality-first", [gemini, claude]);
    expect(plan.steps[0].fallback).toBeDefined();
    expect(plan.steps[0].fallback).toBe("gemini");
  });

  it("throws when no adapters available", () => {
    expect(() => route("do something", "balanced", [])).toThrow("No available adapters");
  });

  describe("config routing rules", () => {
    it("uses config rule when condition matches", () => {
      const gemini = createMockAdapter("gemini", "free");
      const claude = createMockAdapter("claude", "high");
      const config: BccgConfig = {
        version: 1,
        defaults: { strategy: "balanced", timeout: 60000 },
        adapters: {},
        routing: {
          rules: [
            { condition: { type: "reasoning" }, target: "claude" },
          ],
        },
      };
      const plan = route("review this carefully", "balanced", [gemini, claude], config);
      expect(plan.steps[0].adapter).toBe("claude");
    });

    it("falls through to strategy when no rule matches", () => {
      const gemini = createMockAdapter("gemini", "free");
      const claude = createMockAdapter("claude", "high");
      const config: BccgConfig = {
        version: 1,
        defaults: { strategy: "balanced", timeout: 60000 },
        adapters: {},
        routing: {
          rules: [
            { condition: { type: "coding" }, target: "codex" },
          ],
        },
      };
      // "summarize" won't match "coding" rule
      const plan = route("summarize this", "cheap-first", [gemini, claude], config);
      expect(plan.steps[0].adapter).toBe("gemini"); // cheap-first picks free tier
    });

    it("rule with fallback sets fallback on step", () => {
      const gemini = createMockAdapter("gemini", "free");
      const claude = createMockAdapter("claude", "high");
      const config: BccgConfig = {
        version: 1,
        defaults: { strategy: "balanced", timeout: 60000 },
        adapters: {},
        routing: {
          rules: [
            { condition: { type: "reasoning" }, target: "claude", fallback: "gemini" },
          ],
        },
      };
      const plan = route("analyze this bug", "balanced", [gemini, claude], config);
      expect(plan.steps[0].adapter).toBe("claude");
      expect(plan.steps[0].fallback).toBe("gemini");
    });

    it("skips rules for parallel strategy", () => {
      const gemini = createMockAdapter("gemini", "free");
      const claude = createMockAdapter("claude", "high");
      const config: BccgConfig = {
        version: 1,
        defaults: { strategy: "balanced", timeout: 60000 },
        adapters: {},
        routing: { rules: [{ condition: { type: "reasoning" }, target: "claude" }] },
      };
      const plan = route("review this", "parallel", [gemini, claude], config);
      expect(plan.steps).toHaveLength(2); // parallel ignores rules
    });
  });
});
