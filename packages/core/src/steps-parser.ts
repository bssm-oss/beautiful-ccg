import { MAX_PIPELINE_STEPS } from "@beautiful-ccg/adapter-base";

export interface ParsedStep {
  adapter?: string; // undefined = auto-route
  model?: string; // for intra-CLI (e.g., copilot --model opus)
  action: string; // prompt suffix
}

export function parseSteps(dsl: string): ParsedStep[] {
  const parts = dsl.split(/\s*(?:->|→)\s*/).filter(Boolean);

  if (parts.length === 0) throw new Error("Empty pipeline steps");
  if (parts.length > MAX_PIPELINE_STEPS)
    throw new Error(`Pipeline exceeds maximum ${MAX_PIPELINE_STEPS} steps`);

  return parts.map(part => {
    const segments = part.split(":").map(s => s.trim());
    if (segments.length === 3) {
      // adapter:model:action (e.g., copilot:opus:reason)
      return { adapter: segments[0], model: segments[1], action: segments[2] };
    } else if (segments.length === 2) {
      // adapter:action (e.g., gemini:summarize)
      return { adapter: segments[0], action: segments[1] };
    } else {
      // just action (auto-route)
      return { action: segments[0] };
    }
  });
}
