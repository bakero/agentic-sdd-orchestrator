# Agentic SDD Workflow — Common Contract

## 1. Purpose

This document defines the common operating contract for the Agentic SDD Workflow.

The system coordinates multiple AI agents through a shared GitHub repository using Spec-Driven Development. The repository is the source of truth. Agents do not rely on informal memory or private conversations to coordinate work. Every feature must be specified, implemented, tested, reviewed, validated and documented through versioned files.

Initial operational scope: **new feature development only**. Bugs, refactors, technical maintenance and documentation-only changes are out of scope for the initial workflow and must be defined later as workflow variants.

## 2. Core Principles

1. The repository is the source of truth.
2. Every feature must have a real GitHub Issue.
3. A local Markdown file must never replace a GitHub Issue.
4. Every feature must have its own branch.
5. Every feature must have its own documentation folder.
6. Agents coordinate through files, not informal memory.
7. The workflow is rigid by default.
8. Exceptions must be explicitly documented.
9. No agent may advance with blocking ambiguity.
10. No implementation may start without testable acceptance criteria.
11. No implementation may start unless the required application scaffold and target implementation areas exist, except when creating that scaffold is explicitly in scope.
12. No PR may be created until the feature is specified, implemented, tested, reviewed, validated and documented.
13. The human only interacts directly with Gemini.
14. Gemini is responsible for escalating human decisions.
15. Agents must minimize context usage and only read the context required for their phase.
16. Agents must select the cheapest effective model/mode and record material agent calls.

## 3. Agent Hierarchy

The workflow uses five documented roles:

1. **Gemini Product Owner**: talks to the human in Spanish, discovers the feature, creates the Issue, performs preflight, creates the branch and owns `functional_spec.md`.
2. **Codex Architect**: converts the approved functional spec into `technical_spec.md` and the initial `test_plan.md`.
3. **Claude Implementer**: implements the approved technical spec, creates or updates tests, runs checks and owns `implementation_report.md`.
4. **Codex Reviewer**: reviews implementation quality, compares code against the technical spec and tests against the test plan, and owns `technical_review.md`.
5. **Gemini Functional Validator**: validates the implementation against the functional spec, updates final documentation and creates the PR.

Gemini Product Owner and Gemini Functional Validator are separate roles, even if the same model is used. Codex Architect and Codex Reviewer are separate roles, even if the same model is used.

## 4. Human Interaction Policy

The human interacts only with Gemini. Other agents must not ask the human directly.

Escalation path:

```text
Claude → Codex → Gemini → Human
```

Gemini may decide minor functional details only when there is no cost, security, legal/compliance, permissions, scope, critical behavior or documentation conflict impact. Gemini must document minor decisions if they affect UX, acceptance criteria, tests or visible behavior.

Gemini must escalate to the human for decisions affecting cost, security, legal/compliance, permissions, functional scope, significant architecture, accepted technical debt, reduced testing, failed checks, cancellation, merge decisions, or material token/credit budget exhaustion.

Gemini may create the Pull Request automatically when the Definition of Done is met. The human performs the final merge.

## 5. Cost and Context Control

All agents must follow:

```text
docs/agents/cost_and_context_policy.md
.agents/rules/cost_and_context_policy.md
```

Before acting, agents must infer or declare task type, scope, reasoning need, cheapest effective model/mode, context budget and expected outputs.

Agents must prefer `.agents/prompts/` templates over long one-off prompts. Each handoff in `status.md` should include a `Next Agent Cost Recommendation` and an `Agent Cost Log` entry.

Repository-wide call history is recorded in:

```text
docs/metrics/agent_calls.jsonl
```

If exact token or credit usage is unavailable, exact fields must be `null` and an estimate should be recorded.

## 6. Workflow Rigidity and Exceptions

The workflow is rigid by default. Agents must not skip phases.

Exceptions are allowed only when Gemini authorizes the exception, the exception is not sensitive, and the exception is documented in `decision_log.md`.

Gemini must escalate to the human before approving exceptions that affect security, legal/compliance, cost, permissions, functional scope, significant architecture, accepted technical debt, testing requirements, failed checks, or material token/credit budget.

## 7. Global Workflow States

The feature state is tracked in `status.md`.

Allowed global states:

```text
IDEA_CAPTURED
FUNCTIONAL_DISCOVERY
FUNCTIONAL_PREFLIGHT
POTENTIAL_FEATURE_CONFLICT
READY_TO_BRANCH
BRANCH_INITIALIZED
FUNCTIONAL_SPEC_IN_PROGRESS
FUNCTIONAL_SPEC_READY
READY_FOR_TECHNICAL_SPEC
TECHNICAL_SPEC_IN_PROGRESS
TECHNICAL_SPEC_READY
READY_FOR_IMPLEMENTATION
IMPLEMENTATION_IN_PROGRESS
IMPLEMENTATION_BLOCKED
IMPLEMENTATION_READY_FOR_REVIEW
TECHNICAL_REVIEW_IN_PROGRESS
TECHNICAL_REVIEW_APPROVED
TECHNICAL_REVIEW_REJECTED
READY_FOR_FUNCTIONAL_VALIDATION
FUNCTIONAL_VALIDATION_IN_PROGRESS
FUNCTIONAL_VALIDATION_APPROVED
FUNCTIONAL_VALIDATION_REJECTED
READY_FOR_PR
PR_CREATED
MERGED
CANCELLED
NEEDS_HUMAN_DECISION
```

