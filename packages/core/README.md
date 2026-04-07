# @bccg/core

Registry, router, classifier, pipeline engine, and orchestrator for bccg. This package ties adapters together without depending on any specific adapter implementation.

## Usage

```typescript
import { Registry, Orchestrator, classifyTask, route, parseSteps, runPipeline } from "@bccg/core";

// Create a registry and register adapters
const registry = new Registry();
registry.register(copilotAdapter);
registry.register(claudeAdapter);

// Use the orchestrator (recommended high-level API)
const orchestrator = new Orchestrator(registry);
const result = await orchestrator.run("explain this code", { strategy: "balanced" });
```

## Orchestrator

The main entry point for running prompts and pipelines.

```typescript
const orchestrator = new Orchestrator(registry);

// Single prompt — auto-routed
await orchestrator.run("explain this error");

// Single prompt — specific adapter + model
await orchestrator.run("analyze this", { adapter: "copilot", model: "opus" });

// Single prompt — strategy-based routing with fallback
await orchestrator.run("review code", { strategy: "quality-first" });

// Pipeline — multi-step
await orchestrator.pipeline("gemini:summarize -> claude:review");

// Status — check all adapters
await orchestrator.status();
```

## Registry

Dynamic adapter registration. Core depends only on `adapter-base` types.

```typescript
const registry = new Registry();
registry.register(adapter);               // Register an adapter
registry.get("claude");                    // Get by name
registry.getAll();                         // All registered adapters
await registry.getAvailable();             // Only installed + authenticated adapters
```

`getAvailable()` also filters out the host CLI (via `BCCG_HOST_CLI` env) to prevent recursion.

## Router

Route a prompt to the best adapter based on strategy.

```typescript
import { route } from "@bccg/core";

const available = await registry.getAvailable();
const plan = route("review this code", "balanced", available);
// plan.steps[0] = { adapter: "claude", fallback: "copilot" }
```

| Strategy | Behavior |
|---|---|
| `cheap-first` | Lowest cost tier first |
| `quality-first` | Highest cost tier first |
| `balanced` | Classify prompt → pick best tier for the task type |
| `parallel` | All adapters as separate steps |

## Classifier

Simple keyword-based task classification.

```typescript
import { classifyTask } from "@bccg/core";

classifyTask("review this code for bugs");
// { type: "reasoning", complexity: "low" }

classifyTask("implement a retry function with exponential backoff");
// { type: "coding", complexity: "medium" }
```

Task types: `reasoning`, `coding`, `summarize`, `general`
Complexity: `low` (<20 words), `medium` (<100), `high` (100+)

## Pipeline

Execute multi-step CLI chains.

```typescript
import { parseSteps, runPipeline } from "@bccg/core";

const steps = parseSteps("gemini:summarize -> codex:implement -> claude:review");
const result = await runPipeline(steps, "add error handling", registry);

console.log(result.finalOutput);      // Final step's output
console.log(result.totalLatency);     // Sum of all steps
console.log(result.steps);            // Per-step results
```

Steps run sequentially. Each step's output feeds into the next. The final step gets a synthesis prompt prefix. Max 10 steps.

## Exports

- `Registry` — adapter registry
- `Orchestrator` — high-level orchestration
- `classifyTask(prompt)` — prompt classification
- `route(prompt, strategy, adapters, config?)` — routing logic
- `parseSteps(dsl)` — pipeline DSL parser
- `runPipeline(steps, prompt, registry, options?)` — pipeline executor
- `ParsedStep` — parsed step type
