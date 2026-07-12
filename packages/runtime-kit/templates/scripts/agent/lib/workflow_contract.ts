export interface WorkflowContract {
  schema_version: string;
  allowed_states: string[];
  terminal_states: string[];
  entry_states: string[];
  any_state_successors: string[];
  transitions: Record<string, string[]>;
  [key: string]: unknown;
}

/**
 * `.agents/runtime/workflow_contract.json` is reused only for its
 * `allowed_states` list, so the coordinator has a single versioned source
 * for "is this a known workflow state" instead of duplicating the state
 * list from common_contract.md §7 inline in scripts.
 */
export function parseWorkflowContract(raw: string): WorkflowContract {
  return JSON.parse(raw) as WorkflowContract;
}
