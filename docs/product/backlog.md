# Agentic SDD Orchestrator — Product Backlog

## Purpose

This document consolidates and prioritizes every product idea discussed for the Agentic SDD Orchestrator so far. It is a planning artifact, not implementation code — it should stay readable and be updated as scope is delivered, dropped, or re-prioritized.

## How to read this backlog

- **Priority** groups (`P0`–`P3`) describe relative importance, not a strict delivery order within the group.
- **Candidate version** is a best-effort target, not a commitment. It may shift as earlier versions land and reveal better sequencing.
- **Status** values used in this document: `NOT_STARTED`, `PLANNED`, `IN_PROGRESS`, `DONE`, `DEFERRED`.
- Items depend only on what is explicitly listed under **Dependencies**; anything unlisted is assumed independent.

## 1. Current released foundation

| Version | Theme | Status |
|---|---|---|
| `v0.1-demo` | Cowork-mode MVP: inspect, install runtime kit, init-feature, generate first prompt. Proves the semi-assisted flow end to end. | DONE |
| `v0.2-cli` | Local CLI packaging (`npm run agentic-sdd -- ...`), usability, validation, docs, and verification. No safety-model changes. | DONE |
| `v0.3-project-manager-doctor` | Local project registry, `project` command group (add/list/remove/inspect), `doctor` (read-only diagnostics), `next` (single recommended action). | DONE |

These three releases establish the safety model this backlog must not weaken: semi-assisted execution only, no autonomous agent execution, no auto-merge, no external AI API calls from the orchestrator itself, GitHub + `status.md` as the source of truth, local filesystem only.

---

## 2. P0 — Agent, Skill & Environment Profiles

These items define *what* an agent is (role, skills, prompt shape) and *where* it runs (Cowork tool, browser, local shell), so multi-agent handoffs and later automation have a stable foundation to build on. This is the substance of v0.4.

### Agent configuration

- **Priority:** P0
- **Title:** Agent configuration
- **Description:** A structured, per-orchestrator-repo definition of each agent role (e.g. gemini-product-owner, codex-architect, claude-implementer, codex-reviewer, gemini-functional-validator) including its identity, responsibilities, and default settings.
- **Rationale:** Today agent roles exist only as prompt templates and Markdown role docs inside the runtime kit. There is no single configurable record the CLI can read, validate, or use to drive `doctor`/`next` recommendations for agent setup.
- **Candidate version:** v0.4
- **Status:** NOT_STARTED
- **Dependencies:** none

### Execution mode per agent: automatic/manual

- **Priority:** P0
- **Title:** Execution mode per agent (automatic/manual)
- **Description:** A per-agent setting that records whether that role's step is expected to run manually (human pastes the prompt) or automatically (future API mode). In v0.4 this is a declared setting only — no automatic execution is implemented.
- **Rationale:** Needed so later multi-agent handoff and API-mode work (P3) have a place to read "is this role allowed to run unattended" without redesigning the config shape later.
- **Candidate version:** v0.4
- **Status:** NOT_STARTED
- **Dependencies:** Agent configuration

### Agent profiles

- **Priority:** P0
- **Title:** Agent profiles
- **Description:** A named bundle of agent configuration, skill pack, prompt template set, and environment preference that can be applied to a project (e.g. "strict-review", "fast-draft").
- **Rationale:** Different projects/teams want different agent behavior without redefining every agent from scratch each time.
- **Candidate version:** v0.4
- **Status:** NOT_STARTED
- **Dependencies:** Agent configuration, Skill packs per role, Prompt templates per profile

### Skill packs per role

- **Priority:** P0
- **Title:** Skill packs per role
- **Description:** A named, reusable set of capabilities/constraints/context-reading rules attached to a role (e.g. what a codex-reviewer is allowed to inspect, what a claude-implementer must never touch).
- **Rationale:** The runtime kit already encodes some of this in `.agents/rules/roles/*.md`; a skill pack formalizes it as a reusable, composable unit instead of one fixed file per role.
- **Candidate version:** v0.4
- **Status:** NOT_STARTED
- **Dependencies:** Agent configuration

### Prompt templates per profile

