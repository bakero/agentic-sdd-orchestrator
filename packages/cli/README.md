# Agentic SDD CLI

Local CLI for installing and operating the Agentic SDD runtime kit.

## Current commands

- `agentic-sdd inspect <target-repo>`
- `agentic-sdd install <target-repo>`
- `agentic-sdd install <target-repo> --dry-run`
- `agentic-sdd init-feature <target-repo> --issue <number> --slug <slug> --title <title>`

When running from this repository before packaging a standalone binary, use:

```bash
npx tsx packages/cli/src/index.ts <command> ...
```

## End-to-end quickstart

See [end-to-end-cowork-mvp.md](./docs/end-to-end-cowork-mvp.md) for the full local Cowork-mode flow.

## Installer responsibilities

The installer:

- copy runtime kit templates into the target repository;
- preserve existing files by default;
- report conflicts;
- ensure `.agent_runtime/` is ignored;
- add required package scripts when a `package.json` exists;
- add the runtime execution dependency required by those scripts;
- support dry-run mode;
- avoid external AI API calls;
- avoid autonomous workflow execution.

## `init-feature`

The `init-feature` command:

- creates or switches to the target `feature/<issue>-<slug>` branch;
- creates the first feature folder from `docs/features/_template`;
- fills in feature placeholders;
- initializes `status.md` in `BRANCH_INITIALIZED`;
- prepares the first executable Cowork prompt for Gemini Product Owner.

## Out of scope

- dashboard;
- API mode;
- GitHub App installation;
- remote repository cloning;
- automatic PR creation.
