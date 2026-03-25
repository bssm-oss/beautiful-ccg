import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { parseGeminiOutput } from "../parser.js";

// Navigate from src/__tests__/ up to repo root (../../..) then into fixtures
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fixturesDir = join(__dirname, "../../../..", "fixtures/gemini");

function readFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), "utf-8");
}

describe("parseGeminiOutput", () => {
  it("parses real output and extracts response text", () => {
    const stdout = readFixture("basic-json.txt");
    const result = parseGeminiOutput(stdout);
    expect(result.content).toContain("beautiful-ccg");
    expect(result.content).toBeTruthy();
  });

  it("extracts the main model name (gemini-3-flash-preview has roles.main)", () => {
    const stdout = readFixture("basic-json.txt");
    const result = parseGeminiOutput(stdout);
    expect(result.model).toBe("gemini-3-flash-preview");
  });

  it("extracts session_id from real output", () => {
    const stdout = readFixture("basic-json.txt");
    const result = parseGeminiOutput(stdout);
    expect(result.sessionId).toBe("ba5a3e87-0fcc-45c7-bfaf-c8cd217147b3");
  });

  it("handles empty stdout gracefully", () => {
    const result = parseGeminiOutput("");
    expect(result.content).toBe("");
    expect(result.model).toBe("");
    expect(result.sessionId).toBe("");
  });

  it("handles malformed JSON gracefully by returning stdout as content", () => {
    const badInput = "not valid json {{{{";
    const result = parseGeminiOutput(badInput);
    expect(result.content).toBe(badInput);
    expect(result.model).toBe("");
    expect(result.sessionId).toBe("");
  });

  it("returns empty model when no roles.main found", () => {
    const json = JSON.stringify({
      session_id: "abc",
      response: "hello",
      stats: {
        models: {
          "some-model": {
            api: { totalRequests: 1, totalLatencyMs: 100 },
            roles: { utility_router: {} },
          },
        },
      },
    });
    const result = parseGeminiOutput(json);
    expect(result.content).toBe("hello");
    // Falls back to first model key since no "main" role
    expect(result.model).toBe("some-model");
  });
});