- **Priority:** P0
- **Title:** Prompt templates per profile
- **Description:** Allow a profile to select or override which `.agents/prompts/*.md`-style template is rendered for each role, instead of always using the single runtime-kit default.
- **Rationale:** Different teams phrase constraints differently; hard-coding one template per role blocks customization that the profile concept is meant to enable.
- **Candidate version:** v0.4
- **Status:** NOT_STARTED
- **Dependencies:** Agent profiles

### External agent references: Gemini Gems, Custom GPTs, Claude Projects

- **Priority:** P0
- **Title:** External agent references
- **Description:** A way to record, per agent role, a reference to an external hosted assistant configuration (a Gemini Gem, a Custom GPT, a Claude Project) that the human should paste the generated prompt into. This is a reference/label only — the orchestrator does not call these services.
- **Rationale:** Many users already have a curated Gem/GPT/Project for a given role; the orchestrator should be able to say "paste this into your Codex Reviewer GPT" instead of a generic instruction, without ever calling an external AI API itself.
- **Candidate version:** v0.4
- **Status:** NOT_STARTED
- **Dependencies:** Agent configuration

### Environment profiles

- **Priority:** P0
- **Title:** Environment profiles
- **Description:** A named record of the execution environment a human/agent will operate in for a given project: shell type (PowerShell/bash), OS, whether Claude Cowork or a browser-based tool is used, and which local tools are expected to be available.
- **Rationale:** Prompt instructions and command examples currently assume one shell/environment; environment profiles let the orchestrator tailor generated instructions to the actual target environment.
- **Candidate version:** v0.4
- **Status:** NOT_STARTED
- **Dependencies:** none

### Claude Cowork execution instructions

- **Priority:** P0
- **Title:** Claude Cowork execution instructions
- **Description:** A documented, generatable instruction block explaining exactly how to hand a rendered prompt to Claude Cowork for a given environment profile.
- **Rationale:** "Open `.agent_runtime/next_prompt.md` and paste into Cowork" is currently a single generic instruction; it needs to become environment-aware once environment profiles exist.
- **Candidate version:** v0.4
- **Status:** NOT_STARTED
- **Dependencies:** Environment profiles

### Browser execution instructions

- **Priority:** P0
- **Title:** Browser execution instructions
- **Description:** Equivalent generatable instructions for handing a rendered prompt to a browser-based tool (e.g. a web chat UI) instead of a desktop Cowork session.
- **Rationale:** Not all users run Claude Cowork locally; some will paste the generated prompt into a browser tab. Instructions must reflect that path too.
- **Candidate version:** v0.4
- **Status:** NOT_STARTED
- **Dependencies:** Environment profiles

### Installed tools detection

- **Priority:** P0
- **Title:** Installed tools detection
- **Description:** Extend `doctor`'s read-only diagnostics to detect which relevant local tools are installed (git, node, npm, tsx availability, etc.) as part of environment readiness.
- **Rationale:** Environment profiles need real signal to validate against; detecting installed tools is the read-only diagnostic input that makes an environment profile actionable rather than declarative-only.
- **Candidate version:** v0.4
- **Status:** NOT_STARTED
- **Dependencies:** Environment profiles

### PowerShell/bash command adaptation

- **Priority:** P0
- **Title:** PowerShell/bash command adaptation
- **Description:** Generate example commands (in doctor/next output, in rendered prompts) in the correct shell syntax for the resolved environment profile, instead of a single hard-coded style.
- **Rationale:** The orchestrator must stay usable on Windows PowerShell (existing hard constraint) while also supporting bash-based environments; command examples should not silently assume one shell.
- **Candidate version:** v0.4
- **Status:** NOT_STARTED
- **Dependencies:** Environment profiles, Installed tools detection

### Multi-agent handoff chain

- **Priority:** P0
- **Title:** Multi-agent handoff chain
- **Description:** A structured, ordered description of the full agent handoff sequence (e.g. gemini-product-owner → codex-architect → claude-implementer → codex-reviewer → gemini-functional-validator) that the orchestrator can reason about beyond one next-action at a time.
- **Rationale:** Today `next_agent` in `status.md` only encodes a single next hop; a first-class chain representation is the foundation for v0.5 (Multi-Agent Cowork Handoff) and for showing the user the whole path, not just the next step.
- **Candidate version:** v0.4 (data model), v0.5 (full handoff behavior)
- **Status:** NOT_STARTED
- **Dependencies:** Agent configuration

