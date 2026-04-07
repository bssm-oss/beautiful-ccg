import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseOpenCodeOutput } from "../parser.js";

const fixturesDir = join(process.cwd(), "fixtures/opencode");

describe("parseOpenCodeOutput()", () => {
  it("parses real NDJSON fixture output", () => {
    const stdout = readFileSync(join(fixturesDir, "basic-json.txt"), "utf-8");
    const result = parseOpenCodeOutput(stdout);

    expect(result.content).toBe("Hello! How can I help you today?");
    expect(result.model).toBe("anthropic/claude-sonnet-4-5");
    expect(result.exitCode).toBe(0);
    expect(result.error).toBeUndefined();
  });

  it("concatenates multiple text events", () => {
    const stdout = [
      '{"type":"text","timestamp":1,"sessionID":"s","part":{"text":"Part 1"}}',
      '{"type":"text","timestamp":2,"sessionID":"s","part":{"text":" Part 2"}}',
      '{"type":"text","timestamp":3,"sessionID":"s","part":{"text":" Part 3"}}',
    ].join("\n");

    const result = parseOpenCodeOutput(stdout);
    expect(result.content).toBe("Part 1 Part 2 Part 3");
  });

  it("detects error events", () => {
    const stdout = '{"type":"error","timestamp":1,"sessionID":"s","error":{"message":"API rate limit exceeded"}}';
    const result = parseOpenCodeOutput(stdout);

    expect(result.exitCode).toBe(1);
    expect(result.error).toBe("API rate limit exceeded");
  });

  it("returns empty content for empty stdout", () => {
    const result = parseOpenCodeOutput("");
    expect(result.content).toBe("");
    expect(result.model).toBe("");
    expect(result.exitCode).toBe(0);
  });

  it("skips malformed JSON lines gracefully", () => {
    const stdout = [
      "not json at all",
      '{"type":"text","timestamp":1,"sessionID":"s","part":{"text":"valid"}}',
      "{broken",
    ].join("\n");

    const result = parseOpenCodeOutput(stdout);
    expect(result.content).toBe("valid");
  });

  it("extracts model from step_start metadata", () => {
    const stdout = '{"type":"step_start","timestamp":1,"sessionID":"s","metadata":{"model":"openai/gpt-5.4"}}';
    const result = parseOpenCodeOutput(stdout);
    expect(result.model).toBe("openai/gpt-5.4");
  });
});
