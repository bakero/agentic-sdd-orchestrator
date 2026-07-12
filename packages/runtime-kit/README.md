# Agentic SDD Runtime Kit

Installable runtime kit for target repositories.

This package contains the repository-local files required to run the Agentic SDD semi-assisted workflow.

## Purpose

The runtime kit makes a target repository compatible with the orchestrator by installing:

- agent rules and prompt templates;
- human-readable workflow documentation;
- feature workflow templates;
- metrics/logging files;
- runtime coordinator scripts;
- GitHub Actions guard workflow;
- versioned runtime schemas and examples.

## Source

The first version is extracted from:

- repository: `events-app`
- issue: `#6`
- PR: `#7`
- feature: semi-assisted Agent Runtime Coordinator

## Installed runtime layout

The kit is installed into a target repository using this layout:

- `.agents/`
- `docs/agents/`
- `docs/features/`
- `docs/metrics/`
- `scripts/agent/`
- `.github/workflows/agent-sdd-guard.yml`
- `.agent_runtime/` ignored by git

## Execution mode

Initial support is Cowork mode.

After installing the runtime kit, initializing a feature, and running `npm install` in the target repository, the target repo can run:

`npm run agent:next`

This validates workflow state, resolves the next action and renders the next prompt into:

`.agent_runtime/next_prompt.md`

A human or coworking tool then executes the generated prompt.

For the first feature handoff, `init-feature` seeds `BRANCH_INITIALIZED` so the first generated prompt targets Gemini Product Owner in Cowork mode.
