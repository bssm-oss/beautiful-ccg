import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { MAX_PROMPT_SIZE } from "@bccg/adapter-base";
import type { Orchestrator } from "@bccg/core";

export function createServer(orchestrator: Orchestrator): McpServer {
  const depth = Number(process.env.BCCG_DEPTH ?? "0");

  const server = new McpServer({ name: "bccg", version: "0.1.0" });

  server.tool(
    "bccg_run",
    "Run a prompt through multiple AI CLIs with auto-routing",
    {
      prompt: z.string().max(MAX_PROMPT_SIZE).describe("The prompt to run"),
      strategy: z
        .enum(["cheap-first", "quality-first", "balanced", "parallel"])
        .optional()
        .describe("Routing strategy"),
      adapter: z.string().regex(/^[a-z0-9-]+$/).max(64).optional().describe("Specific adapter to use"),
      model: z.string().regex(/^[a-z0-9._-]+$/).max(64).optional().describe("Model for intra-CLI routing"),
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
