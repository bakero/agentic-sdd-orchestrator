# Compact Prompt — Claude Implementer

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
- Implement only technical_spec.md and test_plan.md.
- Do not change functional_spec.md.
- Do not expand scope.
- Run required checks before reporting completion.
- Update implementation_report.md, test_plan.md results, status.md, Agent Cost Log, and Next Agent Cost Recommendation.
```
