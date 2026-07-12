---
document: runtime_coordinator_rules
last_updated: 2026-07-09
---

# Agent Runtime Coordinator — Guardrails

## Purpose

The Agent Runtime Coordinator is a **semi-assisted** local tool. It validates the Agentic SDD workflow state, resolves the next action, and renders the next agent's prompt from versioned templates. A human, or Claude Cowork acting on the human's behalf, then executes the generated prompt manually. The coordinator never executes an agent by itself.

## Source of truth

- GitHub and `docs/features/<feature>/status.md` are the source of truth. The coordinator only reads them; it never writes to them.
- Claude Cowork is an **operational coordinator**, not workflow authority. It runs the coordinator scripts and hands the generated prompt to a human or to itself for manual/semi-assisted execution — it does not decide workflow state on its own.
- GitHub Actions (`agent-sdd-guard.yml`) **validates** state on `push`/`pull_request`; it does not autonomously execute agents.
- The human remains the final merge authority. Nothing in this coordinator creates, approves, or merges a Pull Request.

## What "semi-assisted automation" means

Semi-assisted automation means **prompt generation and validation, not autonomous execution**. The Runtime Coordinator may:

- validate that `status.md` and required phase documents are structurally sound for the current state;
- resolve the next action (next agent, target state, cost/context recommendation, forbidden actions, expected outputs);
- render that resolved action into a ready-to-paste prompt from a versioned template under `.agents/prompts/`.

The Runtime Coordinator may **not**:

- skip phases or change `status.md`'s `current_state` by itself;
- merge Pull Requests or perform any Git write operation (commit, push, branch mutation);
- call an external AI API or execute an agent autonomously;
- override `status.md`, a GitHub Issue, or a PR check.

## Generated vs. versioned files

- `.agents/runtime/` is **versioned**: JSON Schemas and worked examples for the `next_action` contract and the prompt render context. Committed like any other source file.
- `.agents/prompts/` is **versioned**: the prompt templates themselves. Agents must not modify their own prompt template during execution — a template is edited only as a deliberate, reviewed change to the workflow, never as a side effect of running a phase.
- `.agent_runtime/` is **generated locally and gitignored**. `npm run agent:next` (or the individual `agent:validate` / `agent:resolve` / `agent:prompt` steps) writes `validation_report.json`, `next_action.json`, `context_files.txt`, and `next_prompt.md` here. None of these files are ever committed.

## If a generated prompt conflicts with status.md

`status.md` wins. If `.agent_runtime/next_action.json`'s `branch`/`current_state` no longer match the checked-out branch or the current `status.md`, the generated prompt is stale: discard it, re-run `npm run agent:next`, and do not execute the stale prompt. Execution must stop rather than proceed on outdated state.

This is enforced, not just documented convention: `next_action.json` carries a `commit_sha` bound to the branch HEAD at validation time, and `render_agent_prompt.ts` refuses to render (`exit 1`) whenever that `commit_sha` does not match the current branch HEAD. A stale signal cannot silently produce a rendered prompt.

## Transition-reachability guard

`validate_workflow_state.ts` does not accept `current_state` on membership in the allowed-state list alone. It also checks that `current_state` is reachable — possibly through several hops, since agents typically commit only the received handoff state and the resulting outcome state and skip the transient `_IN_PROGRESS` state in between — from the `current_state` recorded in the previous commit's `status.md` on this branch (`workflow_contract.json.transitions`), or is an allowed `entry_states` value on the branch's first validated state. `NEEDS_HUMAN_DECISION` (`any_state_successors`) is reachable from any state by design.

## Blocked and terminal states never render a prompt

`resolve_next_action.ts` refuses to generate `.agent_runtime/next_action.json` (and therefore `render_agent_prompt.ts` has nothing to render) whenever `current_state` is one of: `NEEDS_HUMAN_DECISION`, `POTENTIAL_FEATURE_CONFLICT`, `IMPLEMENTATION_BLOCKED`, `TECHNICAL_REVIEW_REJECTED`, `FUNCTIONAL_VALIDATION_REJECTED`, `PR_CREATED`, `MERGED`, `CANCELLED`. These require a human decision, a correction cycle, or are already final — the coordinator only reports the state and stops.
