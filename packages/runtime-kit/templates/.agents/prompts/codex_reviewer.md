# Compact Prompt — Codex Reviewer

```text
Act as {{next_agent}} for Issue #{{issue}} on {{branch}}.

Current state:
{{current_state}}

Target state:
{{target_state}}

Read:
{{required_reading_list}}

Context budget:
{{context_budget}}

Reasoning:
{{reasoning_level}}

Opusplan:
{{opusplan}}

Forbidden actions:
{{forbidden_actions_list}}

Expected outputs:
{{expected_outputs_list}}

Follow the Context Pack in:
docs/features/{{feature}}/status.md

Do not read outside it unless justified.

Role-specific constraints:
- Review only. Do not modify code.
- Compare the implementation against functional_spec.md, technical_spec.md, test_plan.md, and implementation_report.md.
- For a targeted re-review, use XS/S context unless a new high-risk issue appears.
- Update technical_review.md, status.md, Agent Cost Log, and Next Agent Cost Recommendation.
```
