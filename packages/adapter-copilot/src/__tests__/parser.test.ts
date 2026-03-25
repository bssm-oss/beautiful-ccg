import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseCopilotOutput } from "../parser.js";

// vitest runs from repo root, so process.cwd() is the monorepo root
const fixturesDir = join(process.cwd(), "fixtures/copilot");

function readFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), "utf-8");
}

describe("parseCopilotOutput", () => {
  it("parses basic output and extracts content", () => {
    const stdout = readFixture("basic-json.txt");
    const result = parseCopilotOutput(stdout);
    expect(result.content).toContain("Hello! I'm GitHub Copilot CLI");
    expect(result.exitCode).toBe(0);
    expect(result.model).toBe("claude-sonnet-4.5");
  });

  it("parses model-switch output and extracts the correct model", () => {
    const stdout = readFixture("model-switch-json.txt");
    const result = parseCopilotOutput(stdout);
    expect(result.model).toBe("claude-sonnet-4");
    expect(result.content).toBeTruthy();
    expect(result.exitCode).toBe(0);
  });

  it("handles empty stdout without crashing", () => {
    const result = parseCopilotOutput("");
    expect(result.content).toBe("");
    expect(result.model).toBe("");
    expect(result.exitCode).toBe(0);
  });

  it("handles malformed JSONL lines gracefully", () => {
    const stdout = [
      '{"type":"session.tools_updated","data":{"model":"claude-sonnet-4.5"}}',
      "this is not json {{{",
      "also bad",
      '{"type":"assistant.message","data":{"content":"valid content","toolRequests":[]}}',
      '{"type":"result","exitCode":0,"usage":{"premiumRequests":1,"totalApiDurationMs":1000}}',
    ].join("\n");

    const result = parseCopilotOutput(stdout);
    expect(result.content).toBe("valid content");
    expect(result.model).toBe("claude-sonnet-4.5");
    expect(result.exitCode).toBe(0);
  });

  it("falls back to message_delta concatenation when no assistant.message is present", () => {
    const stdout = [
      '{"type":"session.tools_updated","data":{"model":"claude-sonnet-4.5"}}',
      '{"type":"assistant.message_delta","data":{"messageId":"abc","deltaContent":"Hello"}}',
      '{"type":"assistant.message_delta","data":{"messageId":"abc","deltaContent":" world"}}',
      '{"type":"assistant.message_delta","data":{"messageId":"abc","deltaContent":"!"}}',
      '{"type":"result","exitCode":0,"usage":{"premiumRequests":1,"totalApiDurationMs":500}}',
    ].join("\n");

    const result = parseCopilotOutput(stdout);
    expect(result.content).toBe("Hello world!");
    expect(result.model).toBe("claude-sonnet-4.5");
  });
});
