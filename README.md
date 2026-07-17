# Agentic SDD Orchestrator

Agentic SDD Orchestrator is a repository-connected workflow kit for human-supervised AI delivery. It inspects a local repository, installs the runtime kit, initializes a feature workspace from an issue, and renders the next prompt for a human-operated tool such as Codex, Claude Cowork, or Gemini.

## Release status

- `v0.1-demo` is tagged and remains the source-of-truth demo milestone.
- `v0.2-cli` is tagged and focused on CLI packaging, usability, docs, and verification.
- `v0.3-project-manager-doctor` is tagged and adds a local project registry, a `doctor` command, and a `next` command so the CLI is easier to use across multiple target repositories.
- `v0.4` is a technical release candidate that adds agent, skill, and environment profiles so the orchestrator can define which agents exist, how they run, and what environment they run in.
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

## v0.3 quickstart: project manager and doctor

v0.3 adds a local project registry plus `doctor`/`next` commands so you can manage multiple target repositories by name instead of typing full paths every time. Run from PowerShell inside this repository:

```powershell
npm install

$sandbox = Join-Path $env:TEMP "agentic-sdd-v03-demo"
Remove-Item -Recurse -Force $sandbox -ErrorAction SilentlyContinue
mkdir $sandbox | Out-Null
git init $sandbox

@'
{
  "name": "agentic-sdd-v03-demo",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "test": "echo \"no tests\""
  },
  "devDependencies": {
    "tsx": "^4.20.0"
  }
}
'@ | Set-Content -Path (Join-Path $sandbox "package.json")

npm run agentic-sdd -- project add $sandbox --name demo
npm run agentic-sdd -- doctor demo
npm run agentic-sdd -- next demo
npm run agentic-sdd -- install $sandbox
npm run agentic-sdd -- init-feature $sandbox --issue 1 --slug demo-feature --title "Demo feature"

cd $sandbox
npm install
npm run agent:next
cd -

npm run agentic-sdd -- doctor demo
npm run agentic-sdd -- next demo
```

Open `.agent_runtime/next_prompt.md` inside `$sandbox` and hand it to a human-supervised tool (Cowork, Codex, Gemini, Claude). See [v0.3 release notes](./docs/releases/v0.3-project-manager-doctor.md) for the full command reference.

## v0.4 quickstart: agent, skill & environment profiles

v0.4 adds a local, inspectable configuration model for agents, prompt profiles, skills, and execution environments. Run from PowerShell inside this repository:

```powershell
npm run agentic-sdd -- config init
npm run agentic-sdd -- config validate
npm run agentic-sdd -- agent list
npm run agentic-sdd -- agent show codex_architect
npm run agentic-sdd -- profile list
npm run agentic-sdd -- env list
npm run agentic-sdd -- env show claude_cowork_browser
```

`config init` creates `.agentic-sdd/config.json` (gitignored, local to this machine) from the built-in defaults; without it, every command already falls back to those same defaults. See [v0.4 release notes](./docs/releases/v0.4-agent-skill-environment-profiles.md) for the full command reference, default agents, skills, and environments.

## Safety guarantees

- GitHub and `status.md` remain the source of truth.
- Cowork mode stays semi-assisted: the CLI generates prompts, but a human or tool executes them.
- No external AI APIs are called by the orchestrator.
- No dashboard, hosted control plane, or API mode is introduced.
- No autonomous agent execution or automatic merge is performed.
- `doctor` and `next` (v0.3) are strictly read-only against target repositories.
- `profile`, `agent`, `env`, `config show`/`validate`, and `project config` (v0.4) are strictly read-only; `config init` only ever writes inside the orchestrator's own `.agentic-sdd/` directory.
- `automatic` execution mode (v0.4) is a declared, validated setting only — no provider is called or auto-selected yet.
- Human review and final merge remain required.

## Current limitations

- Local filesystem workflows only.
- Not packaged to npm yet.
- No GitHub App integration in the runtime flow.
- No remote repository cloning.
- No migration system for existing installed runtimes.

See [known limitations](./docs/product/known-limitations.md) for the detailed list.

## Roadmap

- [v0.4 agent, skill & environment profiles release notes](./docs/releases/v0.4-agent-skill-environment-profiles.md)
- [v0.3 project manager and doctor release notes](./docs/releases/v0.3-project-manager-doctor.md)
- [v0.2 CLI packaging release notes](./docs/releases/v0.2-cli-packaging.md)
- [Product backlog](./docs/product/backlog.md)
- [Product roadmap](./docs/product/roadmap.md)
- [Product vision](./docs/product/vision.md)
- [Architecture overview](./docs/architecture/overview.md)
