import { isPlaceholder, parseFrontmatter, parseSections } from "./markdown";
import { isBulletListValid, parseStatusDoc } from "./status_doc";
import { isBlockedState, REQUIRED_DOCS_BY_STATE, HANDOFF_MAP } from "./state_map";

const REQUIRED_FRONTMATTER_FIELDS = [
  "feature_id",
  "issue",
  "branch",
  "document",
  "current_state",
  "current_agent",
  "next_agent",
  "blocked",
  "last_updated",
] as const;

const REQUIRED_COST_FIELDS: Array<[string, string]> = [
  ["recommendedAgent", "Recommended agent"],
  ["recommendedModelMode", "Recommended model/mode"],
  ["reasoningLevel", "Reasoning level"],
  ["opusplan", "Opusplan"],
  ["contextBudget", "Context budget"],
  ["rationale", "Rationale"],
];

const VALID_REASONING_LEVELS = new Set(["low", "medium", "high"]);
const VALID_CONTEXT_BUDGETS = new Set(["XS", "S", "M", "L", "XL"]);

export interface ContextPackNormalized {
  nextAgent: string;
  requiredReading: string[];
  optionalReading: string[];
  knownConstraints: string[];
  openQuestions: string[];
  reasonForSelectedContext: string;
}

export interface CostRecommendationNormalized {
  recommendedAgent: string;
  recommendedModelMode: string;
  reasoningLevel: string;
  opusplan: boolean;
  contextBudget: string;
  rationale: string;
}

export interface NormalizedState {
  featureId: string;
  issue: number;
  branch: string;
  commitSha: string;
  currentState: string;
  currentAgent: string;
  nextAgent: string;
  blocked: boolean;
  contextPack: ContextPackNormalized;
  costRecommendation: CostRecommendationNormalized;
}

export interface ValidateWorkflowStateInput {
  featureId: string;
  branch: string;
  commitSha: string;
  statusMarkdown: string | null;
  indexMarkdown: string | null;
  readFeatureDoc: (relativePath: string) => string | null;
  docsIssuesExists: boolean;
  promptTemplateExists: (templatePath: string) => boolean;
  runtimeSchemaExists: (schemaPath: string) => boolean;
  allowedStates: string[];
  /**
   * `current_state` read from the previous commit's status.md on this
   * branch, or null when the feature folder did not exist yet at the
   * previous commit (i.e. this is the branch's first validated state).
   */
  previousState: string | null;
  transitions: Record<string, string[]>;
  entryStates: string[];
  anyStateSuccessors: string[];
}

export interface ValidateWorkflowStateResult {
  ok: boolean;
  errors: string[];
  blocked: boolean;
  normalized: NormalizedState | null;
}

const PROMPT_TEMPLATES = [
  ".agents/prompts/gemini_product_owner.md",
  ".agents/prompts/codex_architect.md",
  ".agents/prompts/claude_implementer.md",
  ".agents/prompts/codex_reviewer.md",
  ".agents/prompts/gemini_functional_validator.md",
];

const RUNTIME_SCHEMAS = [
  ".agents/runtime/next_action.schema.json",
  ".agents/runtime/prompt_context.schema.json",
];

