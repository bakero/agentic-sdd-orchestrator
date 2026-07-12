# Agentic SDD Workflow — Context Strategy

## Purpose

This document defines how agents receive enough context to work correctly while minimizing token and credit usage.

The goal is not to give every agent all possible context. The goal is to provide the minimum sufficient context for each phase.

## Context Principles

1. Read less, but read better.
2. Use repository documentation as indexed knowledge, not as a large prompt dump.
3. Each handoff must include a Context Pack for the next agent.
4. Agents read only their Context Pack by default.
5. Historical feature folders are not read by default.
6. Additional context requires justification.

## Context Layers

Agents should consume context in layers.

### Layer 0 — Agent Rules

Always relevant:

- `.agents/rules/common_contract.md`;
- role-specific rule file under `.agents/rules/roles/`.

### Layer 1 — Project Knowledge

Used when needed by the current phase:

- `docs/knowledge/project_brief.md`;
- `docs/knowledge/architecture_map.md`;
- `docs/knowledge/context_manifest.md`;
- `docs/knowledge/testing_strategy.md`;
- `docs/knowledge/domain_glossary.md`;
- `docs/knowledge/active_constraints.md`.

### Layer 2 — Current Feature Documentation

Always relevant for a feature phase:

- `docs/features/<feature-id>-<slug>/status.md`;
- current phase document;
- documents explicitly listed in the Context Pack.

### Layer 3 — Area Knowledge

Read only if listed in the Context Pack or identified by `context_manifest.md`.

Examples:

- `docs/knowledge/areas/auth.md`;
- `docs/knowledge/areas/users.md`;
- `docs/knowledge/areas/projects.md`.

### Layer 4 — Code and Tests

Technical agents may inspect code and tests only within areas listed in the Context Pack.

### Layer 5 — Historical Feature Documentation

Historical features are preserved but not read by default.

They may be read only when:

- Gemini identifies a relationship through `docs/features/INDEX.md`;
- a previous feature is explicitly included in the Context Pack;
- a documented dependency requires it.

## Context Pack Format

Every handoff must include this section in `status.md`:

```markdown
## Context Pack for Next Agent

### Next agent
<agent-role>

### Required reading
- <file>

### Optional reading
- <file>

### Do not read by default
- <file-or-folder>

### Relevant code areas to inspect
- <path>

### Relevant tests to inspect or run
- <path-or-command>

### Known constraints
- <constraint>

### Open questions
- <question-id or None>

### Reason for selected context
<brief explanation>
```

## Additional Context Request

If an agent needs additional context, it must document:

- what information is missing;
- why it is needed;
- what risk exists if it continues without it;
- which file or folder it wants to inspect;
- whether this may increase scope or token usage.

The request should be added to `questions.md` or the agent’s phase document.

## Context Ownership

The agent delivering work prepares the Context Pack for the next agent:

- Gemini Product Owner → Codex Architect;
- Codex Architect → Claude Implementer;
- Claude Implementer → Codex Reviewer;
- Codex Reviewer → Gemini Functional Validator;
- Gemini Functional Validator → PR.

## Context Manifest

`docs/knowledge/context_manifest.md` is the primary token-saving map. It should map functional areas to documents, code and tests.

Agents must prefer the manifest over broad repository exploration.

## Machine-Validated Context Pack Fields

The Context Pack Format fields above are machine-validated inputs to the Agent Runtime Coordinator's `next_action` signal (see `docs/agents/runtime_coordinator.md`). `scripts/agent/validate_workflow_state.ts` structurally checks `### Next agent`, `### Required reading`, `### Optional reading`, `### Do not read by default`, `### Relevant code areas to inspect`, `### Relevant tests to inspect or run`, `### Known constraints`, `### Open questions`, and `### Reason for selected context`.

`### Targeted reading` and an inline `### Context budget` subsection (as still present in `docs/features/_template/status.md`) are legacy-compatible in v1: the validator tolerates their presence but does not require them. The canonical enforced context budget is the `Context budget` field under `## Next Agent Cost Recommendation`.
