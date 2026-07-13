# Agentic SDD Orchestrator

Agentic SDD Orchestrator is a repository-connected workflow kit for human-supervised AI delivery. It inspects a local repository, installs the runtime kit, initializes a feature workspace from an issue, and renders the next prompt for a human-operated tool such as Codex, Claude Cowork, or Gemini.

## Release status

- `v0.1-demo` is tagged and remains the source-of-truth demo milestone.
- `v0.2` is a technical release candidate focused on CLI packaging, usability, docs, and verification.
- The recommended local development command is now `npm run agentic-sdd -- ...`.

## What the product does

- keeps GitHub and `status.md` as the source of truth for installed repositories and feature state;
- prepares repository-local runtime files instead of hosted infrastructure;
- supports a semi-assisted Cowork flow where the CLI generates the next prompt and a human or external tool executes it;
- preserves the current safety model by avoiding autonomous execution, external AI API calls, and auto-merge.

## Quickstart

Install orchestrator dependencies:

```bash
npm install
```

Create a PowerShell sandbox:

```powershell
$sandbox = Join-Path $env:TEMP "agentic-sdd-demo"
Remove-Item -Recurse -Force $sandbox -ErrorAction SilentlyContinue
mkdir $sandbox | Out-Null
git init $sandbox

@'
{
  "name": "agentic-sdd-demo",
  "version": "1.0.0",
  "private": true
}
'@ | Set-Content -Path (Join-Path $sandbox "package.json")
```

Prepare the target repository from this repo:

```bash
npm run agentic-sdd -- install <sandbox>
npm run agentic-sdd -- init-feature <sandbox> --issue 1 --slug demo-feature --title "Demo feature"
```

Finish the supported local flow inside the target repository:

```bash
cd <sandbox>
npm install
npm run agent:next
```

Open `.agent_runtime/next_prompt.md` and execute that prompt in a human-supervised tool.

## Supported flow

The current recommended v0.2 flow is:

1. `npm run agentic-sdd -- inspect <target-repo>`
2. `npm run agentic-sdd -- install <target-repo>`
3. `npm run agentic-sdd -- init-feature <target-repo> --issue <number> --slug <slug> --title <title>`
4. `cd <target-repo>`
5. `npm install`
6. `npm run agent:next`
7. Open `.agent_runtime/next_prompt.md`

## Safety guarantees

- GitHub and `status.md` remain the source of truth.
- Cowork mode stays semi-assisted: the CLI generates prompts, but a human or tool executes them.
- No external AI APIs are called by the orchestrator.
- No dashboard, hosted control plane, or API mode is introduced.
- No autonomous agent execution or automatic merge is performed.
- Human review and final merge remain required.

## Current limitations

- Local filesystem workflows only.
- Not packaged to npm yet.
- No GitHub App integration in the runtime flow.
- No remote repository cloning.
- No migration system for existing installed runtimes.

See [known limitations](./docs/product/known-limitations.md) for the detailed list.

## Roadmap

- [v0.2 CLI packaging release notes](./docs/releases/v0.2-cli-packaging.md)
- [Product roadmap](./docs/product/roadmap.md)
- [Product vision](./docs/product/vision.md)
- [Architecture overview](./docs/architecture/overview.md)
