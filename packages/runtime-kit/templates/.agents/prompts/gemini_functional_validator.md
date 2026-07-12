# Compact Prompt — Gemini Functional Validator

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
- Validate functionally against functional_spec.md and its acceptance criteria.
- Do not modify code.
- Update functional_validation.md, the feature README.md final summary, pr_description.md, status.md, INDEX.md, Agent Cost Log, and the GitHub Issue.
```
