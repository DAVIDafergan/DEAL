// Approximate Claude Haiku 4.5 pricing (USD per token) — update from the current Anthropic
// pricing page before relying on these figures for real budgeting; they're accurate enough to
// prove the "cumulative cost logging" requirement works, not meant as a billing source of truth.
const INPUT_COST_PER_TOKEN = 0.8 / 1_000_000;
const OUTPUT_COST_PER_TOKEN = 4 / 1_000_000;

let sessionInputTokens = 0;
let sessionOutputTokens = 0;
let sessionCostUsd = 0;
let sessionCallCount = 0;

export function recordUsage({ inputTokens = 0, outputTokens = 0 }) {
  sessionInputTokens += inputTokens;
  sessionOutputTokens += outputTokens;
  const cost = inputTokens * INPUT_COST_PER_TOKEN + outputTokens * OUTPUT_COST_PER_TOKEN;
  sessionCostUsd += cost;
  sessionCallCount += 1;
  return cost;
}

export function getSessionCost() {
  return {
    callCount: sessionCallCount,
    inputTokens: sessionInputTokens,
    outputTokens: sessionOutputTokens,
    costUsd: Math.round(sessionCostUsd * 10000) / 10000,
  };
}

export function resetSessionCost() {
  sessionInputTokens = 0;
  sessionOutputTokens = 0;
  sessionCostUsd = 0;
  sessionCallCount = 0;
}