### Structured agent inputs/outputs

- **Priority:** P0
- **Title:** Structured agent inputs/outputs
- **Description:** A defined schema for what each agent role consumes (required reading, prior outputs) and produces (expected documents/state changes), independent of the free-text prompt rendering.
- **Rationale:** Needed so handoffs can be validated mechanically (did the prior agent actually produce what the next agent needs) rather than only checked by the human reading the prompt.
- **Candidate version:** v0.4
- **Status:** NOT_STARTED
- **Dependencies:** Multi-agent handoff chain

### Overall orchestration goal in every handoff

- **Priority:** P0
- **Title:** Overall orchestration goal in every handoff
- **Description:** Every rendered prompt should restate the overall feature/issue goal, not only the current phase's task, so an agent never loses sight of why the current step matters.
- **Rationale:** Prevents agent drift and scope creep across a long handoff chain; matches the existing safety principle of keeping agents scoped and auditable.
- **Candidate version:** v0.4
- **Status:** NOT_STARTED
- **Dependencies:** Structured agent inputs/outputs

### Expected outputs per agent

- **Priority:** P0
- **Title:** Expected outputs per agent
- **Description:** Formalize, per role and per phase, the exact document(s)/state transition expected as output, building on the existing `expected_outputs`/`EXPECTED_OUTPUTS_BY_STATE` concept already present in the runtime kit's coordinator scripts.
- **Rationale:** This already exists informally in the runtime coordinator; v0.4 should promote it into the profile/config system so it is configurable per profile rather than hard-coded.
- **Candidate version:** v0.4
- **Status:** NOT_STARTED
- **Dependencies:** Structured agent inputs/outputs

### Configurable execution cycles

- **Priority:** P0
- **Title:** Configurable execution cycles
- **Description:** Allow a project/profile to define how many review/implementation cycles are expected or allowed before escalation (e.g. implementation → review → rejected → re-implementation).
- **Rationale:** The runtime kit's workflow contract already allows rejection loops (`TECHNICAL_REVIEW_REJECTED → IMPLEMENTATION_IN_PROGRESS`); this item makes that loop's expected bounds explicit and configurable instead of implicit and unbounded.
- **Candidate version:** v0.4 (config surface), v0.6 (enforced budgets)
- **Status:** NOT_STARTED
- **Dependencies:** Multi-agent handoff chain

### Max iteration limits

- **Priority:** P0
- **Title:** Max iteration limits
- **Description:** A hard cap on how many times a given cycle (e.g. review rejection loop) may repeat before the workflow must escalate to a human decision.
- **Rationale:** Prevents an unbounded rejection/rework loop from silently consuming time/tokens without human awareness.
- **Candidate version:** v0.4 (config), v0.6 (enforcement + reporting)
- **Status:** NOT_STARTED
- **Dependencies:** Configurable execution cycles

### Stop conditions

- **Priority:** P0
- **Title:** Stop conditions
- **Description:** A declared set of conditions under which the orchestrator must stop recommending further action and require explicit human input (e.g. max iterations reached, required document missing, conflicting state detected).
- **Rationale:** Extends the existing blocked-state concept (`NEEDS_HUMAN_DECISION`, `TECHNICAL_REVIEW_REJECTED`, etc.) into a general, configurable mechanism rather than a fixed list.
- **Candidate version:** v0.4
- **Status:** NOT_STARTED
- **Dependencies:** Max iteration limits

### Human escalation rules

- **Priority:** P0
- **Title:** Human escalation rules
- **Description:** Rules describing when and how the orchestrator should explicitly flag "a human must decide here," distinct from a normal next-action recommendation.
- **Rationale:** `doctor`/`next` currently only report structural readiness; escalation rules add a semantic layer for "this needs a judgment call," which is essential once cycles/budgets can be exceeded.
- **Candidate version:** v0.4
- **Status:** NOT_STARTED
- **Dependencies:** Stop conditions

### Token budget per agent

