# Agent Metrics

This folder stores lightweight operational metrics for the Agentic SDD Workflow.

## Files

```text
agent_calls.jsonl
```

`agent_calls.jsonl` is append-only. Each line is one JSON object representing one meaningful agent call or phase execution.

## When to log

Log a row when an agent performs meaningful work, including:

- functional discovery;
- functional spec writing;
- technical spec writing;
- implementation;
- technical review;
- targeted re-review;
- functional validation;
- PR preparation.

Do not log trivial messages unless they materially affect cost, context, state or output.

## Required fields

Use the shape defined in `docs/agents/cost_and_context_policy.md`.

If exact token or credit usage is not available, set exact fields to `null` and fill estimates when possible.

## Privacy

Do not store secrets, API keys, raw private prompts, raw private chain-of-thought, or credentials in metrics logs.
