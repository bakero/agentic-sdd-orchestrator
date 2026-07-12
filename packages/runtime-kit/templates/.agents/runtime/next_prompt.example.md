<!--
Example of a rendered .agent_runtime/next_prompt.md, produced by
`scripts/agent/render_agent_prompt.ts` from `.agents/prompts/claude_implementer.md`
using the context implied by `.agents/runtime/next_action.example.json`.
This file is illustrative only; the real output is generated locally and gitignored.
-->

# Compact Prompt — Claude Implementer

```text
Act as claude-implementer for Issue #123 on feature/123-example-feature.

Current state:
READY_FOR_IMPLEMENTATION

Target state:
IMPLEMENTATION_READY_FOR_REVIEW

Read:
- .agents/rules/common_contract.md
- .agents/rules/cost_and_context_policy.md
- .agents/rules/roles/claude_implementer.md
- .agents/prompts/claude_implementer.md
- docs/features/6-agent-runtime-coordinator/status.md

Context budget:
M

Reasoning:
medium

Opusplan:
no

Forbidden actions:
- Do not change functional_spec.md
- Do not implement automatic merge
- Do not add external AI API calls

Expected outputs:
- implementation_report.md
- test_plan.md updated
- status.md updated

Follow the Context Pack in:
docs/features/6-agent-runtime-coordinator/status.md

Do not read outside it unless justified.

Role-specific constraints:
- Implement only technical_spec.md and test_plan.md.
- Do not change functional_spec.md.
- Do not expand scope.
- Run required checks before reporting completion.
- Update implementation_report.md, test_plan.md results, status.md, Agent Cost Log, and Next Agent Cost Recommendation.
```
