export interface AgentCallEntry {
  timestamp: string;
  issue: number;
  feature: string;
  agent_role: string;
  tool: string;
  model: string | null;
  mode: string;
  reasoning_level: "low" | "medium" | "high";
  opusplan: boolean;
  context_budget: "XS" | "S" | "M" | "L" | "XL";
  result_state: string;
  notes: string;
  // Optional extended fields (cost_and_context_policy.md JSONL Log Shape).
  input_context_files?: string[];
  estimated_input_tokens?: number | null;
  reported_input_tokens?: number | null;
  reported_output_tokens?: number | null;
  reported_total_tokens?: number | null;
  credits_consumed?: number | null;
  duration_seconds?: number | null;
}

const REQUIRED_FIELDS: Array<keyof AgentCallEntry> = [
  "timestamp",
  "issue",
  "feature",
  "agent_role",
  "tool",
  "mode",
  "reasoning_level",
  "opusplan",
  "context_budget",
  "result_state",
  "notes",
];

const VALID_REASONING_LEVELS = new Set(["low", "medium", "high"]);
const VALID_CONTEXT_BUDGETS = new Set(["XS", "S", "M", "L", "XL"]);

export function validateAgentCallEntry(value: unknown): string[] {
  const errors: string[] = [];

  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return ["Agent call entry must be a JSON object."];
  }

  const entry = value as Record<string, unknown>;

  for (const field of REQUIRED_FIELDS) {
    if (entry[field] === undefined || entry[field] === null || entry[field] === "") {
      errors.push(`Agent call entry is missing required field "${field}".`);
    }
  }

  if (typeof entry.issue !== "undefined" && typeof entry.issue !== "number") {
    errors.push('Agent call entry field "issue" must be a number.');
  }
  if (typeof entry.opusplan !== "undefined" && typeof entry.opusplan !== "boolean") {
    errors.push('Agent call entry field "opusplan" must be a boolean.');
  }
  if (
    typeof entry.reasoning_level === "string" &&
    !VALID_REASONING_LEVELS.has(entry.reasoning_level)
  ) {
    errors.push('Agent call entry field "reasoning_level" must be low, medium, or high.');
  }
  if (
    typeof entry.context_budget === "string" &&
    !VALID_CONTEXT_BUDGETS.has(entry.context_budget)
  ) {
    errors.push('Agent call entry field "context_budget" must be one of XS, S, M, L, XL.');
  }

  return errors;
}

export function formatAgentCallLine(entry: AgentCallEntry): string {
  return `${JSON.stringify(entry)}\n`;
}
