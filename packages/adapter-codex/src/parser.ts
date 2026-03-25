export interface CodexParsed {
  content: string;
  model: string; // "gpt-5.3-codex" (hardcoded since Codex doesn't report model in output)
  exitCode: number;
  inputTokens?: number;
  outputTokens?: number;
}

export function parseCodexOutput(stdout: string): CodexParsed {
  const lines = stdout.split("\n");

  const contentParts: string[] = [];
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;

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

    if (type === "item.completed") {
      const item = event.item as { id?: string; type?: string; text?: string } | undefined;
      if (item?.type === "agent_message" && item.text !== undefined) {
        contentParts.push(item.text);
      }
    } else if (type === "turn.completed") {
      const usage = event.usage as {
        input_tokens?: number;
        cached_input_tokens?: number;
        output_tokens?: number;
      } | undefined;
      if (usage?.input_tokens !== undefined) {
        inputTokens = usage.input_tokens;
      }
      if (usage?.output_tokens !== undefined) {
        outputTokens = usage.output_tokens;
      }
    }
  }

  return {
    content: contentParts.join(""),
    // Codex NDJSON does not report the model name; hardcoded as default.
    // Error detection relies on the adapter-level process exitCode, not parser output.
    model: "gpt-5.3-codex",
    exitCode: 0,
    inputTokens,
    outputTokens,
  };
}
