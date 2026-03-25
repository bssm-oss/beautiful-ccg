import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { parseCodexOutput } from "../parser.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fixturesDir = join(__dirname, "../../../..", "fixtures/codex");

function readFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), "utf-8");
}

describe("parseCodexOutput", () => {
  it("parses basic output and extracts content", () => {
    const stdout = readFixture("basic-json.txt");
    const result = parseCodexOutput(stdout);
    expect(result.content).toBe("Hello!");
    expect(result.exitCode).toBe(0);
    expect(result.model).toBe("gpt-5.3-codex");
  });

  it("concatenates multiple item.completed agent_message events", () => {
    const stdout = [
      '{"type":"thread.started","thread_id":"abc"}',
      '{"type":"turn.started"}',
      '{"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"Hello"}}',
      '{"type":"item.completed","item":{"id":"item_1","type":"agent_message","text":", world"}}',
      '{"type":"item.completed","item":{"id":"item_2","type":"agent_message","text":"!"}}',
      '{"type":"turn.completed","usage":{"input_tokens":100,"cached_input_tokens":0,"output_tokens":10}}',
    ].join("\n");

    const result = parseCodexOutput(stdout);
    expect(result.content).toBe("Hello, world!");
  });

  it("extracts usage tokens from turn.completed", () => {
    const stdout = readFixture("basic-json.txt");
    const result = parseCodexOutput(stdout);
    expect(result.inputTokens).toBe(7982);
    expect(result.outputTokens).toBe(105);
  });

  it("handles empty stdout gracefully", () => {
    const result = parseCodexOutput("");
    expect(result.content).toBe("");
    expect(result.model).toBe("gpt-5.3-codex");
    expect(result.exitCode).toBe(0);
    expect(result.inputTokens).toBeUndefined();
    expect(result.outputTokens).toBeUndefined();
  });

  it("handles malformed lines gracefully", () => {
    const stdout = [
      '{"type":"thread.started","thread_id":"abc"}',
      "this is not json {{{",
      "also bad",
      '{"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"valid content"}}',
      '{"type":"turn.completed","usage":{"input_tokens":50,"cached_input_tokens":0,"output_tokens":5}}',
    ].join("\n");

    const result = parseCodexOutput(stdout);
    expect(result.content).toBe("valid content");
    expect(result.inputTokens).toBe(50);
    expect(result.outputTokens).toBe(5);
  });
});