- **Priority:** P0
- **Title:** Token budget per agent
- **Description:** A configurable expected/maximum token budget per agent role, extending the existing `context_budget` (XS/S/M/L/XL) concept already present in `status.md`'s Next Agent Cost Recommendation.
- **Rationale:** Formalizes an existing informal practice (the Agent Cost Log already records context budget per phase) into a first-class, profile-configurable setting.
- **Candidate version:** v0.4 (config), v0.6 (enforcement/estimation)
- **Status:** NOT_STARTED
- **Dependencies:** Agent configuration

### Token budget per workflow

- **Priority:** P0
- **Title:** Token budget per workflow
- **Description:** A configurable total token budget across an entire feature's handoff chain, aggregating per-agent budgets.
- **Rationale:** Per-agent budgets alone don't answer "how much will this whole feature cost end to end"; this rolls them up.
- **Candidate version:** v0.4 (config), v0.6 (enforcement/estimation)
- **Status:** NOT_STARTED
- **Dependencies:** Token budget per agent, Multi-agent handoff chain

### Estimated token consumption before execution

- **Priority:** P0
- **Title:** Estimated token consumption before execution
- **Description:** Before a prompt is handed to a human/agent, estimate how many tokens it will likely consume, based on required reading size and prompt length.
- **Rationale:** Lets a user decide whether to proceed with a given handoff before spending Cowork/API budget, directly supporting the token-budget items above.
- **Candidate version:** v0.4 (data model), v0.6 (real estimation logic)
- **Status:** NOT_STARTED
- **Dependencies:** Context size estimation, Cowork prompt token estimation

### Context size estimation

- **Priority:** P0
- **Title:** Context size estimation
- **Description:** Estimate the size (characters/approximate tokens) of the required-reading set for a given handoff before it is rendered.
- **Rationale:** Required building block for "estimated token consumption before execution"; also useful on its own to flag an oversized required-reading set during `doctor`.
- **Candidate version:** v0.4
- **Status:** NOT_STARTED
- **Dependencies:** Structured agent inputs/outputs

### Cowork prompt token estimation

- **Priority:** P0
- **Title:** Cowork prompt token estimation
- **Description:** Estimate the token size of the fully rendered prompt itself (not just the required-reading set), so the estimate reflects what will actually be pasted into Cowork/a browser tool.
- **Rationale:** Required-reading size and rendered-prompt size can differ significantly once templates, constraints, and context packs are included; both estimates are needed for an accurate pre-execution number.
- **Candidate version:** v0.4
- **Status:** NOT_STARTED
- **Dependencies:** Prompt templates per profile, Context size estimation

---

## 3. P1 — Cowork Handoff, Cost Tracking & Local UI

These items make the semi-assisted Cowork loop itself smoother (v0.5) and introduce lightweight cost visibility and a local visual layer, without crossing into automation or a hosted product.

### Cowork handoff package

- **Priority:** P1
- **Title:** Cowork handoff package
- **Description:** A single generated bundle (files + instructions) a user can hand off for one Cowork execution step, combining the rendered prompt, required reading list, and environment-specific execution instructions.
- **Rationale:** Currently these are three separate artifacts (`next_prompt.md`, `context_files.txt`, ad hoc instructions); bundling them reduces friction for the human operator.
- **Candidate version:** v0.5
- **Status:** NOT_STARTED
- **Dependencies:** Claude Cowork execution instructions, Browser execution instructions

### Cowork prompt field

- **Priority:** P1
- **Title:** Cowork prompt field
- **Description:** A first-class, addressable "current Cowork prompt" field in the orchestrator's state, distinct from the raw `next_prompt.md` file, so other features (copy button, execution history) can reference it directly.
- **Rationale:** Needed as a stable handle for the local UI (P1) and execution history (P1) to point at, instead of re-reading a file path each time.
- **Candidate version:** v0.5
- **Status:** NOT_STARTED
- **Dependencies:** Cowork handoff package

### Execution history

- **Priority:** P1
- **Title:** Execution history
- **Description:** A local, append-only record of each Cowork handoff that occurred (agent, phase, timestamp, outcome), building on the existing `docs/metrics/agent_calls.jsonl` convention already shipped in the runtime kit.
- **Rationale:** Extends an existing, proven mechanism (`write_agent_call.ts` / `agent:log-call`) from per-target-repo logging into an orchestrator-level view across projects.
- **Candidate version:** v0.5
- **Status:** NOT_STARTED
- **Dependencies:** Cowork prompt field

