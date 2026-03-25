export interface ClaudeParsed {
  content: string;
  model: string;
  exitCode: number;
}

export function parseClaudeOutput(stdout: string): ClaudeParsed {
  const lines = stdout.split("\n");

  let content = "";
  let model = "";
  let exitCode = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let event: Record<string, unknown>;
    try {
      event = JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      // Skip malformed lines
      continue;
    }

    const type = event.type as string | undefined;

    if (type === "assistant.message") {
      // Claude Code SDK assistant message format
      const data = event.data as { content?: string } | undefined;
      if (data?.content !== undefined) {
        content = data.content;
      }
      // Also check top-level content field
      if (!data?.content && typeof event.content === "string") {
        content = event.content;
      }
    } else if (type === "result") {
      // Final result event — may contain the text directly
      const code = event.exitCode as number | undefined;
      if (code !== undefined) {
        exitCode = code;
      }
      // Some Claude CLI versions embed result text here
      if (typeof event.result === "string" && !content) {
        content = event.result;
      }
    } else if (type === "system") {
      // Session init may carry model info
      const data = event.data as { model?: string } | undefined;
      if (data?.model) {
        model = data.model;
      }
    }

    // Extract model from any event that carries it at top-level
    if (!model && typeof event.model === "string") {
      model = event.model;
    }
  }

  // Graceful fallback: if no structured event produced content, use trimmed stdout
  if (!content) {
    content = stdout.trim();
  }

  return { content, model, exitCode };
}
