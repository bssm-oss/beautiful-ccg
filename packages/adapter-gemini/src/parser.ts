export interface GeminiParsed {
  content: string;
  model: string;
  sessionId: string;
}

interface GeminiModelEntry {
  api?: { totalRequests?: number; totalLatencyMs?: number };
  tokens?: Record<string, unknown>;
  roles?: Record<string, unknown>;
}

export function parseGeminiOutput(stdout: string): GeminiParsed {
  if (!stdout.trim()) {
    return { content: "", model: "", sessionId: "" };
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(stdout) as Record<string, unknown>;
  } catch {
    // Graceful fallback: return raw stdout as content
    return { content: stdout, model: "", sessionId: "" };
  }

  const content = (parsed.response as string | undefined) ?? "";
  const sessionId = (parsed.session_id as string | undefined) ?? "";

  // Find the model with "main" role in stats.models
  let model = "";
  const stats = parsed.stats as { models?: Record<string, GeminiModelEntry> } | undefined;
  if (stats?.models) {
    for (const [modelName, modelData] of Object.entries(stats.models)) {
      if (modelData.roles && "main" in modelData.roles) {
        model = modelName;
        break;
      }
    }
    // Fallback: use first model name if no "main" role found
    if (!model) {
      const firstKey = Object.keys(stats.models)[0];
      if (firstKey) {
        model = firstKey;
      }
    }
  }

  return { content, model, sessionId };
}
