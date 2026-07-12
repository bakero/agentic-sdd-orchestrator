# Runtime Kit Source Manifest

## Source repository

`events-app`

## Source baseline

- Issue: `#6`
- Pull request: `#7`
- Merged into: `main`
- Source feature: `feature/6-agent-runtime-coordinator`

## Runtime kit source paths

### Agent prompts

- `.agents/prompts/claude_implementer.md`
- `.agents/prompts/codex_architect.md`
- `.agents/prompts/codex_reviewer.md`
- `.agents/prompts/gemini_functional_validator.md`
- `.agents/prompts/gemini_product_owner.md`

### Agent rules

- `.agents/rules/`
- `.agents/rules/runtime_coordinator.md`

### Runtime contracts

- `.agents/runtime/README.md`
- `.agents/runtime/next_action.schema.json`
- `.agents/runtime/next_action.example.json`
- `.agents/runtime/prompt_context.schema.json`
- `.agents/runtime/next_prompt.example.md`

### Human documentation

- `docs/agents/`
- `docs/features/_template/`
- `docs/metrics/README.md`
- `docs/metrics/agent_calls.jsonl`

### Runtime scripts

- `scripts/agent/`

### CI workflow

- `.github/workflows/agent-sdd-guard.yml`

### Runtime tests

- `tests/agent/`

## Excluded source paths

- `src/`
- `prisma/`
- `e2e/`
- `tests/unit/projects/`
- `tests/integration/projects/`
- feature-specific folders except as optional examples

## Notes

The runtime kit must remain generic.

Any references to `events-app`, project-specific entities, or application-specific project logic must be removed or converted into templates before the kit is considered installable.
