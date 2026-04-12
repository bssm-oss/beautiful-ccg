import { describe, it, expect } from "vitest";
import { createOrchestrator } from "../bootstrap.js";
import { Orchestrator } from "@beautiful-ccg/core";

describe("createOrchestrator()", () => {
  it("returns an Orchestrator instance", () => {
    const orchestrator = createOrchestrator();
    expect(orchestrator).toBeInstanceOf(Orchestrator);
  });

  it("registers all 5 adapters in the registry", () => {
    const orchestrator = createOrchestrator();
    // Use registry.getAll() to check adapter names without calling checkAvailability()
    const names = orchestrator.registry.getAll().map((a) => a.name);
    expect(names).toContain("copilot");
    expect(names).toContain("claude");
    expect(names).toContain("codex");
    expect(names).toContain("gemini");
    expect(names).toContain("opencode");
    expect(names).toHaveLength(5);
  });
});
