import { Registry, Orchestrator } from "@bccg/core";
import { CopilotAdapter } from "@bccg/adapter-copilot";
import { ClaudeAdapter } from "@bccg/adapter-claude";
import { CodexAdapter } from "@bccg/adapter-codex";
import { GeminiAdapter } from "@bccg/adapter-gemini";

export function createOrchestrator(): Orchestrator {
  const registry = new Registry();

  // Register all known adapters
  registry.register(new CopilotAdapter());
  registry.register(new ClaudeAdapter());
  registry.register(new CodexAdapter());
  registry.register(new GeminiAdapter());

  return new Orchestrator(registry);
}
