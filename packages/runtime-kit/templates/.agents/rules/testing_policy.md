# Agentic SDD Workflow — Testing Policy

## Purpose

This document defines when and how agents must use tests and checks during the feature workflow.

## Baseline Checks

Before PR creation, the following checks must be green:

- unit tests;
- required e2e tests;
- lint;
- typecheck;
- build;
- security scan if configured.

## Before Implementation

Claude Implementer must verify that the existing project baseline is not already broken.

If existing tests or required checks fail before implementation starts:

1. Claude must not implement the feature.
2. Claude documents the failure in `implementation_report.md`.
3. Claude escalates to Codex Reviewer or Codex Architect.
4. Codex escalates to Gemini if the feature cannot proceed.
5. Gemini asks the human if a decision is required.

## During Implementation

Claude should run targeted tests while implementing:

- unit tests for affected modules;
- typecheck if TypeScript contracts changed;
- lint for changed files if available;
- focused integration tests if data/API behavior changed.

## Before Technical Review

Claude must run all checks required by the `test_plan.md` for the implementation phase and update test statuses.

## Before PR

Gemini may create the PR only after required checks are green:

- complete unit test suite;
- required e2e tests;
- lint;
- typecheck;
- build;
- security scan if configured.

E2E tests must always run before PR creation. They do not need to run after every intermediate commit.

## Test Types

Use these test types when applicable:

- **Unit tests**: required for business logic, validation logic, data mapping and isolated functions.
- **Integration tests**: required when APIs, database, external services, queues, events or persistence are affected.
- **E2E tests**: required when user-facing flows, UI, routes, forms or navigation are affected.
- **Contract tests**: required when API contracts, webhooks or frontend/backend contracts are affected.
- **Migration tests**: required when database schema migrations are introduced.
- **Permission tests**: required when authentication, authorization, roles or data visibility are affected.
- **Regression tests**: required when fixing or protecting previously observed behavior.
- **Smoke tests**: recommended for critical flows before PR or deploy.
- **Accessibility tests**: required when relevant UI behavior or accessibility-sensitive components change.
- **Performance tests**: required only when heavy queries, critical endpoints, batch jobs or performance-sensitive paths are changed.
- **Security tests**: required when auth, permissions, sensitive data, tokens, uploads, payments or integrations are affected.

## Acceptance Criteria Mapping

Every acceptance criterion must be mapped in `test_plan.md` to one or more tests.

Allowed coverage statuses:

```text
NOT_COVERED
PLANNED
IMPLEMENTED
PASSED
FAILED
NOT_APPLICABLE
```

An acceptance criterion cannot remain unaddressed. It must be covered, justified as not applicable, or marked as not covered with a blocking reason.
