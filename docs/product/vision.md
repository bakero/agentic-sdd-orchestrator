# Agentic SDD Orchestrator — Product Vision

## Problem

Teams want to use AI agents on real software repositories, but current workflows are fragile:

- prompts are copied manually;
- context is lost between agents;
- costs and token usage are hard to control;
- agents can drift outside scope;
- handoffs are not auditable;
- repositories lack a clear agent workflow state;
- CI does not usually validate agent workflow consistency.

## Product

Agentic SDD Orchestrator is a repository-connected platform that installs and coordinates a human-supervised Agentic SDD workflow.

A user connects a GitHub repository, chooses an automation mode, configures agents and model preferences, and uses the orchestrator to move work safely from idea to pull request.

## Core promise

Connect a repo, choose how much automation you want, configure your agents, and let the system guide work from issue to PR with traceability, cost control and human gates.

## Modes

### Cowork mode

The orchestrator generates the next prompt and runtime context.

A human or local tool such as Claude Cowork, Codex or Gemini executes that prompt manually or semi-assisted.

### API mode

Future mode.

The orchestrator executes agent steps through user-provided API keys, model choices and budget limits.

API mode must preserve human gates and cost controls.

## Core capabilities

- connect a GitHub repository;
- inspect whether the repo is ready for Agentic SDD;
- detect missing configuration;
- install or update a runtime kit;
- configure agent roles;
- configure model preferences per role;
- configure cost and context budgets;
- create and track work items;
- generate next actions;
- render prompts from versioned templates;
- validate workflow state through GitHub Actions;
- show workflow progress;
- record agent calls, costs and outcomes.

## Non-goals for v0

- no autonomous merge;
- no hidden agent execution;
- no unmanaged API spend;
- no source of truth outside GitHub and status.md;
- no dependency on a single AI provider;
- no silent changes to customer repositories.

## Initial milestone

Extract the semi-assisted runtime coordinator proven in events-app into an installable runtime kit.

The first product version should make the following possible:

1. connect or point to a target repo;
2. detect whether Agentic SDD runtime files are missing;
3. install the runtime kit;
4. create a first feature workflow;
5. generate the first next-agent prompt;
6. validate the workflow through GitHub Actions;
7. show the state and next action in the orchestrator.
