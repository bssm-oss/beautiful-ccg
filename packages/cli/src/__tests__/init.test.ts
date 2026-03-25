import { describe, it, expect, vi, afterEach } from "vitest";
import { detectCli } from "../commands/init.js";

// Mock child_process to control execFileSync behavior
vi.mock("child_process", () => ({
  execFileSync: vi.fn(),
}));

import { execFileSync } from "child_process";
const mockedExecFileSync = vi.mocked(execFileSync);

afterEach(() => {
  vi.clearAllMocks();
});

const claudeDef = {
  name: "claude",
  binary: "claude",
  headless: ["-p", "--output-format", "json"],
  costTier: "high" as const,
  capabilities: ["reasoning", "coding", "analysis"],
};

describe("detectCli()", () => {
  it("returns installed:true with version when CLI is found", () => {
    mockedExecFileSync.mockReturnValueOnce("1.2.3\n" as never);

    const result = detectCli(claudeDef);

    expect(result.installed).toBe(true);
    expect(result.version).toBe("1.2.3");
    expect(result.name).toBe("claude");
  });

  it("returns installed:false when CLI binary is missing", () => {
    mockedExecFileSync.mockImplementationOnce(() => {
      throw new Error("ENOENT: claude not found");
    });

    const result = detectCli(claudeDef);

    expect(result.installed).toBe(false);
    expect(result.version).toBeNull();
  });
});
