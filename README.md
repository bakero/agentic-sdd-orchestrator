# Agentic SDD Orchestrator

A repository-connected orchestration platform for human-supervised AI agent workflows.

The goal is to let a user connect a GitHub repository, detect missing setup, install an Agentic SDD runtime kit, configure agents/models/cost policies, and coordinate work through either:

- Cowork mode: generated prompts executed manually or semi-assisted in tools such as Claude Cowork, Codex, Gemini or similar.
- API mode: future direct execution through user-provided model API keys, with explicit cost controls and human gates.

## Core principles

- GitHub remains the source of truth for issues, pull requests and merge state.
- `status.md` remains the source of truth for feature workflow state.
- The orchestrator may validate state, resolve next actions and render prompts.
- The orchestrator must not silently override workflow state.
- Human final merge remains required.
- Cost and context usage must be visible, logged and optimizable.

## Initial target

The first milestone is to extract the semi-assisted runtime coordinator proven in `events-app` into an installable runtime kit.

## Current MVP status

The local Cowork-mode MVP is now oriented around four steps:

1. Inspect and install the runtime kit into a target repository.
2. Initialize the first feature folder and feature branch with `init-feature`.
3. Run `npm install` in the target repository.
4. Run `npm run agent:next` to generate `.agent_runtime/next_prompt.md` for a human-supervised coworking tool.

See [packages/cli/docs/end-to-end-cowork-mvp.md](./packages/cli/docs/end-to-end-cowork-mvp.md) for the operational quickstart.
