# Runtime Kit Installer Design

## Goal

Build the first local installer for the Agentic SDD runtime kit.

The installer copies the runtime kit templates from this repository into a target repository and prepares that target repository for Cowork-mode Agentic SDD usage.

## Initial command

`agentic-sdd install <target-repo>`

Optional:

`agentic-sdd install <target-repo> --dry-run`

## Inputs

- target repository path;
- runtime kit template path;
- dry-run flag;
- overwrite flag in the future.

## Outputs

- copied runtime kit files;
- install report;
- conflict report;
- updated target `.gitignore`;
- updated target `package.json` scripts when applicable.

## Safety rules

- preserve existing target files by default;
- do not overwrite files unless explicitly allowed;
- do not call external AI APIs;
- do not execute agents;
- do not create commits automatically;
- do not create pull requests automatically;
- do not modify application code except package scripts and `.gitignore` when required.

## Files installed

The installer copies the contents of:

`packages/runtime-kit/templates/`

into the target repository root.

## Required package scripts

When the target repository has a `package.json`, the installer should add these scripts if missing:

- `agent:validate`
- `agent:resolve`
- `agent:prompt`
- `agent:next`

Existing scripts must not be overwritten.

## Gitignore requirement

The installer must ensure this entry exists:

`.agent_runtime/`

## Dry run

Dry-run mode should report intended actions without writing files.

## Inspect command

`agentic-sdd inspect <target-repo>` should report:

- whether the target exists;
- whether it looks like a git repository;
- whether runtime kit files are already installed;
- missing files;
- package script status;
- `.agent_runtime/` gitignore status.

## First implementation boundary

For Issue #3, support local filesystem target repositories only.

Do not support remote cloning, GitHub App installation, dashboard flows or API mode yet.