### Manual token/credit entry

- **Priority:** P1
- **Title:** Manual token/credit entry
- **Description:** Let a user manually record actual token/credit usage for a completed Cowork step, since the orchestrator cannot observe real usage without API access.
- **Rationale:** Real usage numbers are only available from the Cowork tool's own UI (e.g. Claude usage panel); manual entry is the only accurate source until/unless API mode (P3) exists.
- **Candidate version:** v0.6
- **Status:** NOT_STARTED
- **Dependencies:** Execution history

### Cost per execution

- **Priority:** P1
- **Title:** Cost per execution
- **Description:** Compute or display an estimated/recorded cost for a single Cowork execution step, from manually entered or estimated token usage.
- **Rationale:** First rollup of raw token numbers into a cost figure a user actually cares about.
- **Candidate version:** v0.6
- **Status:** NOT_STARTED
- **Dependencies:** Manual token/credit entry, Estimated token consumption before execution

### Cost per feature

- **Priority:** P1
- **Title:** Cost per feature
- **Description:** Aggregate cost-per-execution across an entire feature's handoff chain to show total cost for delivering that feature.
- **Rationale:** Answers "what did this feature actually cost," which is the level most users will care about, not individual steps.
- **Candidate version:** v0.6
- **Status:** NOT_STARTED
- **Dependencies:** Cost per execution, Multi-agent handoff chain

### Credit availability tracking

- **Priority:** P1
- **Title:** Credit availability tracking
- **Description:** Let a user record known remaining credit/quota for a given tool (e.g. remaining Cowork usage window) so the orchestrator can factor that into recommendations.
- **Rationale:** Complements token budgets — knowing the budget you *want* to spend is only half the picture; knowing what you *have available* is the other half.
- **Candidate version:** v0.6
- **Status:** NOT_STARTED
- **Dependencies:** Manual token/credit entry

### Local visual UI

- **Priority:** P1
- **Title:** Local visual UI
- **Description:** A local (non-hosted) visual interface for the orchestrator, replacing pure CLI interaction for the most common flows.
- **Rationale:** CLI-only interaction does not scale well once profiles, environments, and multiple projects are all configurable; a local UI reduces friction without becoming a hosted dashboard (still out of scope — see P3).
- **Candidate version:** v0.8
- **Status:** NOT_STARTED
- **Dependencies:** Agent profiles, Environment profiles, Multi-agent handoff chain

### Visual agent configuration

- **Priority:** P1
- **Title:** Visual agent configuration
- **Description:** UI screens to create/edit agent configuration, execution mode, and external agent references, instead of hand-editing config files.
- **Rationale:** Makes P0 agent configuration items usable by non-CLI-comfortable users.
- **Candidate version:** v0.8
- **Status:** NOT_STARTED
- **Dependencies:** Local visual UI, Agent configuration

### Visual environment configuration

- **Priority:** P1
- **Title:** Visual environment configuration
- **Description:** UI screens to create/edit environment profiles (shell, OS, tool detection results).
- **Rationale:** Same rationale as visual agent configuration, applied to environment profiles.
- **Candidate version:** v0.8
- **Status:** NOT_STARTED
- **Dependencies:** Local visual UI, Environment profiles

### Visual skill/profile selection

- **Priority:** P1
- **Title:** Visual skill/profile selection
- **Description:** UI to browse and assign skill packs and agent profiles to a project.
- **Rationale:** Completes the visual configuration surface for the P0 profile system.
- **Candidate version:** v0.8
- **Status:** NOT_STARTED
- **Dependencies:** Local visual UI, Agent profiles, Skill packs per role

### Current next action screen

- **Priority:** P1
- **Title:** Current next action screen
- **Description:** A UI screen showing the same information as `npm run agentic-sdd -- next <project>`, per registered project, without needing the CLI.
- **Rationale:** Direct visual equivalent of the most-used v0.3 command; natural first UI screen to build.
- **Candidate version:** v0.8
- **Status:** NOT_STARTED
- **Dependencies:** Local visual UI

### Copy prompt button

