---
document: runtime_coordinator
last_updated: 2026-07-09
---

# Agent Runtime Coordinator

## Purpose

The Agent Runtime Coordinator is a semi-assisted workflow/tooling layer on top of the Agentic SDD Workflow (see `docs/agents/workflow.md` and `docs/agents/common_contract.md`). It removes the manual step where a human reads `status.md`, checks required documents, hand-picks the right compact prompt, and fills in its variables.

Operating principle: **the coordinator may validate state, resolve the next action, and render a prompt. It may not skip phases, change workflow state by itself, merge PRs, call external AI APIs, or override `status.md`.** GitHub and `status.md` remain the source of truth; Claude Cowork is an operational coordinator, not workflow authority; the human remains final merge authority. See `.agents/rules/runtime_coordinator.md` for the full guardrail list.

## Operating flow

```text
status.md
  |
  v
npm run agent:next
  |
  +-- npm run agent:validate  -> scripts/agent/validate_workflow_state.ts
  |                              -> .agent_runtime/validation_report.json
  |
  +-- npm run agent:resolve   -> scripts/agent/resolve_next_action.ts
  |                              -> .agent_runtime/next_action.json
  |                              -> .agent_runtime/context_files.txt
  |
  +-- npm run agent:prompt    -> scripts/agent/render_agent_prompt.ts
                                 -> .agent_runtime/next_prompt.md
  |
  v
Human / Claude Cowork / Codex / Gemini executes the generated prompt manually/semi-assisted.
```

Each step can also be run individually (`npm run agent:validate`, `npm run agent:resolve`, `npm run agent:prompt`).

## Validation stage — `scripts/agent/validate_workflow_state.ts`

Reads `docs/features/<feature-id>/status.md` (feature id derived from the branch name, `feature/<feature-id>`, or `--feature=`) and validates:

- `status.md` exists and its frontmatter has all required fields;
- `current_state` is one of the allowed states (`.agents/runtime/workflow_contract.json.allowed_states`);
- `current_state` is reachable (via `workflow_contract.json.transitions`, possibly multi-hop through skipped `_IN_PROGRESS` states) from the `current_state` recorded in the previous commit's `status.md` on this branch, or is an allowed `entry_states` value when no previous feature state exists yet; `any_state_successors` (currently `NEEDS_HUMAN_DECISION`) bypass this check;
- the current branch HEAD commit SHA resolves successfully (`commit_sha` cannot be empty);
- `next_agent` is compatible with `current_state` for the five explicit handoff states (see "State → agent mapping" below);
- the Context Pack section is present, non-placeholder, and its `### Next agent` matches frontmatter `next_agent`;
- the Next Agent Cost Recommendation section is present and non-placeholder with valid enum values;
- the Agent Cost Log has at least one non-placeholder row with a complete latest entry;
- required phase documents exist with the expected `status: APPROVED` frontmatter for the state (see table below);
- `docs/issues/` does not exist;
- all five prompt templates under `.agents/prompts/` exist;
- both versioned runtime schemas under `.agents/runtime/` exist.

All failures are aggregated into a single report; the validator does not stop at the first failure. It writes `.agent_runtime/validation_report.json` (`{ ok, blocked, errors, normalized }`) and exits non-zero on any blocking error ("fail fast").

### Per-state required documents

| State | Required documents |
|---|---|
| `READY_FOR_TECHNICAL_SPEC` | `functional_spec.md` (`status: APPROVED`) |
| `READY_FOR_IMPLEMENTATION` | `technical_spec.md`, `test_plan.md` (both `status: APPROVED`) |
| `IMPLEMENTATION_READY_FOR_REVIEW` | `implementation_report.md`; `test_plan.md` must carry non-placeholder execution results |
| `READY_FOR_FUNCTIONAL_VALIDATION` | `technical_review.md` (`status: APPROVED`) |
| `READY_FOR_PR` | `functional_validation.md` (`status: APPROVED`), `pr_description.md` (non-placeholder) |
| `PR_CREATED` | a Pull Request link in `status.md` or `docs/features/INDEX.md` |

### Blocked states

`NEEDS_HUMAN_DECISION`, `POTENTIAL_FEATURE_CONFLICT`, `IMPLEMENTATION_BLOCKED`, `TECHNICAL_REVIEW_REJECTED`, `FUNCTIONAL_VALIDATION_REJECTED`, `PR_CREATED`, `MERGED`, `CANCELLED` are structurally valid but must never produce an executable prompt (see below).

## Resolution stage — `scripts/agent/resolve_next_action.ts`

