# Agentic SDD Workflow — Workflow

## Purpose

This document describes the end-to-end workflow for new feature development.

The workflow is rigid by default. Each phase must produce or update its required artifacts before the next phase begins.

Every phase must also follow the Cost and Context Policy: use the cheapest effective model/mode, read only the required Context Pack by default, and record meaningful agent calls.

## Phase 0 — Cost and Context Preflight

Before each agent acts, it must infer or declare:

- task type;
- scope;
- reasoning need;
- recommended model/mode;
- context budget;
- required outputs.

The agent must read `.agents/rules/cost_and_context_policy.md` if it has not already been loaded for the session.

Agents must prefer compact prompts from `.agents/prompts/` and should not paste long role instructions when the same template is available.

Before each agent phase, a human or Claude Cowork may run `npm run agent:next` (or its steps individually: `agent:validate`, `agent:resolve`, `agent:prompt`). The Runtime Coordinator may validate workflow state, resolve the next action, render the next prompt, and produce local runtime files under `.agent_runtime/`. It may not skip phases, change `current_state` by itself, execute agents autonomously, or merge PRs — see `docs/agents/runtime_coordinator.md`.

## Phase 1 — Human Intake with Gemini Product Owner

The human describes a new feature idea to Gemini in Spanish.

Gemini asks only the necessary functional questions until it has the minimum issue summary:

- provisional feature name;
- problem solved;
- affected user or user type;
- expected result;
- initial scope;
- main open question, if any.

Gemini then creates a real GitHub Issue in the remote repository. The Issue acts as the visible control panel for the feature.

Gemini must not create a local Markdown file as an issue substitute. The workflow does not use `docs/issues/`.

If Gemini cannot create the real GitHub Issue, it must stop and escalate to the human with `NEEDS_HUMAN_DECISION`.

Initial state: `IDEA_CAPTURED`.

## Phase 2 — Functional Discovery

Gemini continues discovery and creates a complete `functional_spec.md`.

The functional spec must include testable acceptance criteria. If acceptance criteria are missing or not testable, the feature cannot move to architecture.

Gemini also records the initial Agent Cost Log row and prepares the first Next Agent Cost Recommendation.

During this phase Gemini owns:

- `functional_spec.md`;
- relevant entries in `questions.md`;
- relevant entries in `decision_log.md`.

## Phase 3 — Functional Preflight

Before branch creation, Gemini performs preflight using:

- `docs/features/INDEX.md`;
- open GitHub Issues;
- active `feature/*` branches;
- open Pull Requests;
- `docs/knowledge/context_manifest.md`.

If any possible overlap is found, Gemini sets `POTENTIAL_FEATURE_CONFLICT` and asks the human.

If no conflict exists, Gemini moves to `READY_TO_BRANCH`.

## Phase 4 — Branch and Documentation Initialization

Gemini creates:

- the feature branch;
- the feature documentation folder;
- all feature document templates;
- an entry in `docs/features/INDEX.md`.

The feature branch and feature documentation folder must not be created before the real GitHub Issue exists, unless the human explicitly authorizes an exception.

The initial commit should include the branch documentation folder and the index update.

Recommended commit message:

```text
chore(feature): initialize <feature-slug>
```

State after initialization: `BRANCH_INITIALIZED`.

## Phase 5 — Ready for Architecture

Gemini completes and approves `functional_spec.md`, updates `status.md`, and prepares the Context Pack for Codex Architect.

Required handoff artifacts:

- `status.md` updated;
- `functional_spec.md` marked `APPROVED`;
- Context Pack for Codex Architect included in `status.md`;
- Next Agent Cost Recommendation for Codex Architect;
- Agent Cost Log updated.

State: `READY_FOR_TECHNICAL_SPEC`.

## Phase 6 — Technical Specification

Codex Architect reads the approved functional spec and its Context Pack.

Codex Architect may inspect code only within areas identified by the Context Pack, unless it justifies additional context.

Codex Architect creates:

- `technical_spec.md`;
- initial `test_plan.md`;
- Context Pack for Claude Implementer;
- Next Agent Cost Recommendation for Claude Implementer;
- Agent Cost Log row.

### Implementation Readiness Gate

Before setting `READY_FOR_IMPLEMENTATION`, Codex Architect must verify that the feature is implementable on the current branch.

