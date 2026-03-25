import { describe, it, expect } from "vitest";
import { classifyTask } from "../classifier.js";

describe("classifyTask", () => {
  it('"review this PR" → reasoning', () => {
    const { type } = classifyTask("review this PR");
    expect(type).toBe("reasoning");
  });

  it('"implement login feature" → coding', () => {
    const { type } = classifyTask("implement login feature");
    expect(type).toBe("coding");
  });

  it('"summarize this file" → summarize', () => {
    const { type } = classifyTask("summarize this file");
    expect(type).toBe("summarize");
  });

  it('"hello" → general', () => {
    const { type } = classifyTask("hello");
    expect(type).toBe("general");
  });

  it("short prompt → low complexity", () => {
    const { complexity } = classifyTask("fix this bug");
    expect(complexity).toBe("low");
  });

  it("long prompt → high complexity", () => {
    const longPrompt = Array(110).fill("word").join(" ");
    const { complexity } = classifyTask(longPrompt);
    expect(complexity).toBe("high");
  });

  it("medium length prompt → medium complexity", () => {
    const medPrompt = Array(50).fill("word").join(" ");
    const { complexity } = classifyTask(medPrompt);
    expect(complexity).toBe("medium");
  });
});
