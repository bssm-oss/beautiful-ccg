import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../server.js";
import type { Orchestrator } from "@beautiful-ccg/core";
import type { AdapterResult, PipelineResult, AvailabilityStatus } from "@beautiful-ccg/adapter-base";

function makeOrchestrator(): Orchestrator {
  return {
    run: vi.fn(),
    pipeline: vi.fn(),
    status: vi.fn(),
  } as unknown as Orchestrator;
}

async function connectClientServer(orchestrator: Orchestrator) {
  const server = createServer(orchestrator);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  const client = new Client({ name: "test-client", version: "0.0.1" });

  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);

  return { server, client };
}

describe("createServer", () => {
  it("returns an McpServer instance", () => {
    const orchestrator = makeOrchestrator();
    const server = createServer(orchestrator);
    expect(server).toBeDefined();
    expect(typeof server.connect).toBe("function");
  });
});

describe("bccg_run", () => {
  let orchestrator: Orchestrator;

  beforeEach(() => {
    orchestrator = makeOrchestrator();
  });

  it("calls orchestrator.run() with correct args and returns output", async () => {
    const mockResult: AdapterResult = {
      output: "hello world",
      model: "claude-3",
      adapter: "claude",
      latency: 100,
      exitCode: 0,
    };
    vi.mocked(orchestrator.run).mockResolvedValue(mockResult);

    const { client } = await connectClientServer(orchestrator);

    const result = await client.callTool({
      name: "bccg_run",
      arguments: { prompt: "test prompt", strategy: "balanced" },
    });

    expect(orchestrator.run).toHaveBeenCalledWith("test prompt", {
      strategy: "balanced",
      adapter: undefined,
      model: undefined,
    });
    expect(result.content).toEqual([{ type: "text", text: "hello world" }]);
  });

  it("passes adapter and model arguments", async () => {
    const mockResult: AdapterResult = {
      output: "response",
      model: "gpt-4",
      adapter: "codex",
      latency: 50,
      exitCode: 0,
    };
    vi.mocked(orchestrator.run).mockResolvedValue(mockResult);

    const { client } = await connectClientServer(orchestrator);

    await client.callTool({
      name: "bccg_run",
      arguments: { prompt: "hi", adapter: "codex", model: "gpt-4" },
    });

    expect(orchestrator.run).toHaveBeenCalledWith("hi", {
      strategy: undefined,
      adapter: "codex",
      model: "gpt-4",
    });
  });

  it("returns error content when orchestrator.run() throws", async () => {
    vi.mocked(orchestrator.run).mockRejectedValue(new Error("adapter failed"));

    const { client } = await connectClientServer(orchestrator);

    const result = await client.callTool({
      name: "bccg_run",
      arguments: { prompt: "bad" },
    });

    expect(result.isError).toBe(true);
    expect((result.content as Array<{ type: string; text: string }>)[0].text).toContain(
      "adapter failed",
    );
  });
});

describe("bccg_pipeline", () => {
  let orchestrator: Orchestrator;

  beforeEach(() => {
    orchestrator = makeOrchestrator();
  });

  it("calls orchestrator.pipeline() with correct args", async () => {
    const mockResult: PipelineResult = {
      steps: [],
      finalOutput: "final answer",
      totalLatency: 200,
    };
    vi.mocked(orchestrator.pipeline).mockResolvedValue(mockResult);

    const { client } = await connectClientServer(orchestrator);

    const result = await client.callTool({
      name: "bccg_pipeline",
      arguments: { steps: "gemini -> codex", prompt: "base prompt" },
    });

    expect(orchestrator.pipeline).toHaveBeenCalledWith("gemini -> codex", {
      basePrompt: "base prompt",
    });
    expect(result.content).toEqual([{ type: "text", text: "final answer" }]);
  });

  it("works without optional prompt", async () => {
    const mockResult: PipelineResult = {
      steps: [],
      finalOutput: "done",
      totalLatency: 50,
    };
    vi.mocked(orchestrator.pipeline).mockResolvedValue(mockResult);

    const { client } = await connectClientServer(orchestrator);

    await client.callTool({
      name: "bccg_pipeline",
      arguments: { steps: "claude:analyze" },
    });

    expect(orchestrator.pipeline).toHaveBeenCalledWith("claude:analyze", {
      basePrompt: undefined,
    });
  });

  it("returns error when pipeline throws", async () => {
    vi.mocked(orchestrator.pipeline).mockRejectedValue(new Error("step failed"));

    const { client } = await connectClientServer(orchestrator);

    const result = await client.callTool({
      name: "bccg_pipeline",
      arguments: { steps: "bad" },
    });

    expect(result.isError).toBe(true);
  });
});

describe("bccg_status", () => {
  let orchestrator: Orchestrator;

  beforeEach(() => {
    orchestrator = makeOrchestrator();
  });

  it("calls orchestrator.status() and returns JSON", async () => {
    const mockStatus: Record<string, AvailabilityStatus> = {
      claude: {
        installed: true,
        authenticated: true,
        version: "1.0.0",
        jsonOutput: true,
        multiModel: true,
      },
    };
    vi.mocked(orchestrator.status).mockResolvedValue(mockStatus);

    const { client } = await connectClientServer(orchestrator);

    const result = await client.callTool({ name: "bccg_status", arguments: {} });

    expect(orchestrator.status).toHaveBeenCalled();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(JSON.parse(text)).toEqual(mockStatus);
  });
});

describe("depth guard", () => {
  let originalDepth: string | undefined;

  beforeEach(() => {
    originalDepth = process.env.BCCG_DEPTH;
    process.env.BCCG_DEPTH = "1";
  });

  afterEach(() => {
    if (originalDepth === undefined) {
      delete process.env.BCCG_DEPTH;
    } else {
      process.env.BCCG_DEPTH = originalDepth;
    }
  });

  it("bccg_run blocks when BCCG_DEPTH >= 1", async () => {
    const orchestrator = makeOrchestrator();

    const { client } = await connectClientServer(orchestrator);

    const result = await client.callTool({
      name: "bccg_run",
      arguments: { prompt: "test" },
    });

    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("BCCG_DEPTH");
    expect(orchestrator.run).not.toHaveBeenCalled();
  });

  it("bccg_pipeline blocks when BCCG_DEPTH >= 1", async () => {
    const orchestrator = makeOrchestrator();

    const { client } = await connectClientServer(orchestrator);

    const result = await client.callTool({
      name: "bccg_pipeline",
      arguments: { steps: "claude:analyze" },
    });

    expect(result.isError).toBe(true);
    expect(orchestrator.pipeline).not.toHaveBeenCalled();
  });
});