Codex Architect must confirm that:

- the required application scaffold exists, or creating it is explicitly approved in the feature scope;
- the target implementation areas exist or can be created within the approved feature scope;
- package, build, test and application structure are present where required, or creating them is approved scope;
- implementation does not require creating missing foundational architecture outside the feature scope.

If the required scaffold, application structure or target implementation areas are missing and are not explicitly in scope, Codex Architect must not hand off to Claude.

Instead Codex Architect must:

- mark the technical work as blocked;
- document the blocker in `technical_spec.md` and `test_plan.md`;
- add a blocking question in `questions.md` for Gemini Product Owner;
- update `status.md` to request Gemini escalation;
- use `NEEDS_HUMAN_DECISION` when the missing scaffold requires a product or scope decision.

State: `TECHNICAL_SPEC_READY`, then `READY_FOR_IMPLEMENTATION` only if the Implementation Readiness Gate passes.

## Phase 7 — Implementation

Claude Implementer reads:

- `technical_spec.md`;
- `test_plan.md`;
- Context Pack from Codex Architect.

Before changing code, Claude must verify that the existing baseline is green enough to start. If existing tests are already failing, Claude must not implement and must escalate.

Claude implements the feature, creates or updates required tests, runs required checks, and updates:

- `implementation_report.md`;
- `test_plan.md` results;
- `status.md`;
- Context Pack for Codex Reviewer;
- Next Agent Cost Recommendation for Codex Reviewer;
- Agent Cost Log row.

State: `IMPLEMENTATION_READY_FOR_REVIEW`.

## Phase 8 — Technical Review

Codex Reviewer reviews the implementation.

Codex Reviewer must not fix issues directly. If it finds a problem, it records findings in `technical_review.md` and returns the work to Claude.

Correction loop limit: 2 Claude ↔ Codex cycles.

If approved, Codex updates:

- `technical_review.md`;
- `status.md`;
- Context Pack for Gemini Functional Validator;
- Next Agent Cost Recommendation for Gemini Functional Validator;
- Agent Cost Log row.

State: `READY_FOR_FUNCTIONAL_VALIDATION`.

Targeted re-reviews after a correction should normally use low/medium reasoning and XS/S context budget unless a new high-risk finding appears.

## Phase 9 — Functional Validation

Gemini Functional Validator validates the implementation against `functional_spec.md` and acceptance criteria.

If functional validation fails, Gemini records findings and routes the issue back to Codex Architect if technical interpretation changed, or to the human if the functional intent is unclear.

Correction loop limit: 3 Codex ↔ Gemini cycles.

If approved, Gemini updates:

- `functional_validation.md`;
- feature `README.md` as clean final summary;
- `docs/knowledge/*` if project-level knowledge changed;
- `pr_description.md`;
- `status.md`;
- Agent Cost Log row.

State: `READY_FOR_PR`.

## Phase 10 — Pull Request

Gemini creates the Pull Request automatically only when the Definition of Done is satisfied.

State: `PR_CREATED`.

The human performs the final merge.

## Issue Update Policy

The GitHub Issue is updated only at major milestones:

- Issue created;
- branch created;
- functional spec completed;
- technical spec completed;
- implementation completed;
- technical review approved;
- functional validation approved;
- PR created;
- relevant blocker;
- human decision required;
- material token/credit budget issue.

Detailed state lives in `status.md`.

## Agent Runtime Coordinator

`scripts/agent/` validates `status.md` and required phase documents, resolves the next action, and renders the next agent's prompt from `.agents/prompts/` into a local, gitignored `.agent_runtime/next_prompt.md`. `.github/workflows/agent-sdd-guard.yml` runs the validate and resolve steps on every push to a `feature/*` branch and on every pull request, for diagnostics. See `docs/agents/runtime_coordinator.md` and `.agents/rules/runtime_coordinator.md`.

This is semi-assisted automation: the coordinator generates prompts and validates state, it does not execute agents autonomously. It does not decide workflow state, does not write to `status.md` or any feature document, and does not perform merges, pushes, or PR automation. GitHub and `status.md` remain the source of truth; the coordinator only reads them. A human, or Claude Cowork on the human's behalf, executes the generated prompt manually/semi-assisted.
