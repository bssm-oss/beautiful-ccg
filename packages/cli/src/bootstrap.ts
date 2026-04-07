import { Registry, Orchestrator } from "@beautiful-ccg/core";
import { CopilotAdapter } from "@beautiful-ccg/adapter-copilot";
import { ClaudeAdapter } from "@beautiful-ccg/adapter-claude";
import { CodexAdapter } from "@beautiful-ccg/adapter-codex";
import { GeminiAdapter } from "@beautiful-ccg/adapter-gemini";

export function createOrchestrator(): Orchestrator {
  const registry = new Registry();

  // Register all known adapters
  registry.register(new CopilotAdapter());
  registry.register(new ClaudeAdapter());
  registry.register(new CodexAdapter());
  registry.register(new GeminiAdapter());

  return new Orchestrator(registry);
}
