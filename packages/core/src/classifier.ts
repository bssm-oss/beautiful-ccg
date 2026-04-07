import type { TaskType } from "@beautiful-ccg/adapter-base";

const KEYWORD_MAP: Record<TaskType, string[]> = {
  reasoning: ["review", "analyze", "judge", "reason", "evaluate", "compare", "critique", "assess", "explain why"],
  coding: ["code", "implement", "fix", "refactor", "write", "create", "build", "debug", "test", "migrate"],
  summarize: ["summarize", "explain", "translate", "tldr", "overview", "brief", "describe"],
  general: [], // fallback
};

export function classifyTask(prompt: string): { type: TaskType; complexity: "low" | "medium" | "high" } {
  const lower = prompt.toLowerCase();
  const wordCount = prompt.split(/\s+/).length;

  // Find the task type with most keyword matches
  let bestType: TaskType = "general";
  let bestScore = 0;

  for (const [type, keywords] of Object.entries(KEYWORD_MAP) as [TaskType, string[]][]) {
    const score = keywords.filter(k => lower.includes(k)).length;
    if (score > bestScore) {
      bestScore = score;
      bestType = type;
    }
  }

  // Complexity heuristic based on prompt length
  const complexity = wordCount < 20 ? "low" : wordCount < 100 ? "medium" : "high";

  return { type: bestType, complexity };
}