- **Priority:** P1
- **Title:** Copy prompt button
- **Description:** A one-click copy of the current rendered Cowork prompt from the UI, instead of opening `next_prompt.md` manually.
- **Rationale:** Small but high-value friction reduction directly supporting the Cowork handoff loop.
- **Candidate version:** v0.8
- **Status:** NOT_STARTED
- **Dependencies:** Current next action screen, Cowork prompt field

### Refresh after Cowork execution

- **Priority:** P1
- **Title:** Refresh after Cowork execution
- **Description:** A UI action to re-run diagnostics/next-action resolution after a human has executed a Cowork step and updated `status.md`, without restarting the whole CLI flow.
- **Rationale:** Closes the loop between "I ran the prompt and updated status.md" and "show me the new next action" inside the visual UI.
- **Candidate version:** v0.8
- **Status:** NOT_STARTED
- **Dependencies:** Current next action screen

### Learning rules

- **Priority:** P1
- **Title:** Learning rules
- **Description:** A mechanism for recording durable corrections/preferences observed during Cowork sessions (e.g. "this project always wants X approach") so future prompts can reflect them.
- **Rationale:** Early version of institutional memory across Cowork sessions, scoped to explicit, user-approved rules rather than automatic inference.
- **Candidate version:** v0.7
- **Status:** NOT_STARTED
- **Dependencies:** Execution history

### Prompt improvement memory

- **Priority:** P1
- **Title:** Prompt improvement memory
- **Description:** Track which prompt template variants performed well/poorly (per role/project) and surface suggested edits to the template.
- **Rationale:** Turns execution history and incident logs into actionable prompt-template improvement over time.
- **Candidate version:** v0.7
- **Status:** NOT_STARTED
- **Dependencies:** Learning rules, Incident log

### Incident log

- **Priority:** P1
- **Title:** Incident log
- **Description:** A structured log of things that went wrong during a Cowork execution (rejected review, escalation triggered, stop condition hit) distinct from the general execution history.
- **Rationale:** Separates "what happened" (execution history) from "what went wrong and why" (incident log), which is the more useful signal for prompt/rule improvement.
- **Candidate version:** v0.7
- **Status:** NOT_STARTED
- **Dependencies:** Execution history, Human escalation rules

### Prompt patches by agent/project/task type

- **Priority:** P1
- **Title:** Prompt patches by agent/project/task type
- **Description:** Small, scoped prompt template overrides keyed by agent role + project + task type, generated from learning rules/prompt improvement memory.
- **Rationale:** The concrete deliverable of the learning-rules line of work — an actual mechanism to apply learned improvements without hand-editing base templates.
- **Candidate version:** v0.7
- **Status:** NOT_STARTED
- **Dependencies:** Prompt improvement memory, Prompt templates per profile

---

## 4. P2 — Kanban & Workflow Metrics

Visibility and flow-metrics features layered on top of the local UI and execution history, once those exist. Still local-only; no hosted dashboard.

### Kanban board

- **Priority:** P2
- **Title:** Kanban board
- **Description:** A visual board showing all tracked features/tasks across registered projects by workflow state.
- **Rationale:** Natural visualization once multiple projects and their workflow states are tracked centrally (v0.3 registry + v0.5 handoff chain).
- **Candidate version:** v0.9
- **Status:** NOT_STARTED
- **Dependencies:** Local visual UI, Multi-agent handoff chain, Execution history

### Feature/task cards

- **Priority:** P2
- **Title:** Feature/task cards
- **Description:** Individual card representation of a feature/task on the Kanban board, showing state, current agent, and last action.
- **Rationale:** The basic unit of the Kanban board; needs its own definition since a "task" spans one feature folder plus its full handoff history.
- **Candidate version:** v0.9
- **Status:** NOT_STARTED
- **Dependencies:** Kanban board

### Agent workload view

- **Priority:** P2
- **Title:** Agent workload view
- **Description:** A view showing how many active handoffs are currently assigned to each agent role across all tracked projects.
- **Rationale:** Useful once multiple projects/features are in flight simultaneously; not meaningful with a single project.
- **Candidate version:** v0.9
- **Status:** NOT_STARTED
- **Dependencies:** Kanban board

### Throughput

