import { describe, it, expect } from "vitest";
import { createOrchestrator } from "../bootstrap.js";
import { Orchestrator } from "@beautiful-ccg/core";

describe("createOrchestrator()", () => {
  it("returns an Orchestrator instance", () => {
    const orchestrator = createOrchestrator();
    expect(orchestrator).toBeInstanceOf(Orchestrator);
  });

  it("registers all 4 adapters in the registry", () => {
    const orchestrator = createOrchestrator();
    // status() calls checkAvailability on each registered adapter
    // We verify all 4 are present by checking status keys
    return orchestrator.status().then((status) => {
      const names = Object.keys(status);
      expect(names).toContain("copilot");
      expect(names).toContain("claude");
      expect(names).toContain("codex");
      expect(names).toContain("gemini");
      expect(names).toHaveLength(4);
    });
  });
});
