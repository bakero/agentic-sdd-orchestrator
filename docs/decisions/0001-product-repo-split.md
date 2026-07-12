# ADR 0001 — Split orchestrator product from sandbox repositories

## Status

Accepted

## Context

The initial Agentic SDD workflow was prototyped inside `events-app`.

That repository is useful as a sandbox, but the long-term product is not the application created inside the sandbox. The product is the orchestrator that can be installed against any target repository.

Keeping the orchestrator product inside a sandbox application would make it harder to evolve, package, sell and reuse.

## Decision

Create a dedicated repository:

`agentic-sdd-orchestrator`

Use `events-app` as the first sandbox repository and validation target.

The product repository will contain:
- product vision;
- architecture;
- runtime kit templates;
- CLI;
- dashboard;
- agent registry;
- repository adapters;
- cost/context governance;
- installation and onboarding flows.

Target repositories will receive only the runtime kit needed to operate:
- `.agents/`;
- `docs/agents/`;
- `docs/features/`;
- `docs/metrics/`;
- `scripts/agent/`;
- `.github/workflows/agent-sdd-guard.yml`;
- generated local `.agent_runtime/`.

## Consequences

Positive:
- the orchestrator can evolve as its own product;
- sandbox apps remain disposable and replaceable;
- runtime kit installation can be tested against multiple repositories;
- commercial packaging becomes possible;
- agent roles and cost policies can be reused across clients.

Trade-offs:
- extraction work is required;
- versioning between orchestrator and installed runtime kits must be managed;
- migrations will eventually be needed for repositories with older runtime kits.

## First extraction source

The first runtime kit source is:

- repository: `events-app`
- issue: `#6`
- PR: `#7`
- feature: semi-assisted Agent Runtime Coordinator
