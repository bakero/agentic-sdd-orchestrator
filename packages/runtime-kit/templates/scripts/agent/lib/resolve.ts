import { validateAgainstSchema, type JsonSchema } from "./json_schema";
import type { NormalizedState } from "./validate";
import {
  BASE_FORBIDDEN_ACTIONS,
  DEFAULT_EXPECTED_OUTPUTS,
  EXPECTED_OUTPUTS_BY_STATE,
  HANDOFF_MAP,
  isBlockedState,
} from "./state_map";

export interface NextAction {
  issue: number;
  feature: string;
  branch: string;
  commit_sha: string;
  current_state: string;
  next_agent: string;
  prompt_template: string | null;
  target_state: string | null;
  context_budget: string;
  reasoning_level: string;
  opusplan: boolean;
  required_reading: string[];
  forbidden_actions: string[];
  expected_outputs: string[];
  generated_at: string;
}

export interface ResolveNextActionResult {
  skipped: boolean;
  reason: string | null;
  nextAction: NextAction | null;
  schemaErrors: string[];
}

function dropNoneOnly(items: string[]): string[] {
  if (items.length === 1 && items[0].trim().toLowerCase() === "none.") {
    return [];
  }
  return items;
}

function dedupe(items: string[]): string[] {
  return Array.from(new Set(items));
}

export function resolveNextAction(
  normalized: NormalizedState,
  generatedAt: string,
  schema: JsonSchema,
): ResolveNextActionResult {
  const { currentState, nextAgent } = normalized;

  if (isBlockedState(currentState)) {
    return {
      skipped: true,
      reason: `current_state "${currentState}" is blocked or terminal; no executable next_action was generated.`,
      nextAction: null,
      schemaErrors: [],
    };
  }

  const handoff = HANDOFF_MAP[currentState];
  const promptTemplate = handoff ? handoff.promptTemplate : null;
  const targetState = handoff ? handoff.targetStates[0] : null;
  const knownConstraints = dropNoneOnly(normalized.contextPack.knownConstraints);
  const forbiddenActions = dedupe([...BASE_FORBIDDEN_ACTIONS, ...knownConstraints]);
  const expectedOutputs =
    EXPECTED_OUTPUTS_BY_STATE[currentState] ?? DEFAULT_EXPECTED_OUTPUTS;

  const nextAction: NextAction = {
    issue: normalized.issue,
    feature: normalized.featureId,
    branch: normalized.branch,
    commit_sha: normalized.commitSha,
    current_state: currentState,
    next_agent: nextAgent,
    prompt_template: promptTemplate,
    target_state: targetState,
    context_budget: normalized.costRecommendation.contextBudget,
    reasoning_level: normalized.costRecommendation.reasoningLevel,
    opusplan: normalized.costRecommendation.opusplan,
    required_reading: normalized.contextPack.requiredReading,
    forbidden_actions: forbiddenActions,
    expected_outputs: expectedOutputs,
    generated_at: generatedAt,
  };

  const { errors } = validateAgainstSchema(schema, nextAction);

  return { skipped: false, reason: null, nextAction, schemaErrors: errors };
}
