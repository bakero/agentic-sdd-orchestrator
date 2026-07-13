# Agentic SDD CLI

Local CLI for installing and operating the Agentic SDD runtime kit.

This CLI is currently intended for local demo and developer usage. It prepares a target repository for semi-assisted Cowork mode; it does not execute external AI models itself.

v0.2 is a local development CLI release, not an npm-published standalone package yet.

## Current commands

- `agentic-sdd inspect <target-repo>`
- `agentic-sdd install <target-repo>`
- `agentic-sdd install <target-repo> --dry-run`
- `agentic-sdd init-feature <target-repo> --issue <number> --slug <slug> --title <title>`

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

## Demo-ready workflow

The intended v0.2 local/dev flow is:

1. run `inspect` on a local sandbox;
2. run `install` on that sandbox;
3. run `init-feature` with a real or demo issue number;
4. go into the target repository;
5. run `npm install`;
6. run `npm run agent:next`;
7. open `.agent_runtime/next_prompt.md`;
8. paste the prompt into Claude Cowork, Codex, Gemini, or a similar tool.

Human final merge remains required.

## Out of scope

- dashboard;
- API mode;
- npm publishing in this release;
- GitHub App installation;
- remote repository cloning;
- automatic PR creation.
