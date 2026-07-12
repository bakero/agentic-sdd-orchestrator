---
document: runtime_contracts_readme
last_updated: 2026-07-09
---

# `.agents/runtime/` — Versioned Runtime Contracts

This directory holds **versioned** contracts for the Agent Runtime Coordinator. Every file here is committed to the repository and reviewed like any other source file.

It must not be confused with `.agent_runtime/` (note the different name and no `s`): that directory holds **generated, local-only, gitignored** output produced by running the coordinator scripts. See `.gitignore` and `docs/agents/runtime_coordinator.md`.

## Files

| File | Purpose |
|---|---|
| `next_action.schema.json` | JSON Schema for `.agent_runtime/next_action.json`, the derived "what to do next" signal produced by `scripts/agent/resolve_next_action.ts`. |
| `next_action.example.json` | A worked example of a valid `next_action.json`, validated against the schema by `tests/agent/resolve_next_action.test.ts`. |
| `prompt_context.schema.json` | JSON Schema for the variable-substitution context consumed by `scripts/agent/render_agent_prompt.ts` when rendering a prompt template into `.agent_runtime/next_prompt.md`. |
| `next_prompt.example.md` | A worked example of a rendered prompt, showing what `.agent_runtime/next_prompt.md` looks like for a `claude-implementer` handoff. |

## Flow

```text
status.md
  |
  v
npm run agent:validate   -> .agent_runtime/validation_report.json
  |
  v
npm run agent:resolve    -> .agent_runtime/next_action.json
                          -> .agent_runtime/context_files.txt
  |
  v
npm run agent:prompt     -> .agent_runtime/next_prompt.md
  |
  v
Human / Claude Cowork / Codex / Gemini executes the generated prompt manually/semi-assisted.
```

`npm run agent:next` runs all three steps in sequence.

## Boundaries

- GitHub and `docs/features/<feature>/status.md` remain the source of truth. This directory and `.agent_runtime/` only hold derived contracts and derived output.
- The coordinator scripts never write to `status.md`, any feature document, or `.agents/prompts/`.
- The coordinator never calls an external AI API and never executes an agent autonomously — it only renders a prompt for a human or Claude Cowork to run.
- See `.agents/rules/runtime_coordinator.md` for the full guardrail list.