export function validateWorkflowState(
  input: ValidateWorkflowStateInput,
): ValidateWorkflowStateResult {
  const errors: string[] = [];

  if (!input.statusMarkdown) {
    return {
      ok: false,
      blocked: false,
      errors: [
        `status.md not found for feature "${input.featureId}". Expected docs/features/${input.featureId}/status.md to exist on branch ${input.branch}.`,
      ],
      normalized: null,
    };
  }

  if (input.docsIssuesExists) {
    errors.push(
      'docs/issues/ must not exist. GitHub Issues are the source of truth; local issue substitutes are forbidden.',
    );
  }

  for (const template of PROMPT_TEMPLATES) {
    if (!input.promptTemplateExists(template)) {
      errors.push(`Prompt template "${template}" is missing.`);
    }
  }

  for (const schema of RUNTIME_SCHEMAS) {
    if (!input.runtimeSchemaExists(schema)) {
      errors.push(`Runtime schema "${schema}" is missing.`);
    }
  }

  const doc = parseStatusDoc(input.statusMarkdown);
  const fm = doc.frontmatter;

  for (const field of REQUIRED_FRONTMATTER_FIELDS) {
    if (fm[field] === undefined || fm[field] === null || fm[field] === "") {
      errors.push(`status.md frontmatter is missing required field "${field}".`);
    }
  }

  if (fm.document !== "status") {
    errors.push(
      `status.md frontmatter "document" must equal "status" (got "${String(fm.document)}").`,
    );
  }
  if (fm.feature_id !== input.featureId) {
    errors.push(
      `status.md frontmatter "feature_id" (${String(fm.feature_id)}) does not match feature folder "${input.featureId}".`,
    );
  }
  if (fm.branch !== input.branch) {
    errors.push(
      `status.md frontmatter "branch" (${String(fm.branch)}) does not match checked-out branch "${input.branch}".`,
    );
  }

  const currentState = typeof fm.current_state === "string" ? fm.current_state : "";
  if (!currentState) {
    errors.push('status.md frontmatter is missing a usable "current_state".');
  } else if (!input.allowedStates.includes(currentState)) {
    errors.push(`status.md "current_state" (${currentState}) is not one of the allowed states.`);
  } else {
    validateTransitionReachability(input, currentState, errors);
  }

  if (!input.commitSha) {
    errors.push("commit_sha could not be resolved for the current branch HEAD.");
  }

  const nextAgent = typeof fm.next_agent === "string" ? fm.next_agent : "";
  if (!nextAgent || isPlaceholder(nextAgent)) {
    errors.push('status.md "next_agent" must not be empty or Pending.');
  } else {
    const handoff = HANDOFF_MAP[currentState];
    if (handoff && nextAgent !== handoff.agent) {
      errors.push(
        `status.md "next_agent" (${nextAgent}) is not compatible with current_state "${currentState}"; expected "${handoff.agent}".`,
      );
    }
  }

  const blocked = currentState ? isBlockedState(currentState) : false;

  if (!doc.hasCurrentSummary) {
    errors.push('status.md is missing the "## Current summary" section.');
  }
  if (!doc.hasChecklist) {
    errors.push('status.md is missing the "## Checklist" section.');
  }
  if (!doc.hasBlockingIssues) {
    errors.push('status.md is missing the "## Blocking issues" section.');
  }

  validateContextPack(doc.contextPack, nextAgent, errors);
  validateCostRecommendation(doc.costRecommendation, errors);
  validateAgentCostLog(doc.agentCostLog, errors);

  if (currentState) {
    validateRequiredDocuments(input, currentState, errors);
  }

  const normalized = buildNormalized(input, fm, currentState, nextAgent, doc);

  return {
    ok: errors.length === 0,
    errors,
    blocked,
    normalized: errors.length === 0 ? normalized : null,
  };
}

function validateContextPack(
  contextPack: ReturnType<typeof parseStatusDoc>["contextPack"],
  frontmatterNextAgent: string,
  errors: string[],
): void {
  if (!contextPack) {
    errors.push('status.md is missing the "## Context Pack for Next Agent" section.');
    return;
  }

  if (!contextPack.nextAgent || isPlaceholder(contextPack.nextAgent)) {
    errors.push('Context Pack "### Next agent" must not be empty or Pending.');
  } else if (contextPack.nextAgent !== frontmatterNextAgent) {
    errors.push(
      `Context Pack "### Next agent" (${contextPack.nextAgent}) does not match frontmatter next_agent (${frontmatterNextAgent}).`,
    );
  }

  if (!isBulletListValid(contextPack.requiredReading)) {
    errors.push('Context Pack "### Required reading" must contain at least one non-placeholder item.');
  }

  const checks: Array<[string, string[]]> = [
    ["Optional reading", contextPack.optionalReading],
    ["Do not read by default", contextPack.doNotReadByDefault],
    ["Relevant code areas to inspect", contextPack.relevantCodeAreas],
    ["Relevant tests to inspect or run", contextPack.relevantTests],
    ["Known constraints", contextPack.knownConstraints],
  ];
  for (const [label, bullets] of checks) {
    if (!isBulletListValid(bullets)) {
      errors.push(
        `Context Pack "### ${label}" must contain at least one non-placeholder bullet (or "None.").`,
      );
    }
  }

  if (contextPack.openQuestions.length === 0) {
    errors.push('Context Pack "### Open questions" must contain at least "None." or a question id.');
  }

  if (!contextPack.reasonForSelectedContext || isPlaceholder(contextPack.reasonForSelectedContext)) {
    errors.push('Context Pack "### Reason for selected context" must not be empty or Pending.');
  }
}

