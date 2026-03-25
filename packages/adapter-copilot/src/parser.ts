export interface CopilotParsed {
  content: string;
  model: string;
  exitCode: number;
  premiumRequests?: number;
  reasoningText?: string;
}

export function parseCopilotOutput(stdout: string): CopilotParsed {
  const lines = stdout.split("\n");

  let content = "";
  let model = "";
  let exitCode = 0;
  let premiumRequests: number | undefined;
  let reasoningText: string | undefined;
  const messageDeltaParts: string[] = [];

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

    if (type === "session.tools_updated") {
      const data = event.data as { model?: string } | undefined;
      if (data?.model) {
        model = data.model;
      }
    } else if (type === "assistant.message") {
      const data = event.data as {
        content?: string;
        reasoningText?: string;
      } | undefined;
      if (data?.content !== undefined) {
        content = data.content;
      }
      if (data?.reasoningText) {
        reasoningText = data.reasoningText;
      }
    } else if (type === "assistant.message_delta") {
      const data = event.data as { deltaContent?: string } | undefined;
      if (data?.deltaContent !== undefined) {
        messageDeltaParts.push(data.deltaContent);
      }
    } else if (type === "result") {
      const code = event.exitCode as number | undefined;
      if (code !== undefined) {
        exitCode = code;
      }
      const usage = event.usage as { premiumRequests?: number } | undefined;
      if (usage?.premiumRequests !== undefined) {
        premiumRequests = usage.premiumRequests;
      }
    }
  }

  // Fall back to concatenating message_delta events if no assistant.message found
  if (!content && messageDeltaParts.length > 0) {
    content = messageDeltaParts.join("");
  }

  return { content, model, exitCode, premiumRequests, reasoningText };
}
