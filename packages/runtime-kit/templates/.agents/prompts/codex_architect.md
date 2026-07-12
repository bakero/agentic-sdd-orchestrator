# Compact Prompt — Codex Architect

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
- Do not implement code.
- Do not change functional_spec.md.
- Create/update technical_spec.md and test_plan.md.
- Apply the Implementation Readiness Gate before setting READY_FOR_IMPLEMENTATION.
- Record Agent Cost Log and Next Agent Cost Recommendation.
```
