# Runtime Kit Extraction Plan

## Goal

Extract the semi-assisted Agent Runtime Coordinator from `events-app` into an installable runtime kit for target repositories.

## Source

- source repository: `events-app`
- source PR: `#7`
- source issue: `#6`
- source feature branch: `feature/6-agent-runtime-coordinator`
- merged into: `main`

## Extraction principles

- Extract generic workflow assets.
- Do not extract application-specific project code.
- Keep `events-app` as the first sandbox reference.
- Preserve safety guarantees:
  - GitHub and `status.md` remain source of truth;
  - no autonomous execution;
  - no automatic merge;
  - no external AI API calls in Cowork mode;
  - generated `.agent_runtime/` files are ignored by git;
  - stale `next_action` protection through `commit_sha`;
  - transition reachability validation.

## Assets to extract

### Agent assets

- `.agents/prompts/`
- `.agents/rules/`
- `.agents/runtime/`

### Documentation assets

- `docs/agents/`
- `docs/features/_template/`
- `docs/metrics/README.md`
- `docs/metrics/agent_calls.jsonl`

### Runtime scripts

- `scripts/agent/`

### CI assets

- `.github/workflows/agent-sdd-guard.yml`

### Tests

- `tests/agent/`

## Assets not to extract

- `src/`
- `prisma/`
- `e2e/`
- `tests/unit/projects/`
- `tests/integration/projects/`
- application-specific package scripts unrelated to Agentic SDD
- project-specific feature folders except as examples

## Target location

Extract runtime kit files into:

- `packages/runtime-kit/templates/`

The installed layout inside a target repo should mirror the final runtime layout.

## First validation

Install the extracted runtime kit into a clean sandbox repo and verify:

- `npm run agent:validate`
- `npm run agent:resolve`
- `npm run agent:prompt`
- `npm run agent:next`
- GitHub Actions guard
