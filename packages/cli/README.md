# Agentic SDD CLI

Local CLI for installing and operating the Agentic SDD runtime kit.

This CLI is currently intended for local demo and developer usage. It prepares a target repository for semi-assisted Cowork mode; it does not execute external AI models itself.

v0.4 is a local development CLI release, not an npm-published standalone package yet.

## Current commands

- `agentic-sdd inspect <target-repo>`
- `agentic-sdd install <target-repo>`
- `agentic-sdd install <target-repo> --dry-run`
- `agentic-sdd init-feature <target-repo> --issue <number> --slug <slug> --title <title>`
- `agentic-sdd project add <target-repo> --name <name>`
- `agentic-sdd project list`
- `agentic-sdd project remove <name>`
- `agentic-sdd project inspect <name-or-target-repo>`
- `agentic-sdd project config <name-or-target-repo>`
- `agentic-sdd doctor <name-or-target-repo>`
- `agentic-sdd next <name-or-target-repo>`
- `agentic-sdd profile list`
- `agentic-sdd profile show <profile-name>`
- `agentic-sdd agent list`
- `agentic-sdd agent show <agent-name>`
- `agentic-sdd env list`
- `agentic-sdd env show <environment-name>`
- `agentic-sdd config init [--force]`
- `agentic-sdd config show`
- `agentic-sdd config validate`

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

Create a local, editable configuration file and validate it:

```bash
npm run agentic-sdd -- config init
npm run agentic-sdd -- config validate
```

Inspect agents, prompt profiles, and execution environments:

```bash
npm run agentic-sdd -- agent list
npm run agentic-sdd -- agent show codex_architect
npm run agentic-sdd -- profile list
npm run agentic-sdd -- profile show technical_specification
npm run agentic-sdd -- env list
npm run agentic-sdd -- env show claude_cowork_browser
```

Preview which agents/environments would apply to a project:

```bash
npm run agentic-sdd -- project config <name-or-target-repo>
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
- `project inspect <name-or-target-repo>` resolves a registered name (or falls back to a direct path) and reports git/runtime/package-script/feature status;
- `project config <name-or-target-repo>` resolves a registered name (or falls back to a direct path) and prints which agents/profiles/environments the orchestrator's effective config would apply to it. It never writes to the project or the orchestrator config.

## `doctor` and `next`

`doctor <name-or-target-repo>` runs a read-only diagnostic sweep (PASS/WARN/FAIL per check) covering target existence, git repository status, `package.json`, runtime kit folders, the Agent SDD Guard workflow, required agent npm scripts, `.agent_runtime/` gitignore status, feature folders and their `status.md`, `node_modules`, and the generated `next_prompt.md`. It prints an overall status (`READY`, `NEEDS_SETUP`, `NEEDS_FEATURE`, `NEEDS_NEXT_PROMPT`, `CHECK_WARNINGS`) and a recommended next command. It never writes to the target repository.

`next <name-or-target-repo>` reuses the same diagnostics as `doctor` but prints only the single most important next safe action - a short summary, the command to run (if any), and why. It does not execute the recommended action, call an AI model, or modify any files.

## Agent, skill & environment profiles (`profile`, `agent`, `env`, `config`)

v0.4 adds a local, versioned configuration model covering agents, prompt profiles, skills, and execution environments:

- built-in defaults live at `packages/cli/src/config/defaults/default-config.json` (5 agents, 5 profiles, 18 skills, 5 environments);
- `config init` creates an editable local copy at `.agentic-sdd/config.json` (gitignored); without it, every command falls back to the built-in defaults automatically;
- `config show` prints the effective config (local override if present, otherwise defaults) with its source;
- `config validate` checks for duplicate names, dangling profile/skill references, invalid execution modes/context policies/reasoning levels, and missing required environment fields, exiting non-zero on any error;
- `profile list`/`show`, `agent list`/`show`, and `env list`/`show` inspect the effective config directly.

Each agent declares a role, default prompt profile, execution mode (`manual` or `automatic` - v0.4 only declares and validates `automatic`, it never calls a provider), a recommended provider, an optional external tool reference (a Gemini Gem / Custom GPT / Claude Project name - a label only, never called by the orchestrator), a skill list, responsibilities, and forbidden actions. Each environment declares OS, shell, command style, execution surface, available tools, execution rules, and forbidden actions, so prompt/command guidance can eventually adapt correctly between local PowerShell, local bash/zsh, Claude Cowork's browser surface, and plain manual copy/paste.

None of this renders a Cowork prompt yet; `lib/prompt-context.ts`'s resolution helpers exist as the seam the v0.5 handoff generator will build on.

## Demo-ready workflow

The intended v0.4 local/dev flow is:

1. `config init` and `config validate` to set up and check the local configuration;
2. `agent list`/`show`, `profile list`/`show`, `env list`/`show` to see what agents and environments are available;
3. `project add` the local sandbox under a short name;
4. run `doctor`/`next` to see what is missing;
5. run `install` on that sandbox;
6. run `init-feature` with a real or demo issue number;
7. re-run `doctor`/`next` to confirm progress;
8. go into the target repository;
9. run `npm install`;
10. run `npm run agent:next`;
11. open `.agent_runtime/next_prompt.md`;
12. paste the prompt into Claude Cowork, Codex, Gemini, or a similar tool.

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
