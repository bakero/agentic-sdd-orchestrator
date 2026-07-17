/**
 * Ported from the proven runtime-kit coordinator's state map
 * (packages/runtime-kit/templates/scripts/agent/lib/state_map.ts), which is
 * a versioned template copied into target repos and not importable from
 * the orchestrator CLI package (see tsconfig.json's exclude list). Agent
 * names are translated from that file's hyphenated convention
 * ("codex-architect") to this repo's v0.4 config underscore convention
 * ("codex_architect") so a handoff can look the agent up directly in
 * lib/config.ts.
 */

export type StateHandoff = {
  agent: string;
  targetStates: string[];
};

/**
 * States where the coordinator must not generate an executable handoff:
 * blocked on a human decision, rejected back for correction, or already
 * terminal/merged/cancelled.
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

export const STATE_HANDOFF_MAP: Record<string, StateHandoff> = {
  IDEA_CAPTURED: { agent: "gemini_product_owner", targetStates: ["FUNCTIONAL_DISCOVERY"] },
  BRANCH_INITIALIZED: {
    agent: "gemini_product_owner",
    targetStates: ["FUNCTIONAL_SPEC_IN_PROGRESS"],
  },
  READY_FOR_TECHNICAL_SPEC: {
    agent: "codex_architect",
    targetStates: ["READY_FOR_IMPLEMENTATION"],
  },
  READY_FOR_IMPLEMENTATION: {
    agent: "claude_implementer",
    targetStates: ["IMPLEMENTATION_READY_FOR_REVIEW"],
  },
  IMPLEMENTATION_READY_FOR_REVIEW: {
    agent: "codex_reviewer",
    targetStates: ["READY_FOR_FUNCTIONAL_VALIDATION", "TECHNICAL_REVIEW_REJECTED"],
  },
  READY_FOR_FUNCTIONAL_VALIDATION: {
    agent: "gemini_validator",
    targetStates: ["READY_FOR_PR", "FUNCTIONAL_VALIDATION_REJECTED"],
  },
  READY_FOR_PR: {
    agent: "gemini_product_owner",
    targetStates: ["PR_CREATED"],
  },
};

export const EXPECTED_OUTPUTS_BY_STATE: Record<string, string[]> = {
  IDEA_CAPTURED: ["functional_spec.md (draft)", "status.md updated"],
  BRANCH_INITIALIZED: ["functional_spec.md", "questions.md", "decision_log.md", "status.md updated"],
  READY_FOR_TECHNICAL_SPEC: ["technical_spec.md", "test_plan.md", "status.md updated"],
  READY_FOR_IMPLEMENTATION: ["code changes", "implementation_report.md", "status.md updated"],
  IMPLEMENTATION_READY_FOR_REVIEW: ["technical_review.md", "status.md updated"],
  READY_FOR_FUNCTIONAL_VALIDATION: [
    "functional_validation.md",
    "pr_description.md",
    "status.md updated",
  ],
  READY_FOR_PR: ["pr_description.md", "status.md updated", "PR created"],
};

export const DEFAULT_EXPECTED_OUTPUTS = ["status.md updated"];

/**
 * Required-reading input files per current_state, independent of what an
 * individual feature's status.md Context Pack happens to list. Kept small
 * and state-scoped rather than "read the whole repo" (minimal context).
 */
export const INPUT_FILES_BY_STATE: Record<string, string[]> = {
  IDEA_CAPTURED: ["README.md", "questions.md"],
  BRANCH_INITIALIZED: ["README.md", "status.md"],
  READY_FOR_TECHNICAL_SPEC: ["functional_spec.md", "status.md"],
  READY_FOR_IMPLEMENTATION: ["technical_spec.md", "test_plan.md", "status.md"],
  IMPLEMENTATION_READY_FOR_REVIEW: [
    "technical_spec.md",
    "test_plan.md",
    "implementation_report.md",
    "status.md",
  ],
  READY_FOR_FUNCTIONAL_VALIDATION: [
    "functional_spec.md",
    "technical_review.md",
    "status.md",
  ],
  READY_FOR_PR: ["functional_validation.md", "status.md"],
};

export const DEFAULT_INPUT_FILES = ["status.md"];

export const CURRENT_STEP_GOAL_BY_STATE: Record<string, string> = {
  IDEA_CAPTURED: "Create or refine the functional spec for this feature.",
  BRANCH_INITIALIZED: "Create or refine the functional spec for this feature.",
  READY_FOR_TECHNICAL_SPEC: "Create the technical spec and test plan for the approved functional spec.",
  READY_FOR_IMPLEMENTATION: "Implement the approved technical spec within scope and run the required tests.",
  IMPLEMENTATION_READY_FOR_REVIEW: "Perform the technical review of the implementation.",
  READY_FOR_FUNCTIONAL_VALIDATION: "Validate the change against the acceptance criteria and prepare the PR summary.",
  READY_FOR_PR: "Prepare the pull request for human review and merge.",
};

export function isBlockedState(state: string): boolean {
  return BLOCKED_STATES.includes(state);
}

export function stateHandoff(state: string): StateHandoff | undefined {
  return STATE_HANDOFF_MAP[state];
}
