import { execa } from "execa";

export function resolveModel(input: string): string {
  // OpenCode uses provider/model format as-is, no aliases needed
  return input;
}

let cachedModels: string[] | null = null;

export async function fetchModels(): Promise<string[]> {
  if (cachedModels) return cachedModels;
  try {
    const result = await execa("opencode", ["models"], { reject: false, timeout: 10_000 });
    if (result.exitCode === 0 && result.stdout) {
      cachedModels = result.stdout
        .split("\n")
        .map(l => l.trim())
        .filter(l => l.length > 0 && l.includes("/"));
      return cachedModels;
    }
  } catch {
    // fall through
  }
  return [];
}
