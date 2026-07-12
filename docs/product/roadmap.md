# Agentic SDD Orchestrator — Roadmap

## Milestone 0 — Product foundation

Goal: define the product, repository structure and extraction strategy.

Deliverables:
- product vision;
- architecture overview;
- initial decision records;
- runtime kit extraction plan;
- sandbox repository strategy.

Status:
IN_PROGRESS

## Milestone 1 — Runtime Kit extraction

Goal: extract the proven Agentic SDD runtime from events-app into an installable package/template.

Deliverables:
- runtime kit file manifest;
- installer strategy;
- versioned runtime templates;
- validation scripts;
- prompt renderer;
- GitHub Actions guard;
- example installed repo.

Target source:
events-app PR #7 / Issue #6

## Milestone 2 — Local CLI

Goal: provide a CLI that can inspect and prepare a target repository.

Example commands:
- agentic-sdd inspect <repo-path>
- agentic-sdd install <repo-path>
- agentic-sdd next <repo-path>
- agentic-sdd status <repo-path>

Deliverables:
- repo readiness scanner;
- missing configuration report;
- runtime kit installer;
- next prompt generator;
- local status view.

## Milestone 3 — Cowork mode dashboard

Goal: provide a simple app to manage connected repositories and semi-assisted agent work.

Deliverables:
- connected repo list;
- workflow status screen;
- next action screen;
- generated prompt viewer;
- task creation;
- agent role configuration;
- basic cost log display.

## Milestone 4 — Agent/model configuration

Goal: configure roles, tools, model preferences and cost policies per repository.

Deliverables:
- agent registry;
- model registry;
- per-role configuration;
- context budget rules;
- token/credit logging;
- cost minimization recommendations.

## Milestone 5 — API mode

Goal: execute agent steps through user-provided API keys while preserving human gates.

Deliverables:
- provider adapters;
- API key management;
- budget limits;
- execution queue;
- approval gates;
- audit trail.

## Milestone 6 — Commercial packaging

Goal: make the orchestrator installable and usable by other teams.

Deliverables:
- installation docs;
- onboarding flow;
- example repos;
- pricing assumptions;
- security model;
- export/import of agent templates.
