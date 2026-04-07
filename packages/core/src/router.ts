import type { ModelAdapter, Strategy, RoutingPlan, RoutingStep, BccgConfig, CostTier } from "@beautiful-ccg/adapter-base";
import { classifyTask } from "./classifier.js";

const TIER_ORDER: CostTier[] = ["free", "low", "medium", "high"];

export function route(
  prompt: string,
  strategy: Strategy,
  availableAdapters: ModelAdapter[],
  config?: BccgConfig,
): RoutingPlan {
  if (availableAdapters.length === 0) {
    throw new Error("No available adapters");
  }

  switch (strategy) {
    case "cheap-first":
      return routeCheapFirst(availableAdapters, config);
    case "quality-first":
      return routeQualityFirst(availableAdapters, config);
    case "balanced":
      return routeBalanced(prompt, availableAdapters, config);
    case "parallel":
      return routeParallel(availableAdapters);
    default:
      return routeBalanced(prompt, availableAdapters, config);
  }
}

function routeCheapFirst(adapters: ModelAdapter[], _config?: BccgConfig): RoutingPlan {
  // Sort by cost tier ascending (free first)
  const sorted = [...adapters].sort((a, b) => TIER_ORDER.indexOf(a.costTier) - TIER_ORDER.indexOf(b.costTier));
  const steps: RoutingStep[] = [{ adapter: sorted[0].name }];

  // Add fallback from next adapter in tier order
  if (sorted.length > 1) {
    steps[0].fallback = sorted[1].name;
  }

  return { steps, strategy: "cheap-first" };
}

function routeQualityFirst(adapters: ModelAdapter[], _config?: BccgConfig): RoutingPlan {
  // Sort by cost tier descending (high first)
  const sorted = [...adapters].sort((a, b) => TIER_ORDER.indexOf(b.costTier) - TIER_ORDER.indexOf(a.costTier));
  const steps: RoutingStep[] = [{ adapter: sorted[0].name }];

  if (sorted.length > 1) {
    steps[0].fallback = sorted[1].name;
  }

  return { steps, strategy: "quality-first" };
}

function routeBalanced(prompt: string, adapters: ModelAdapter[], _config?: BccgConfig): RoutingPlan {
  const { type } = classifyTask(prompt);

  // Map task type to preferred adapter characteristics
  // reasoning → highest tier, coding → medium (codex-like), summarize → cheapest
  const preferredTier: Record<string, CostTier> = {
    reasoning: "high",
    coding: "medium",
    summarize: "free",
    general: "medium",
  };

  const targetTier = preferredTier[type] ?? "medium";

  // Find best match: exact tier > multiModel adapter that can serve this tier > nearest tier
  const exact = adapters.find(a => a.costTier === targetTier);
  const multiModel = adapters.find(a => a.multiModel);
  const fallbackSorted = [...adapters].sort(
    (a, b) =>
      Math.abs(TIER_ORDER.indexOf(a.costTier) - TIER_ORDER.indexOf(targetTier)) -
      Math.abs(TIER_ORDER.indexOf(b.costTier) - TIER_ORDER.indexOf(targetTier)),
  );

  const primary = exact ?? fallbackSorted[0];
  const steps: RoutingStep[] = [{ adapter: primary.name }];

  // If primary is not multiModel but a multiModel adapter exists, use it as fallback
  if (!primary.multiModel && multiModel) {
    // For multiModel fallback, suggest a model based on task type
    const modelHint: Record<string, string> = {
      reasoning: "opus",
      coding: "codex",
      summarize: "gemini",
      general: "sonnet",
    };
    steps[0].fallback = `${multiModel.name}:${modelHint[type] ?? "sonnet"}`;
  } else if (fallbackSorted.length > 1 && fallbackSorted[1] !== primary) {
    steps[0].fallback = fallbackSorted[1].name;
  }

  return { steps, strategy: "balanced" };
}

function routeParallel(adapters: ModelAdapter[]): RoutingPlan {
  // All available adapters run simultaneously
  const steps: RoutingStep[] = adapters.map(a => ({ adapter: a.name }));
  return { steps, strategy: "parallel" };
}