function validateCostRecommendation(
  cost: ReturnType<typeof parseStatusDoc>["costRecommendation"],
  errors: string[],
): void {
  if (!cost) {
    errors.push('status.md is missing the "## Next Agent Cost Recommendation" section.');
    return;
  }

  for (const [key, label] of REQUIRED_COST_FIELDS) {
    const value = (cost as unknown as Record<string, string>)[key];
    if (!value || isPlaceholder(value)) {
      errors.push(`Next Agent Cost Recommendation "${label}" must not be empty or Pending.`);
    }
  }

  if (cost.reasoningLevel && !VALID_REASONING_LEVELS.has(cost.reasoningLevel)) {
    errors.push(
      `Next Agent Cost Recommendation "Reasoning level" must be low, medium, or high (got "${cost.reasoningLevel}").`,
    );
  }
  if (cost.contextBudget && !VALID_CONTEXT_BUDGETS.has(cost.contextBudget)) {
    errors.push(
      `Next Agent Cost Recommendation "Context budget" must be one of XS, S, M, L, XL (got "${cost.contextBudget}").`,
    );
  }
}

function validateAgentCostLog(
  agentCostLog: ReturnType<typeof parseStatusDoc>["agentCostLog"],
  errors: string[],
): void {
  const expectedHeaders = [
    "Phase",
    "Agent",
    "Model/mode",
    "Reasoning",
    "Context budget",
    "Result",
    "Notes",
  ];

  if (!agentCostLog) {
    errors.push('status.md is missing the "## Agent Cost Log" table.');
    return;
  }

  const headersMatch = expectedHeaders.every(
    (header, index) => agentCostLog.headers[index] === header,
  );
  if (!headersMatch) {
    errors.push(`Agent Cost Log table header must be | ${expectedHeaders.join(" | ")} |.`);
  }

  const nonPlaceholderRows = agentCostLog.rows.filter(
    (row) => !Object.values(row.cells).every((cell) => isPlaceholder(cell)),
  );

  if (nonPlaceholderRows.length === 0) {
    errors.push("Agent Cost Log must contain at least one non-placeholder row.");
    return;
  }

  const latest = nonPlaceholderRows[nonPlaceholderRows.length - 1];
  const requiredCells = ["Agent", "Model/mode", "Reasoning", "Context budget", "Result"];
  for (const cell of requiredCells) {
    if (isPlaceholder(latest.cells[cell])) {
      errors.push(
        `Agent Cost Log latest row must have a non-empty, non-placeholder "${cell}" value.`,
      );
    }
  }
}

function validateTransitionReachability(
  input: ValidateWorkflowStateInput,
  currentState: string,
  errors: string[],
): void {
  const { previousState, transitions, entryStates, anyStateSuccessors } = input;

  if (anyStateSuccessors.includes(currentState)) {
    return;
  }

  if (previousState === null) {
    if (!entryStates.includes(currentState)) {
      errors.push(
        `status.md "current_state" (${currentState}) has no previous recorded state on this branch and is not an allowed entry state.`,
      );
    }
    return;
  }

  if (previousState === currentState) {
    return;
  }

  if (!isReachable(previousState, currentState, transitions)) {
    errors.push(
      `status.md "current_state" (${currentState}) is not reachable from the previous state (${previousState}) per workflow_contract.json transitions.`,
    );
  }
}

/**
 * Breadth-first search over the transition graph. Multi-hop reachability
 * (not just direct adjacency) because agents commonly commit only the
 * received handoff state and the resulting outcome state, skipping the
 * transient `_IN_PROGRESS` state in between (e.g.
 * IMPLEMENTATION_READY_FOR_REVIEW -> TECHNICAL_REVIEW_REJECTED skips
 * TECHNICAL_REVIEW_IN_PROGRESS, which is never separately committed).
 */
