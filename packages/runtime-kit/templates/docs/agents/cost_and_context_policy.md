# Agentic SDD Workflow — Cost and Context Policy

## Purpose

This policy controls token, credit and context usage across the Agentic SDD Workflow.

The goal is to resolve each phase with the cheapest effective model and the smallest sufficient context while preserving correctness, traceability and safety.

## Core Rules

1. Use the cheapest effective model/mode for the task.
2. Prefer compact prompt templates over long ad hoc prompts.
3. Read only the Context Pack in `status.md` by default.
4. Prefer section-level reading over full-file reading when tools allow it.
5. Escalate model/mode only when the task complexity justifies the cost.
6. Record every meaningful agent call in the Agent Cost Log.
7. If exact token/credit usage is unavailable, record estimates and leave exact fields as `null`.
8. Do not use high reasoning or planning modes for targeted re-checks unless a new ambiguity appears.

## Required Pre-Call Declaration

Before acting, each agent should declare or infer:

```text
agent_role:
task_type:
scope:
reasoning_need:
recommended_model_or_mode:
context_budget:
expected_outputs:
```

The declaration can be brief and may be recorded in `status.md` or the phase document.

## Default Model / Reasoning Policy

| Phase | Default mode | Escalate when | Avoid |
|---|---|---|---|
| Gemini Product Owner discovery | low/medium | ambiguous product tradeoff | high reasoning for simple Q&A |
| Functional spec writing | medium | complex domain or many edge cases | opus/planning modes |
| Codex Architect | medium | foundational architecture, data model, security, cross-cutting design | reading full repo |
| Claude Implementer small feature | medium/Sonnet | multi-file uncertainty or unclear spec | Opus if technical_spec is complete |
| Claude Implementer scaffold/foundation | opusplan + Sonnet or high planning | many interacting files and CI/test setup | pure low-reasoning execution |
| Codex Reviewer first pass | medium/high | large diff, security/data risk | fixing code directly |
| Codex Reviewer targeted re-review | low/medium | new failures or unresolved ambiguity | high reasoning by default |
| Gemini Functional Validator | medium | UX ambiguity or scope conflict | reading full codebase |

## Context Budget Levels

| Budget | Meaning | Typical use |
|---|---|---|
| XS | 1-2 files or targeted sections | targeted re-review, small status sync |
| S | rules + status + one phase doc | simple handoff or validation |
| M | rules + status + phase docs + selected tests | architecture, review, validation |
| L | multiple feature docs + selected code areas | implementation or first technical review |
| XL | broad repository context | only foundational features or explicit human approval |

Agents must avoid XL unless the feature is foundational or the current phase cannot be completed safely with less context.

## Context Pack Structure

Each `status.md` Context Pack must separate:

```markdown
### Required reading
Files or sections the next agent must read.

### Targeted reading
Files or sections to read only if needed.

### Optional reading
Background files that may help but are not required.

### Do not read by default
Historical folders, unrelated docs, generated files or full-repo areas.

### Context budget
XS/S/M/L/XL plus short rationale.
```

## Next Agent Cost Recommendation

Each handoff should include:

```markdown
## Next Agent Cost Recommendation

Recommended agent: <role>
Recommended model/mode: <model or mode>
Reasoning level: low|medium|high
Opusplan: yes|no
Context budget: XS|S|M|L|XL
Rationale: <why this is the cheapest effective option>
```

## Agent Cost Log

Feature `status.md` should include a compact table:

```markdown
## Agent Cost Log

| Phase | Agent | Model/mode | Reasoning | Context budget | Result | Notes |
|---|---|---|---|---|---|---|
```

Repository-wide detailed records live in:

```text
docs/metrics/agent_calls.jsonl
```

## JSONL Record Shape

Use one JSON object per call:

```json
{
  "timestamp": "2026-07-08T12:34:00Z",
  "issue": 4,
  "feature": "agentic-sdd-cost-context-control",
  "agent_role": "codex-reviewer",
  "tool": "antigravity",
  "model": "unknown",
  "mode": "review",
  "reasoning_level": "medium",
  "opusplan": false,
  "context_budget": "S",
  "input_context_files": ["status.md", "technical_review.md"],
  "estimated_input_tokens": 4000,
  "reported_input_tokens": null,
  "reported_output_tokens": null,
  "reported_total_tokens": null,
  "credits_consumed": null,
  "duration_seconds": null,
  "result_state": "READY_FOR_FUNCTIONAL_VALIDATION",
  "notes": "Targeted re-review after corrective commit"
}
```

## Escalation Rules

Escalate to a more expensive model or reasoning level only when one of these is true:

- the current model cannot resolve the task correctly;
- architecture, security, data model or scope risk is material;
- the agent detects conflicting documentation;
- the next action could create expensive rework;
- the human explicitly authorizes higher-cost processing.

Downgrade to cheaper mode when:

- the task is a targeted verification;
- the spec is complete and the work is mechanical;
- only one or two files need inspection;
- a previous high-reasoning call already produced a plan.

## Hard Stops

An agent must stop and ask for escalation if:

- required context exceeds the declared budget materially;
- exact task scope is unclear;
- the cheapest effective model recommendation conflicts with tool limits;
- token/credit budget is close to exhaustion;
- proceeding would require reading the full repo without justification.

## Runtime Coordinator Cost Fields

`.agent_runtime/next_action.json` carries `context_budget`, `reasoning_level`, and `opusplan` copied verbatim from the current phase's `## Next Agent Cost Recommendation` in `status.md` — it does not compute its own values. Keeping `status.md`'s cost recommendation accurate is what keeps the generated prompt's cost guidance accurate; the Runtime Coordinator is a read-through, not an independent cost estimator. See `docs/agents/runtime_coordinator.md`.