- **Priority:** P2
- **Title:** Throughput
- **Description:** Count of features/tasks completed per time period, computed from execution history.
- **Rationale:** Standard flow metric; requires enough historical data to be meaningful, hence gated behind execution history (v0.5) and Kanban (v0.9).
- **Candidate version:** v0.9
- **Status:** NOT_STARTED
- **Dependencies:** Execution history, Kanban board

### Lead time

- **Priority:** P2
- **Title:** Lead time
- **Description:** Time from feature creation (`init-feature`) to completion (`PR_CREATED`/`MERGED`), computed per feature.
- **Rationale:** Standard flow metric answering "how long does a feature take end to end."
- **Candidate version:** v0.9
- **Status:** NOT_STARTED
- **Dependencies:** Execution history

### Cycle time

- **Priority:** P2
- **Title:** Cycle time
- **Description:** Time spent actively in progress per phase (excluding time waiting for human action), computed per feature.
- **Rationale:** Complements lead time by isolating active work time from wait time.
- **Candidate version:** v0.9
- **Status:** NOT_STARTED
- **Dependencies:** Execution history

### WIP

- **Priority:** P2
- **Title:** WIP (work in progress)
- **Description:** Count of features/tasks currently in a non-terminal, non-blocked state across all tracked projects.
- **Rationale:** Standard flow metric; a direct read of the Kanban board's non-terminal columns.
- **Candidate version:** v0.9
- **Status:** NOT_STARTED
- **Dependencies:** Kanban board

### WIP age

- **Priority:** P2
- **Title:** WIP age
- **Description:** How long each in-progress feature/task has been in its current state, to surface stalled work.
- **Rationale:** Turns raw WIP count into an actionable signal (which items are stuck, not just how many are open).
- **Candidate version:** v0.9
- **Status:** NOT_STARTED
- **Dependencies:** WIP

### Rework count

- **Priority:** P2
- **Title:** Rework count
- **Description:** Count of rejection/rework cycles a feature went through (e.g. technical review rejections) before completion.
- **Rationale:** Directly measures the configurable-cycles/max-iteration concepts from P0 in aggregate, across history.
- **Candidate version:** v0.9
- **Status:** NOT_STARTED
- **Dependencies:** Configurable execution cycles, Execution history

### Tokens per workflow stage

- **Priority:** P2
- **Title:** Tokens per workflow stage
- **Description:** Breakdown of recorded/estimated token usage by workflow phase (spec, implementation, review, validation), aggregated across features.
- **Rationale:** Finer-grained view than "cost per feature" (P1); useful for identifying which phase is the most expensive on average.
- **Candidate version:** v1.0
- **Status:** NOT_STARTED
- **Dependencies:** Cost per execution, Multi-agent handoff chain

### Cost per agent

- **Priority:** P2
- **Title:** Cost per agent
- **Description:** Aggregate recorded/estimated cost by agent role across all tracked projects and features.
- **Rationale:** Answers "which role is most expensive to run," informing profile and provider choices.
- **Candidate version:** v1.0
- **Status:** NOT_STARTED
- **Dependencies:** Cost per execution

### Provider/model efficiency recommendations

- **Priority:** P2
- **Title:** Provider/model efficiency recommendations
- **Description:** Suggestions (not automatic changes) for which provider/model tends to be more cost-efficient for a given role/task type, based on recorded history.
- **Rationale:** The natural payoff of collecting cost-per-agent and tokens-per-stage data; kept as a recommendation, never an automatic switch, to preserve human control.
- **Candidate version:** v1.0
- **Status:** NOT_STARTED
- **Dependencies:** Cost per agent, Tokens per workflow stage

---

## 5. P3 — Automation, Hosting & Distribution

Items that would materially change the safety model, hosting posture, or distribution model. Explicitly deferred; each one requires its own dedicated safety/scope review before being scheduled into a version.

### Direct API execution

- **Priority:** P3
- **Title:** Direct API execution
- **Description:** Execute agent steps directly through provider APIs instead of a human pasting a Cowork prompt.
- **Rationale:** This is "API mode" from the product vision — explicitly a future mode that must preserve human gates and cost controls; not appropriate until budgets/estimation (P0/P1) and a track record of safe Cowork usage exist.
- **Candidate version:** unscheduled (post-v1.0)
- **Status:** DEFERRED
- **Dependencies:** Token budget per workflow, Stop conditions, Human escalation rules