function isReachable(
  from: string,
  to: string,
  transitions: Record<string, string[]>,
): boolean {
  const visited = new Set<string>([from]);
  const queue = [from];

  while (queue.length > 0) {
    const state = queue.shift() as string;
    for (const next of transitions[state] ?? []) {
      if (next === to) return true;
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }

  return false;
}

function validateRequiredDocuments(
  input: ValidateWorkflowStateInput,
  currentState: string,
  errors: string[],
): void {
  const requiredDocs = REQUIRED_DOCS_BY_STATE[currentState];
  if (requiredDocs) {
    for (const required of requiredDocs) {
      const content = input.readFeatureDoc(required.path);
      if (!content) {
        errors.push(
          `Required document "${required.path}" is missing for state ${currentState}.`,
        );
        continue;
      }

      if (required.requireApprovedStatus) {
        const { frontmatter } = parseFrontmatter(content);
        if (frontmatter.status !== "APPROVED") {
          errors.push(
            `Required document "${required.path}" must have frontmatter "status: APPROVED" for state ${currentState} (got "${String(frontmatter.status)}").`,
          );
        }
      }
    }
  }

  if (currentState === "IMPLEMENTATION_READY_FOR_REVIEW") {
    const testPlan = input.readFeatureDoc("test_plan.md");
    if (testPlan && !hasExecutionResults(testPlan)) {
      errors.push(
        'Required document "test_plan.md" must contain non-placeholder execution results (a "## Final results" section) for state IMPLEMENTATION_READY_FOR_REVIEW.',
      );
    }
  }

  if (currentState === "READY_FOR_PR") {
    const prDescription = input.readFeatureDoc("pr_description.md");
    if (prDescription && isPlaceholderDocument(prDescription)) {
      errors.push(
        'Required document "pr_description.md" must be complete (non-placeholder) for state READY_FOR_PR.',
      );
    }
  }

  if (currentState === "PR_CREATED") {
    const statusHasLink = /https:\/\/github\.com\/[^\s)]+\/pull\/\d+/.test(
      input.statusMarkdown ?? "",
    );
    const indexHasLink = /https:\/\/github\.com\/[^\s)]+\/pull\/\d+/.test(
      input.indexMarkdown ?? "",
    );
    if (!statusHasLink && !indexHasLink) {
      errors.push(
        "State PR_CREATED requires a Pull Request link in status.md or docs/features/INDEX.md.",
      );
    }
  }
}

function hasExecutionResults(testPlanMarkdown: string): boolean {
  const { body } = parseFrontmatter(testPlanMarkdown);
  const sections = parseSections(body);
  const finalResults = sections["Final results"];
  if (!finalResults) return false;
  const content = finalResults.content.trim();
  if (content.length < 20) return false;
  if (/^not executed/i.test(content)) return false;
  return true;
}

function isPlaceholderDocument(markdown: string): boolean {
  const { body } = parseFrontmatter(markdown);
  const trimmed = body.trim();
  if (trimmed.length < 50) return true;
  return /\bpending\b/i.test(trimmed) && trimmed.length < 200;
}

function buildNormalized(
  input: ValidateWorkflowStateInput,
  fm: Record<string, string | number | boolean | null>,
  currentState: string,
  nextAgent: string,
  doc: ReturnType<typeof parseStatusDoc>,
): NormalizedState {
  const contextPack = doc.contextPack ?? {
    nextAgent,
    requiredReading: [],
    optionalReading: [],
    doNotReadByDefault: [],
    relevantCodeAreas: [],
    relevantTests: [],
    knownConstraints: [],
    openQuestions: [],
    reasonForSelectedContext: "",
  };

  const cost = doc.costRecommendation ?? {
    recommendedAgent: nextAgent,
    recommendedModelMode: "",
    reasoningLevel: "",
    opusplan: "no",
    contextBudget: "",
    rationale: "",
  };

  return {
    featureId: input.featureId,
    issue: typeof fm.issue === "number" ? fm.issue : Number(fm.issue) || 0,
    branch: input.branch,
    commitSha: input.commitSha,
    currentState,
    currentAgent: typeof fm.current_agent === "string" ? fm.current_agent : "",
    nextAgent,
    blocked: fm.blocked === true,
    contextPack: {
      nextAgent: contextPack.nextAgent,
      requiredReading: contextPack.requiredReading,
      optionalReading: contextPack.optionalReading,
      knownConstraints: contextPack.knownConstraints,
      openQuestions: contextPack.openQuestions,
      reasonForSelectedContext: contextPack.reasonForSelectedContext,
    },
    costRecommendation: {
      recommendedAgent: cost.recommendedAgent,
      recommendedModelMode: cost.recommendedModelMode,
      reasoningLevel: cost.reasoningLevel,
      opusplan: /^(yes|true)$/i.test(cost.opusplan),
      contextBudget: cost.contextBudget,
      rationale: cost.rationale,
    },
  };
}
