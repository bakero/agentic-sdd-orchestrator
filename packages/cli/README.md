# Agentic SDD CLI

Local CLI for installing and operating the Agentic SDD runtime kit.

## Initial scope

The first CLI milestone supports local target repositories.

Planned commands:

- `agentic-sdd inspect <target-repo>`
- `agentic-sdd install <target-repo>`
- `agentic-sdd install <target-repo> --dry-run`

## Installer responsibilities

The installer should:

- copy runtime kit templates into the target repository;
- preserve existing files by default;
- report conflicts;
- ensure `.agent_runtime/` is ignored;
- add required package scripts when a `package.json` exists;
- support dry-run mode;
- avoid external AI API calls;
- avoid autonomous workflow execution.

## Out of scope

- dashboard;
- API mode;
- GitHub App installation;
- remote repository cloning;
- automatic PR creation.
