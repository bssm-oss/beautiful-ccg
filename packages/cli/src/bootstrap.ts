import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { parse } from "yaml";
import type { BccgConfig } from "@beautiful-ccg/adapter-base";
import { Registry, Orchestrator } from "@beautiful-ccg/core";
import { CopilotAdapter } from "@beautiful-ccg/adapter-copilot";
import { ClaudeAdapter } from "@beautiful-ccg/adapter-claude";
import { CodexAdapter } from "@beautiful-ccg/adapter-codex";
import { GeminiAdapter } from "@beautiful-ccg/adapter-gemini";

export function loadConfig(cwd: string): BccgConfig | undefined {
  const configPath = join(cwd, ".ccg", "config.yaml");
  if (!existsSync(configPath)) return undefined;
  try {
    return parse(readFileSync(configPath, "utf-8")) as BccgConfig;
  } catch {
    return undefined;
  }
}

const ADAPTERS = [
  { name: "copilot", create: () => new CopilotAdapter() },
  { name: "claude", create: () => new ClaudeAdapter() },
  { name: "codex", create: () => new CodexAdapter() },
  { name: "gemini", create: () => new GeminiAdapter() },
] as const;

export function createOrchestrator(cwd?: string): Orchestrator {
  const dir = cwd ?? process.cwd();
  const config = loadConfig(dir);
  const registry = new Registry();

  for (const { name, create } of ADAPTERS) {
    if (config?.adapters?.[name]?.enabled === false) continue;
    registry.register(create());
  }

  return new Orchestrator(registry, config);
}
