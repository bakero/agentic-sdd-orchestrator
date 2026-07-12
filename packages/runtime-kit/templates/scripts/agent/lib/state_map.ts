export interface HandoffEntry {
  agent: string;
  promptTemplate: string;
  targetStates: string[];
}

/**
 * States where the coordinator must not render an executable prompt: the
 * feature is blocked on a human decision, rejected back for correction, or
 * already terminal/merged/cancelled.
 */
export const BLOCKED_STATES: readonly string[] = [
  "NEEDS_HUMAN_DECISION",
  "POTENTIAL_FEATURE_CONFLICT",
  "IMPLEMENTATION_BLOCKED",
  "TECHNICAL_REVIEW_REJECTED",
  "FUNCTIONAL_VALIDATION_REJECTED",
  "PR_CREATED",
  "MERGED",
  "CANCELLED",
];

/**
 * Explicit "Basic mapping" for the five handoff states, per
 * docs/features/6-agent-runtime-coordinator/technical_spec.md and the
 * implementer instructions. targetStates[0] is the expected forward
 * transition; later entries are alternative/rejection outcomes.
 */
export const HANDOFF_MAP: Record<string, HandoffEntry> = {
  BRANCH_INITIALIZED: {
    agent: "gemini-product-owner",
    promptTemplate: ".agents/prompts/gemini_product_owner.md",
    targetStates: ["FUNCTIONAL_SPEC_IN_PROGRESS"],
  },
  READY_FOR_TECHNICAL_SPEC: {
    agent: "codex-architect",
    promptTemplate: ".agents/prompts/codex_architect.md",
    targetStates: ["READY_FOR_IMPLEMENTATION"],
  },
  READY_FOR_IMPLEMENTATION: {
    agent: "claude-implementer",
    promptTemplate: ".agents/prompts/claude_implementer.md",
    targetStates: ["IMPLEMENTATION_READY_FOR_REVIEW"],
  },
  IMPLEMENTATION_READY_FOR_REVIEW: {
    agent: "codex-reviewer",
    promptTemplate: ".agents/prompts/codex_reviewer.md",
    targetStates: ["READY_FOR_FUNCTIONAL_VALIDATION", "TECHNICAL_REVIEW_REJECTED"],
  },
  READY_FOR_FUNCTIONAL_VALIDATION: {
    agent: "gemini-functional-validator",
    promptTemplate: ".agents/prompts/gemini_functional_validator.md",
    targetStates: ["READY_FOR_PR", "FUNCTIONAL_VALIDATION_REJECTED"],
  },
  READY_FOR_PR: {
    agent: "gemini-product-owner",
    promptTemplate: ".agents/prompts/gemini_product_owner.md",
    targetStates: ["PR_CREATED"],
  },
};

export interface RequiredDoc {
  path: string;
  requireApprovedStatus?: boolean;
}

/**
 * Per-state required phase documents. States not listed have no additional
 * document requirement beyond status.md itself.
 */
export const REQUIRED_DOCS_BY_STATE: Record<string, RequiredDoc[]> = {
  READY_FOR_TECHNICAL_SPEC: [{ path: "functional_spec.md", requireApprovedStatus: true }],
  READY_FOR_IMPLEMENTATION: [
    { path: "technical_spec.md", requireApprovedStatus: true },
    { path: "test_plan.md", requireApprovedStatus: true },
  ],
  IMPLEMENTATION_READY_FOR_REVIEW: [{ path: "implementation_report.md" }],
  READY_FOR_FUNCTIONAL_VALIDATION: [{ path: "technical_review.md", requireApprovedStatus: true }],
  READY_FOR_PR: [
    { path: "functional_validation.md", requireApprovedStatus: true },
    { path: "pr_description.md" },
  ],
};

/**
 * Expected outputs surfaced in next_action.expected_outputs / the rendered
 * prompt's {{expected_outputs_list}}, keyed by current_state (the phase
 * being handed off), not by agent role (one role can own different outputs
 * in different phases).
 */
export const EXPECTED_OUTPUTS_BY_STATE: Record<string, string[]> = {
  BRANCH_INITIALIZED: ["functional_spec.md", "status.md updated"],
  READY_FOR_TECHNICAL_SPEC: ["technical_spec.md", "test_plan.md", "status.md updated"],
  READY_FOR_IMPLEMENTATION: [
    "implementation_report.md",
    "test_plan.md updated",
    "status.md updated",
  ],
  IMPLEMENTATION_READY_FOR_REVIEW: ["technical_review.md", "status.md updated"],
  READY_FOR_FUNCTIONAL_VALIDATION: [
    "functional_validation.md",
    "status.md updated",
    "pr_description.md",
  ],
  READY_FOR_PR: ["pr_description.md", "status.md updated", "PR created"],
};

export const DEFAULT_EXPECTED_OUTPUTS = ["status.md updated"];

export const BASE_FORBIDDEN_ACTIONS: readonly string[] = [
  "Do not change functional_spec.md",
  "Do not implement automatic merge",
  "Do not add external AI API calls",
];

export function isBlockedState(state: string): boolean {
  return BLOCKED_STATES.includes(state);
}
