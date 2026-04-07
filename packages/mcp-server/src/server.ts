import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Orchestrator } from "@beautiful-ccg/core";

export function createServer(orchestrator: Orchestrator): McpServer {
  const depth = Number(process.env.BCCG_DEPTH ?? "0");

  const server = new McpServer({ name: "bccg", version: "0.2.0" });

  server.tool(
    "bccg_run",
    "Run a prompt through multiple AI CLIs with auto-routing",
    {
      prompt: z.string().describe("The prompt to run"),
      strategy: z
        .enum(["cheap-first", "quality-first", "balanced", "parallel"])
        .optional()
        .describe("Routing strategy"),
      adapter: z.string().optional().describe("Specific adapter to use"),
      model: z.string().optional().describe("Model for intra-CLI routing"),
    },
    async ({ prompt, strategy, adapter, model }) => {
      if (depth >= 1) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: bccg recursive invocation blocked (BCCG_DEPTH >= 1)",
            },
          ],
          isError: true,
        };
      }
      try {
        const result = await orchestrator.run(prompt, {
          strategy: strategy as
            | "cheap-first"
            | "quality-first"
            | "balanced"
            | "parallel"
            | undefined,
          adapter,
          model,
        });
        return { content: [{ type: "text" as const, text: result.output }] };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "bccg_pipeline",
    "Execute a multi-step CCG pipeline",
    {
      steps: z
        .string()
        .describe(
          "Pipeline steps DSL (e.g., 'gemini:summarize -> codex:analyze -> claude:judge')",
        ),
      prompt: z
        .string()
        .optional()
        .describe("Base prompt for the pipeline"),
    },
    async ({ steps, prompt }) => {
      if (depth >= 1) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: bccg recursive invocation blocked",
            },
          ],
          isError: true,
        };
      }
      try {
        const result = await orchestrator.pipeline(steps, {
          basePrompt: prompt,
        });
        return {
          content: [{ type: "text" as const, text: result.finalOutput }],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "bccg_status",
    "Check available CLI adapters and their status",
    {},
    async () => {
      const status = await orchestrator.status();
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(status, null, 2) },
        ],
      };
    },
  );

  return server;
}
