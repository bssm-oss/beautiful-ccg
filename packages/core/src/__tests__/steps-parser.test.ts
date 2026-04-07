import { describe, it, expect } from "vitest";
import { MAX_PIPELINE_STEPS } from "@beautiful-ccg/adapter-base";
import { parseSteps } from "../steps-parser.js";

describe("parseSteps()", () => {
  it("parses 3 adapter:action steps", () => {
    const steps = parseSteps("gemini:summarize -> codex:analyze -> claude:judge");
    expect(steps).toHaveLength(3);
    expect(steps[0]).toEqual({ adapter: "gemini", action: "summarize" });
    expect(steps[1]).toEqual({ adapter: "codex", action: "analyze" });
    expect(steps[2]).toEqual({ adapter: "claude", action: "judge" });
  });

  it("parses adapter:model:action steps", () => {
    const steps = parseSteps("copilot:opus:reason -> copilot:codex:code");
    expect(steps).toHaveLength(2);
    expect(steps[0]).toEqual({ adapter: "copilot", model: "opus", action: "reason" });
    expect(steps[1]).toEqual({ adapter: "copilot", model: "codex", action: "code" });
  });

  it("parses action-only steps (auto-route)", () => {
    const steps = parseSteps("summarize -> analyze");
    expect(steps).toHaveLength(2);
    expect(steps[0]).toEqual({ action: "summarize" });
    expect(steps[1]).toEqual({ action: "analyze" });
  });

  it("parses unicode → separator", () => {
    const steps = parseSteps("gemini:summarize → claude:judge");
    expect(steps).toHaveLength(2);
    expect(steps[0].adapter).toBe("gemini");
    expect(steps[1].adapter).toBe("claude");
  });

  it("throws on empty string", () => {
    expect(() => parseSteps("")).toThrow("Empty pipeline steps");
  });

  it("throws when exceeding MAX_PIPELINE_STEPS", () => {
    const tooMany = Array.from({ length: MAX_PIPELINE_STEPS + 1 }, (_, i) => `step${i}`).join(
      " -> ",
    );
    expect(() => parseSteps(tooMany)).toThrow(`Pipeline exceeds maximum ${MAX_PIPELINE_STEPS} steps`);
  });

  it("parses a single step", () => {
    const steps = parseSteps("gemini:summarize");
    expect(steps).toHaveLength(1);
    expect(steps[0]).toEqual({ adapter: "gemini", action: "summarize" });
  });
});
