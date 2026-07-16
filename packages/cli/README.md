# Agentic SDD CLI

Local CLI for installing and operating the Agentic SDD runtime kit.

This CLI is currently intended for local demo and developer usage. It prepares a target repository for semi-assisted Cowork mode; it does not execute external AI models itself.

v0.3 is a local development CLI release, not an npm-published standalone package yet.

## Current commands

- `agentic-sdd inspect <target-repo>`
- `agentic-sdd install <target-repo>`
- `agentic-sdd install <target-repo> --dry-run`
- `agentic-sdd init-feature <target-repo> --issue <number> --slug <slug> --title <title>`
- `agentic-sdd project add <target-repo> --name <name>`
- `agentic-sdd project list`
- `agentic-sdd project remove <name>`
- `agentic-sdd project inspect <name-or-target-repo>`
- `agentic-sdd doctor <name-or-target-repo>`
- `agentic-sdd next <name-or-target-repo>`

When running from this repository, use the packaged local script:

```bash
npm run agentic-sdd -- <command> ...
```

The legacy direct TypeScript entrypoint still works for development internals, but the recommended local workflow is the npm script above. A future npm package can add a real `agentic-sdd` bin after a built JavaScript output exists.

## Quickstart

Inspect a local repository:

```bash
npm run agentic-sdd -- inspect <target-repo>
```

Install the runtime kit:

```bash
npm run agentic-sdd -- install <target-repo>
```

Preview the install without writing files:

```bash
npm run agentic-sdd -- install <target-repo> --dry-run
```

Initialize the first feature from an issue:

```bash
npm run agentic-sdd -- init-feature <target-repo> --issue 1 --slug demo-feature --title "Demo feature"
```

Register a target repository under a short name:

```bash
npm run agentic-sdd -- project add <target-repo> --name <name>
```

List, remove, or inspect registered projects:

```bash
npm run agentic-sdd -- project list
npm run agentic-sdd -- project remove <name>
npm run agentic-sdd -- project inspect <name>
```

Diagnose a target repository's readiness (by registered name or direct path):

```bash
npm run agentic-sdd -- doctor <name-or-target-repo>
```

Get only the single most important next safe action:

```bash
npm run agentic-sdd -- next <name-or-target-repo>
```

## End-to-end quickstart

See [end-to-end-cowork-mvp.md](./docs/end-to-end-cowork-mvp.md) for the full local Cowork-mode flow.

For the demo-oriented script, see [../../docs/demo/v0.1-demo-script.md](../../docs/demo/v0.1-demo-script.md).

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

## `project` command group

The `project` commands manage a local registry of target repositories so you can refer to them by name instead of a full path.

- registry file: `.agentic-sdd/projects.json` inside the orchestrator repo (gitignored, local to this machine);
- `project add <target-repo> --name <name>` validates the path exists and is a git repository, rejects duplicate names, and writes the registry with an absolute, normalized path;
- `project list` prints registered names and paths, or a message plus a suggestion when none are registered;
- `project remove <name>` removes the registry entry only; it never deletes or modifies target repository files, and does not prompt for confirmation;
- `project inspect <name-or-target-repo>` resolves a registered name (or falls back to a direct path) and reports git/runtime/package-script/feature status.

## `doctor` and `next`

`doctor <name-or-target-repo>` runs a read-only diagnostic sweep (PASS/WARN/FAIL per check) covering target existence, git repository status, `package.json`, runtime kit folders, the Agent SDD Guard workflow, required agent npm scripts, `.agent_runtime/` gitignore status, feature folders and their `status.md`, `node_modules`, and the generated `next_prompt.md`. It prints an overall status (`READY`, `NEEDS_SETUP`, `NEEDS_FEATURE`, `NEEDS_NEXT_PROMPT`, `CHECK_WARNINGS`) and a recommended next command. It never writes to the target repository.

`next <name-or-target-repo>` reuses the same diagnostics as `doctor` but prints only the single most important next safe action - a short summary, the command to run (if any), and why. It does not execute the recommended action, call an AI model, or modify any files.

## Demo-ready workflow

The intended v0.3 local/dev flow is:

1. `project add` the local sandbox under a short name;
2. run `doctor`/`next` to see what is missing;
3. run `install` on that sandbox;
4. run `init-feature` with a real or demo issue number;
5. re-run `doctor`/`next` to confirm progress;
6. go into the target repository;
7. run `npm install`;
8. run `npm run agent:next`;
9. open `.agent_runtime/next_prompt.md`;
10. paste the prompt into Claude Cowork, Codex, Gemini, or a similar tool.

Human final merge remains required.

## Out of scope

- dashboard;
- API mode;
- npm publishing in this release;
- GitHub App installation;
- remote repository cloning;
- automatic PR creation;
- autonomous agent execution;
- external AI API calls.
