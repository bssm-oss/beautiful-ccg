export interface OpenCodeParsed {
  content: string;
  model: string;
  exitCode: number;
  error?: string;
}

export function parseOpenCodeOutput(stdout: string): OpenCodeParsed {
  const contentParts: string[] = [];
  let model = "";
  let exitCode = 0;
  let error: string | undefined;

  const lines = stdout.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    try {
      const event = JSON.parse(trimmed) as Record<string, unknown>;
      const type = event.type as string | undefined;

      if (type === "text") {
        const part = event.part as Record<string, unknown> | undefined;
        if (part?.text && typeof part.text === "string") {
          contentParts.push(part.text);
        }
      } else if (type === "error") {
        const err = event.error as Record<string, unknown> | undefined;
        error = (err?.message as string) ?? "Unknown error";
        exitCode = 1;
      } else if (type === "step_start") {
        // Model info may appear in step metadata
        const metadata = event.metadata as Record<string, unknown> | undefined;
        if (metadata?.model && typeof metadata.model === "string") {
          model = metadata.model;
        }
      }
    } catch {
      // Skip malformed JSON lines
    }
  }

  return {
    content: contentParts.join(""),
    model,
    exitCode,
    error,
  };
}
