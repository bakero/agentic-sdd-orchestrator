# Agentic SDD Workflow — Cost and Context Policy

## Purpose

Control token, credit and context usage across the Agentic SDD Workflow.

Use the cheapest effective model/mode and the smallest sufficient context while preserving correctness.

## Core Rules

1. Use the cheapest effective model/mode.
2. Prefer `.agents/prompts/` templates over long ad hoc prompts.
3. Read only the Context Pack in `status.md` by default.
4. Prefer section-level reading over full-file reading when possible.
5. Escalate reasoning/model only when risk justifies cost.
6. Record meaningful agent calls in `docs/metrics/agent_calls.jsonl`.
7. If exact token/credit usage is unavailable, record estimates and set exact fields to `null`.
8. Do not use high reasoning for targeted re-checks unless a new ambiguity appears.

## Default Model / Reasoning Policy

| Phase | Default | Escalate when | Avoid |
|---|---|---|---|
| Gemini Product Owner discovery | low/medium | ambiguous product tradeoff | high reasoning for simple Q&A |
| Functional spec writing | medium | complex domain | opus/planning modes |
| Codex Architect | medium | foundational architecture, security, data model | full repo reads |
| Claude Implementer small feature | medium/Sonnet | unclear multi-file implementation | Opus when spec is complete |
| Claude Implementer scaffold | opusplan + Sonnet/high planning | foundational scaffold | low reasoning only |
| Codex Reviewer first pass | medium/high | large diff or data/security risk | fixing code |
| Codex Reviewer targeted re-review | low/medium | new failures | high reasoning by default |
| Gemini Functional Validator | medium | UX ambiguity or scope conflict | full codebase reads |

## Context Budgets

| Budget | Use |
|---|---|
| XS | 1-2 files or targeted sections |
| S | rules + status + one phase doc |
| M | rules + status + phase docs + selected tests |
| L | feature docs + selected code areas |
| XL | foundational features only or human-approved broad context |

## Required Handoff Sections

Every `status.md` handoff should include:

```markdown
## Next Agent Cost Recommendation

Recommended agent:
Recommended model/mode:
Reasoning level:
Opusplan:
Context budget:
Rationale:
```

Feature status should include:

```markdown
## Agent Cost Log

| Phase | Agent | Model/mode | Reasoning | Context budget | Result | Notes |
|---|---|---|---|---|---|---|
```

## JSONL Log Shape

Append one object per meaningful call to `docs/metrics/agent_calls.jsonl`:

```json
{"timestamp":"2026-07-08T12:34:00Z","issue":4,"feature":"agentic-sdd-cost-context-control","agent_role":"codex-reviewer","tool":"antigravity","model":"unknown","mode":"review","reasoning_level":"medium","opusplan":false,"context_budget":"S","input_context_files":["status.md"],"estimated_input_tokens":4000,"reported_input_tokens":null,"reported_output_tokens":null,"reported_total_tokens":null,"credits_consumed":null,"duration_seconds":null,"result_state":"READY_FOR_FUNCTIONAL_VALIDATION","notes":"Targeted re-review"}
```

## Escalation Rules

Escalate only when correctness, architecture, security, data, scope or rework risk justifies cost.

Downgrade when the task is targeted verification, the spec is complete, or a previous high-reasoning call already produced a plan.

## Hard Stops

Stop and escalate if required context exceeds the declared budget, scope is unclear, token/credit budget is close to exhaustion, or full-repo reading would be needed without justification.

## Runtime Coordinator Cost Fields

`.agent_runtime/next_action.json` carries `context_budget`, `reasoning_level`, and `opusplan` copied verbatim from the current phase's `## Next Agent Cost Recommendation` in `status.md` — it does not compute its own values. Keeping `status.md`'s cost recommendation accurate is what keeps the generated prompt's cost guidance accurate; the Runtime Coordinator is a read-through, not an independent cost estimator. See `docs/agents/runtime_coordinator.md`.
