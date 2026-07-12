import type { NextAction } from "./resolve";

export interface PromptContext {
  issue: string;
  feature: string;
  branch: string;
  current_state: string;
  next_agent: string;
  target_state: string;
  context_budget: string;
  reasoning_level: string;
  opusplan: string;
  prompt_template: string;
  required_reading_list: string;
  forbidden_actions_list: string;
  expected_outputs_list: string;
}

function toBulletList(items: string[]): string {
  if (items.length === 0) return "- None.";
  return items.map((item) => `- ${item}`).join("\n");
}

export function buildPromptContext(nextAction: NextAction): PromptContext {
  return {
    issue: String(nextAction.issue),
    feature: nextAction.feature,
    branch: nextAction.branch,
    current_state: nextAction.current_state,
    next_agent: nextAction.next_agent,
    target_state: nextAction.target_state ?? "Pending",
    context_budget: nextAction.context_budget,
    reasoning_level: nextAction.reasoning_level,
    opusplan: nextAction.opusplan ? "yes" : "no",
    prompt_template: nextAction.prompt_template ?? "",
    required_reading_list: toBulletList(nextAction.required_reading),
    forbidden_actions_list: toBulletList(nextAction.forbidden_actions),
    expected_outputs_list: toBulletList(nextAction.expected_outputs),
  };
}

export interface RenderResult {
  ok: boolean;
  errors: string[];
  rendered: string | null;
}

const REQUIRED_CONTEXT_FIELDS: Array<keyof PromptContext> = [
  "issue",
  "feature",
  "branch",
  "current_state",
  "next_agent",
  "target_state",
  "context_budget",
  "reasoning_level",
  "opusplan",
  "prompt_template",
  "required_reading_list",
  "forbidden_actions_list",
  "expected_outputs_list",
];

export function renderPromptTemplate(
  template: string,
  context: PromptContext,
): RenderResult {
  const errors: string[] = [];

  for (const field of REQUIRED_CONTEXT_FIELDS) {
    if (!context[field] || context[field].trim() === "") {
      errors.push(`Prompt render context is missing required variable "${field}".`);
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors, rendered: null };
  }

  let rendered = template;
  for (const field of REQUIRED_CONTEXT_FIELDS) {
    rendered = rendered.split(`{{${field}}}`).join(context[field]);
  }

  const unresolved = rendered.match(/\{\{[a-zA-Z0-9_]+\}\}/g);
  if (unresolved && unresolved.length > 0) {
    return {
      ok: false,
      errors: [`Unresolved template variables remain: ${dedupe(unresolved).join(", ")}`],
      rendered: null,
    };
  }

  return { ok: true, errors: [], rendered };
}

function dedupe(items: string[]): string[] {
  return Array.from(new Set(items));
}
