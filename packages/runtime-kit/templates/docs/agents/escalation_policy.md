# Agentic SDD Workflow — Escalation Policy

## Purpose

This document defines how questions, blockers, conflicts and human decisions move through the agent hierarchy.

## Escalation Path

Agents escalate upward only:

```text
Claude → Codex → Gemini → Human
```

The human interacts only with Gemini.

## Clarification vs Correction

Clarification happens before a deliverable is produced. Clarification loops do not count against correction loop limits.

Correction happens after a deliverable is produced and rejected. Correction loops are limited.

## Correction Loop Limits

```text
Claude ↔ Codex: maximum 2 correction cycles.
Codex ↔ Gemini: maximum 3 correction cycles.
```

If the limit is reached:

- Claude ↔ Codex exhausted → Codex escalates to Gemini.
- Codex ↔ Gemini exhausted → Gemini escalates to the human.

## Human Decision Required

Gemini sets `NEEDS_HUMAN_DECISION` when a human decision is required.

Gemini must present:

- decision required;
- brief context;
- impact of each option;
- recommendation;
- default option if applicable.

No agent may proceed until Gemini records the human decision in `decision_log.md` and updates `status.md`.

## Sensitive Decisions

Gemini must escalate to the human for decisions involving:

- cost;
- security;
- legal/compliance;
- permissions;
- functional scope;
- significant architecture;
- accepted technical debt;
- reduced testing;
- failed checks;
- cancellation;
- merge.

## Feature Conflict

If Gemini detects any possible overlap or conflict during preflight, it must set `POTENTIAL_FEATURE_CONFLICT` and ask the human.

The human may choose:

```text
CONTINUE
WAIT
MERGE_SCOPE
CANCEL
CREATE_DEPENDENCY
```

## Cancellation

Gemini may propose cancellation, but the human confirms.

Cancelled features keep their documentation folder for traceability.
