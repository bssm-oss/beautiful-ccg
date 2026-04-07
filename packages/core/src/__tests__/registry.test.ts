import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ModelAdapter, AvailabilityStatus, CostTier } from "@beautiful-ccg/adapter-base";
import { BCCG_HOST_CLI_ENV } from "@beautiful-ccg/adapter-base";
import { Registry } from "../registry.js";

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
    run: vi.fn(),
    checkAvailability: vi.fn().mockResolvedValue(status),
  };
}

describe("Registry", () => {
  let registry: Registry;

  beforeEach(() => {
    registry = new Registry();
  });

  it("register() and get() work", () => {
    const adapter = createMockAdapter("claude");
    registry.register(adapter);
    expect(registry.get("claude")).toBe(adapter);
  });

  it("get() returns undefined for unknown adapter", () => {
    expect(registry.get("unknown")).toBeUndefined();
  });

  it("getAll() returns all registered adapters", () => {
    const a = createMockAdapter("claude");
    const b = createMockAdapter("codex");
    registry.register(a);
    registry.register(b);
    expect(registry.getAll()).toHaveLength(2);
    expect(registry.getAll()).toContain(a);
    expect(registry.getAll()).toContain(b);
  });

  it("getAvailable() filters by installed && authenticated", async () => {
    const available = createMockAdapter("claude", "high", true);
    const unavailable = createMockAdapter("codex", "medium", false);
    registry.register(available);
    registry.register(unavailable);
    const result = await registry.getAvailable();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("claude");
  });

  it("getAvailable() excludes host CLI (BCCG_HOST_CLI env)", async () => {
    const original = process.env[BCCG_HOST_CLI_ENV];
    process.env[BCCG_HOST_CLI_ENV] = "claude";

    const claude = createMockAdapter("claude", "high", true);
    const codex = createMockAdapter("codex", "medium", true);
    registry.register(claude);
    registry.register(codex);

    const result = await registry.getAvailable();
    expect(result.map(a => a.name)).not.toContain("claude");
    expect(result.map(a => a.name)).toContain("codex");

    if (original === undefined) {
      delete process.env[BCCG_HOST_CLI_ENV];
    } else {
      process.env[BCCG_HOST_CLI_ENV] = original;
    }
  });

  it("getAvailable() returns empty array when nothing available", async () => {
    const unavailable = createMockAdapter("claude", "high", false);
    registry.register(unavailable);
    const result = await registry.getAvailable();
    expect(result).toHaveLength(0);
  });
});