Reads `.agent_runtime/validation_report.json` only (it does not re-read repository state). If the report is not `ok`, it refuses to resolve. If `current_state` is a blocked state, it logs why and exits `0` without writing `next_action.json` — this is expected, not a failure.

Otherwise it maps `current_state` to the next agent, prompt template, and expected forward `target_state`:

| `current_state` | `next_agent` | `prompt_template` | `target_state` |
|---|---|---|---|
| `READY_FOR_TECHNICAL_SPEC` | `codex-architect` | `.agents/prompts/codex_architect.md` | `READY_FOR_IMPLEMENTATION` |
| `READY_FOR_IMPLEMENTATION` | `claude-implementer` | `.agents/prompts/claude_implementer.md` | `IMPLEMENTATION_READY_FOR_REVIEW` |
| `IMPLEMENTATION_READY_FOR_REVIEW` | `codex-reviewer` | `.agents/prompts/codex_reviewer.md` | `READY_FOR_FUNCTIONAL_VALIDATION` (or `TECHNICAL_REVIEW_REJECTED`) |
| `READY_FOR_FUNCTIONAL_VALIDATION` | `gemini-functional-validator` | `.agents/prompts/gemini_functional_validator.md` | `READY_FOR_PR` (or `FUNCTIONAL_VALIDATION_REJECTED`) |
| `READY_FOR_PR` | `gemini-product-owner` | `.agents/prompts/gemini_product_owner.md` | `PR_CREATED` |

For states outside this table (discovery/preflight/in-progress phases), `next_agent` and `prompt_template` are still resolved from `status.md`'s own `next_agent` field so the tool remains usable across the whole workflow, not only the five handoff states.

It writes `.agent_runtime/next_action.json` (validated against `.agents/runtime/next_action.schema.json`, which requires `commit_sha`) and `.agent_runtime/context_files.txt` (one normalized repo-relative required-reading path per line — Markdown backticks and trailing parenthetical annotations are stripped, and non-path prose bullets are dropped, so the file is a literal path list rather than commentary copied from the Context Pack).

## Rendering stage — `scripts/agent/render_agent_prompt.ts`

Reads `.agent_runtime/next_action.json`, loads `next_action.prompt_template`, and substitutes `{{issue}}`, `{{feature}}`, `{{branch}}`, `{{current_state}}`, `{{next_agent}}`, `{{target_state}}`, `{{context_budget}}`, `{{reasoning_level}}`, `{{opusplan}}`, `{{prompt_template}}`, `{{required_reading_list}}`, `{{forbidden_actions_list}}`, and `{{expected_outputs_list}}` (see `.agents/runtime/prompt_context.schema.json`). Before rendering, it compares `next_action.commit_sha` to the current branch HEAD; if they don't match (or either is unresolved) it refuses to render and exits non-zero — this is the enforced stale-signal guard, not just documented convention. It fails if a required variable is missing or if any `{{...}}` placeholder remains unresolved after substitution. It writes `.agent_runtime/next_prompt.md` only — it never writes to `.agents/prompts/`, `docs/features/`, or `status.md`.

If `.agent_runtime/next_action.json` does not exist (blocked state, or `agent:resolve` has not run), it prints a message and exits `0` — nothing to render is not an error.

## Cost log utility — `scripts/agent/write_agent_call.ts`

Appends one validated JSON line to `docs/metrics/agent_calls.jsonl` (minimum fields: `timestamp`, `issue`, `feature`, `agent_role`, `tool`, `mode`, `reasoning_level`, `opusplan`, `context_budget`, `result_state`, `notes`; `model` and the extended token/credit fields may be `null`). It preserves existing lines and never reformats the file. It is a standalone operator utility, not wired into the guard workflow.

## GitHub Actions guard

`.github/workflows/agent-sdd-guard.yml` runs on `push` to `feature/**` and on `pull_request`. It checks out, installs dependencies, runs `npm run agent:validate` and `npm run agent:resolve`, then uploads whatever exists under `.agent_runtime/` as an artifact (for diagnostics only — this artifact is not a trust anchor and is not consumed automatically by anything). It requests only `contents: read` and contains no merge, PR, commit, or push steps, and no `agent:prompt` step (prompt rendering is a local/human step, not a CI concern).

## Non-goals

- No automatic merges or PR creation.
- No automatic invocation of agent models from within GitHub Actions or from the coordinator scripts.
- No mutation of `status.md`, `docs/features/*`, or `.agents/prompts/*` by the coordinator.
- No semantic validation of document content — only structural presence and declared frontmatter/field values.