### Real provider token usage

- **Priority:** P3
- **Title:** Real provider token usage
- **Description:** Pull actual token usage numbers from a provider API instead of manual entry.
- **Rationale:** Only meaningful once direct API execution exists; manual entry (P1) is the interim solution.
- **Candidate version:** unscheduled (post-v1.0)
- **Status:** DEFERRED
- **Dependencies:** Direct API execution

### GitHub App

- **Priority:** P3
- **Title:** GitHub App
- **Description:** A GitHub App integration for the orchestrator (webhooks, installation flow, org-level permissions).
- **Rationale:** Explicitly excluded from v0.1–v0.3 hard constraints; would introduce hosted infrastructure and credential handling this backlog's safety model currently avoids entirely.
- **Candidate version:** unscheduled (post-v1.0)
- **Status:** DEFERRED
- **Dependencies:** none

### Remote repo cloning

- **Priority:** P3
- **Title:** Remote repo cloning
- **Description:** Let the orchestrator clone a remote repository directly instead of requiring a pre-existing local checkout.
- **Rationale:** Explicitly excluded from v0.1–v0.3 hard constraints; local-filesystem-only is a deliberate safety/simplicity boundary.
- **Candidate version:** unscheduled (post-v1.0)
- **Status:** DEFERRED
- **Dependencies:** none

### Multi-provider direct execution

- **Priority:** P3
- **Title:** Multi-provider direct execution
- **Description:** Support direct API execution across more than one AI provider with a unified adapter layer.
- **Rationale:** Builds on direct API execution; only relevant once that exists.
- **Candidate version:** unscheduled (post-v1.0)
- **Status:** DEFERRED
- **Dependencies:** Direct API execution

### Hosted dashboard

- **Priority:** P3
- **Title:** Hosted dashboard
- **Description:** A hosted (non-local) version of the visual UI/Kanban/metrics dashboard.
- **Rationale:** Explicitly out of scope per the "no dashboard" hard constraint carried through v0.1–v0.3; the local visual UI (P1/P2) intentionally stops short of this.
- **Candidate version:** unscheduled (post-v1.0)
- **Status:** DEFERRED
- **Dependencies:** Local visual UI, Kanban board

### Multi-user support

- **Priority:** P3
- **Title:** Multi-user support
- **Description:** Support more than one human user/account against the same orchestrator instance or project registry.
- **Rationale:** Only meaningful once there is a hosted dashboard; the local, single-user, per-machine registry model (v0.3) does not need this.
- **Candidate version:** unscheduled (post-v1.0)
- **Status:** DEFERRED
- **Dependencies:** Hosted dashboard

### npm package publishing

- **Priority:** P3
- **Title:** npm package publishing
- **Description:** Publish the CLI as a real installable npm package with a bin entrypoint, instead of the current local `npm run agentic-sdd -- ...` script path.
- **Rationale:** Explicitly deferred since v0.2 ("Future-ready packaging note") until a built JavaScript output exists; distribution work, not a product-capability gap.
- **Candidate version:** unscheduled (post-v1.0)
- **Status:** DEFERRED
- **Dependencies:** none

---

## 6. Roadmap

| Version | Theme |
|---|---|
| v0.4 | Agent, Skill & Environment Profiles |
| v0.5 | Multi-Agent Cowork Handoff |
| v0.6 | Cycles, Budgets & Token Estimation |
| v0.7 | Learning Rules / Prompt Improvement Memory |
| v0.8 | Local Visual Orchestrator MVP |
| v0.9 | Kanban + Execution History |
| v1.0 | Metrics Dashboard + Functional App |

This order is the default plan. It should only change if implementation evidence (something built earlier turns out to unlock or block something planned later) suggests a better sequence — in which case this table and the affected items' **Candidate version** fields should be updated together, with a note explaining why.

## Maintenance

Update this backlog whenever:

- a new product idea is proposed (add it under the right priority with all required fields);
- an item's status changes (`NOT_STARTED` → `PLANNED` → `IN_PROGRESS` → `DONE`, or → `DEFERRED`);
- a candidate version shifts due to implementation evidence (update the item and, if it affects sequencing, the roadmap table);
- a released version lands (move it into the "Current released foundation" table with a one-line summary, matching the existing three entries).
