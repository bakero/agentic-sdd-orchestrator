# Agentic SDD Workflow — File Structure

## Base Documentation

The repository should include these base documents:

```text
docs/agents/common_contract.md
docs/agents/workflow.md
docs/agents/context_strategy.md
docs/agents/testing_policy.md
docs/agents/escalation_policy.md
docs/agents/cost_and_context_policy.md
docs/agents/file_structure.md
docs/agents/definitions.md

docs/agents/roles/gemini_product_owner.md
docs/agents/roles/codex_architect.md
docs/agents/roles/claude_implementer.md
docs/agents/roles/codex_reviewer.md
docs/agents/roles/gemini_functional_validator.md

docs/knowledge/project_brief.md
docs/knowledge/architecture_map.md
docs/knowledge/context_manifest.md
docs/knowledge/testing_strategy.md
docs/knowledge/domain_glossary.md
docs/knowledge/active_constraints.md

docs/metrics/README.md
docs/metrics/agent_calls.jsonl
```

## Antigravity Rules

Antigravity-oriented instructions should live under:

```text
.agents/rules/
.agents/rules/roles/
```

These files mirror or summarize the canonical documents under `docs/agents/`. Operational agents should prefer `.agents/rules/` for compact context and consult `docs/agents/` only when more detail is needed.

## Prompt Templates

Compact prompt templates live under:

```text
.agents/prompts/
```

These templates are intended for daily operation. They prevent repeatedly pasting long role prompts and force agents to rely on `status.md` Context Packs.

## Feature Documentation

Every feature uses this folder pattern:

```text
docs/features/<issue-id>-<feature-slug>/
```

Every feature folder contains:

```text
README.md
status.md
functional_spec.md
technical_spec.md
test_plan.md
implementation_report.md
technical_review.md
functional_validation.md
decision_log.md
questions.md
pr_description.md
```

## Feature Index

All features must be listed in:

```text
docs/features/INDEX.md
```

The index is used for preflight conflict detection and historical lookup.

## GitHub Issues

A feature Issue must be a real GitHub Issue in the remote repository. The workflow must not use local Markdown files as issue substitutes.

## Forbidden Paths

The workflow does not use:

```text
docs/issues/
```

Agents must not create this path. If an agent needs a GitHub Issue and cannot create or access it, the agent must stop and escalate instead of creating a local file.

## Branch Naming

Feature branches use:

```text
feature/<issue-id>-<short-slug>
```

Fix branches are out of scope for the initial workflow and will be defined later.

## Document Front Matter

All feature documents must include YAML front matter:

```yaml
---
feature_id: <issue-id>-<short-slug>
issue: <issue-id>
branch: feature/<issue-id>-<short-slug>
document: <document_name>
status: PENDING
owner_agent: <agent-role>
last_updated: <YYYY-MM-DD>
---
```

Allowed document statuses:

```text
PENDING
IN_PROGRESS
READY
APPROVED
BLOCKED
```

## Agent Call Metrics

Agent call metrics are append-only records under:

```text
docs/metrics/agent_calls.jsonl
```

Use one JSON object per call. If exact token or credit usage is unavailable, record `null` in exact fields and provide an estimate.

## Permanent Documentation

Feature folders are kept permanently. Old feature folders are not read by default.

## Generated vs. Versioned Runtime Files

```text
.agents/runtime/                    versioned: contracts/examples (JSON Schemas, worked examples)
.agent_runtime/                     generated locally, ignored by git — never committed
scripts/agent/                      runtime coordinator scripts (validate/resolve/render/write_agent_call)
.github/workflows/agent-sdd-guard.yml   CI guard: validates + resolves on push/pull_request
```

`.agents/runtime/` and `.agent_runtime/` are deliberately named close to each other but serve opposite purposes: the former is committed and reviewed, the latter is local output that must never be committed. See `docs/agents/runtime_coordinator.md`.