Each agent may update the global state only during its own phase. `NEEDS_HUMAN_DECISION` is formally declared by Gemini. Other agents may request escalation through `questions.md` or their phase document.

## 8. Phase Transition Rule

An agent may pass work to the next agent only after updating:

1. `status.md`;
2. its primary document;
3. the `Context Pack for Next Agent`;
4. the `Next Agent Cost Recommendation`;
5. the local feature `Agent Cost Log` when a meaningful call occurred.

Agents must not read beyond the Context Pack by default. Technical agents may inspect code inside code areas explicitly listed in the Context Pack. If more context is required, the agent must justify what is missing, why it is needed, what risk exists without it, which file/folder it wants to inspect, and whether this may increase scope or token usage.

## 9. GitHub Issue Requirement

A feature Issue means a real GitHub Issue created in the remote GitHub repository. Agents must not replace GitHub Issues with local Markdown files. The workflow does not use and must not create `docs/issues/`.

If an agent cannot create a real GitHub Issue because access is unavailable or not configured, it must stop, avoid local substitutes, request `NEEDS_HUMAN_DECISION`, explain the blocker, and ask Gemini to request human action.

The feature branch and feature documentation folder must not be created until the GitHub Issue exists, unless the human explicitly authorizes an exception.

## 10. Implementation Readiness Gate

Before Codex Architect may move a feature to `READY_FOR_IMPLEMENTATION`, it must verify that the feature is implementable on the current branch.

Codex Architect must confirm that the required application scaffold exists or creating it is explicitly approved scope, target implementation areas exist or can be created within scope, package/build/test/application structure is present where required or approved to create, and implementation does not require missing foundational architecture outside the feature scope.

If the required scaffold, application structure or target implementation areas are missing and are not explicitly in scope, Codex Architect must not hand off to Claude. It must mark technical work as blocked, record the blocker, add a blocking question for Gemini Product Owner, update `status.md`, and use `NEEDS_HUMAN_DECISION` when a product or scope decision is needed.

## 11. Document Ownership

```text
README.md → Gemini
status.md → current phase agent
functional_spec.md → Gemini Product Owner
technical_spec.md → Codex Architect
test_plan.md → Codex Architect creates / Claude updates results / Codex Reviewer validates
implementation_report.md → Claude Implementer
technical_review.md → Codex Reviewer
functional_validation.md → Gemini Functional Validator
decision_log.md → shared
questions.md → shared
pr_description.md → Gemini Functional Validator / Gemini Product Owner
```

Agents must not directly edit documents owned by another agent unless explicitly allowed by this contract. If an agent needs a change in another agent’s document, it must record the request in `questions.md`, `decision_log.md` or its own phase document.

Claude may update `technical_spec.md` or `test_plan.md` during implementation if they are incomplete or inaccurate, but must record the deviation in `implementation_report.md`, explain why the update was required, avoid changing functional requirements, and let Codex Reviewer validate the change.

## 12. Feature Branch and Documentation Folder

Gemini creates the GitHub Issue after collecting a minimum functional summary:

- provisional feature name;
- problem solved;
- affected user or user type;
- expected result;
- initial scope;
- main open question, if any.

After the Issue is created, Gemini performs feature preflight before creating the branch. If Gemini detects possible overlap or conflict with an active feature, it must block the workflow and ask the human.

Recommended branch format: `feature/<issue-id>-<short-slug>`.
Recommended documentation folder: `docs/features/<issue-id>-<short-slug>/`.

## 13. Questions, Decisions and Loops

All questions are centralized in `questions.md`, organized by type. Important decisions are recorded in `decision_log.md`.

Correction loop limits:

```text
Claude ↔ Codex: maximum 2 correction cycles.
Codex ↔ Gemini: maximum 3 correction cycles.
```

## 14. Testing and Definition of Done

Baseline required checks before PR: unit tests, required e2e tests, lint, typecheck, build and security scan if configured.

Gemini may create the PR only when functional spec, technical spec, test plan, implementation, checks, implementation report, technical review, functional validation, documentation and PR description are complete.

The human performs the final merge.

## 15. Historical Documentation Policy

Feature documentation is kept permanently in `docs/features/`. Old feature folders are not read by default. Historical feature documentation may be consulted only when Gemini detects a relationship from `docs/features/INDEX.md` or the feature is explicitly included in a Context Pack.

Before creating the PR, Gemini must update the feature `README.md` as a clean final summary.

## 16. Generated Prompts

`scripts/agent/render_agent_prompt.ts` renders a versioned template from `.agents/prompts/` into a generated prompt.

- Generated prompts live in `.agent_runtime/next_prompt.md`.
- Generated prompts are never committed; `.agent_runtime/` is gitignored.
- Prompt templates are versioned under `.agents/prompts/`.
- Agents must not modify their own prompt template during execution. A template is edited only as a deliberate, reviewed workflow change.
- If a generated prompt conflicts with `status.md` (stale `branch`/`commit`/`current_state`), `status.md` wins and execution stops. Re-run `npm run agent:next` instead of proceeding on stale state.

## 17. Runtime Coordinator Policy

See `docs/agents/runtime_coordinator.md` and `.agents/rules/runtime_coordinator.md` for the full guardrail list.

- The Runtime Coordinator may validate workflow state, resolve the next action, and generate prompts.
- The Runtime Coordinator may not decide product, architecture, or merge outcomes.
- The Runtime Coordinator may not execute autonomous LLM calls or invoke an agent by itself.
- The Runtime Coordinator may not override GitHub Issues, PR checks, or `status.md`.
- The human remains the final merge authority.
