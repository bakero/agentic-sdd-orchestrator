# Agentic SDD Orchestrator — Architecture Overview

## Product architecture

The orchestrator is split into two layers:

1. Product layer
2. Installed runtime kit

## 1. Product layer

The product layer lives in the `agentic-sdd-orchestrator` repository.

It will contain:

- web dashboard;
- local/API backend;
- CLI;
- repository adapters;
- runtime kit installer;
- agent registry;
- model registry;
- prompt renderer;
- cost and context engine;
- task/workflow views.

The product layer coordinates repositories but should not silently take ownership of the target repository workflow.

## 2. Installed runtime kit

The runtime kit is installed into each target repository.

It contains the minimum files needed to make a repository compatible with the Agentic SDD workflow:

- `.agents/` for agent rules, prompts and runtime contracts;
- `docs/agents/` for human-readable workflow documentation;
- `docs/features/` for feature-level workflow state;
- `docs/metrics/` for agent call and cost logs;
- `scripts/agent/` for local validation, next action resolution and prompt rendering;
- `.github/workflows/agent-sdd-guard.yml` for CI validation;
- `.agent_runtime/` for generated local runtime outputs, ignored by git.

## Source of truth

The orchestrator must preserve the following hierarchy:

1. GitHub Issues and Pull Requests are the source of truth for repository work items and merge state.
2. `docs/features/<feature>/status.md` is the source of truth for the feature workflow state.
3. Runtime-generated files under `.agent_runtime/` are disposable outputs.
4. The dashboard reflects state; it does not silently override it.

## Execution modes

### Cowork mode

The orchestrator generates prompts and context files.

A human or local coworking agent executes the generated prompt.

This is the first supported mode.

### API mode

Future mode.

The orchestrator executes agent roles through model provider APIs using user-supplied credentials, cost limits and explicit gates.

## Target architecture

agentic-sdd-orchestrator/
  apps/
    web/
  packages/
    runtime-kit/
    cli/
    core/
    github-adapter/
    agent-registry/
    prompt-renderer/
    cost-engine/
  templates/
  examples/
  docs/

## First implementation strategy

The first implementation should extract the runtime kit from `events-app` PR #7 into `packages/runtime-kit`.

The first CLI should support:

- inspect target repo;
- report missing setup;
- install runtime kit;
- generate next prompt;
- show current workflow state.

## Safety principles

- no autonomous merge;
- no hidden model calls;
- no unmanaged API spend;
- no generated runtime files committed;
- no source-of-truth override from the dashboard;
- no agent execution without explicit human or API-mode authorization.
