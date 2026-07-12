# End-to-End Cowork MVP

This walkthrough verifies the current local Cowork-mode MVP from installer to first generated prompt.

## Prerequisites

- Node.js and npm available locally
- A git repository you want to prepare for Agentic SDD
- A real GitHub Issue number for the feature

## 1. Install the runtime kit

From this repository:

```bash
npx tsx packages/cli/src/index.ts inspect C:\path\to\target-repo
npx tsx packages/cli/src/index.ts install C:\path\to\target-repo
```

The installer:

- copies the runtime kit into the target repo;
- adds `agent:*` scripts when `package.json` exists;
- adds the local runtime dependency needed to execute those scripts;
- ensures `.agent_runtime/` is ignored by git.

## 2. Initialize the first feature

```bash
npx tsx packages/cli/src/index.ts init-feature C:\path\to\target-repo --issue 123 --slug improve-search --title "Improve search"
```

This command:

- creates or switches to `feature/123-improve-search`;
- creates `docs/features/123-improve-search/` from the template;
- fills in issue, slug, title, branch, and date placeholders;
- seeds `status.md` so the first prompt can be generated safely.

If `docs/features/INDEX.md` does not already exist in a recognized safe format, the command leaves it alone and reports that the INDEX update is pending.

## 3. Install target repo dependencies

Inside the target repository:

```bash
npm install
```

## 4. Generate the first prompt

Still inside the target repository:

```bash
npm run agent:next
```

Expected local outputs:

- `.agent_runtime/validation_report.json`
- `.agent_runtime/next_action.json`
- `.agent_runtime/context_files.txt`
- `.agent_runtime/next_prompt.md`

## 5. Execute in Cowork mode

Open:

```text
.agent_runtime/next_prompt.md
```

Paste that prompt into Claude Cowork, Codex, Gemini, or another human-supervised coworking tool.

The generated prompt is intentionally operational only:

- no dashboard;
- no API mode;
- no autonomous execution;
- no hidden agent actions;
- no automatic merge.

## 6. Keep human merge control

After each agent-assisted step:

- review the proposed changes;
- decide whether to commit them;
- re-run `npm run agent:next` for the next handoff;
- keep GitHub Issue, PR state, and `status.md` aligned manually.
