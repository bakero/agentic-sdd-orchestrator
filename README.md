# Agentic SDD Orchestrator

A repository-connected orchestration platform for human-supervised AI agent workflows.

The goal is to let a user connect a GitHub repository, detect missing setup, install an Agentic SDD runtime kit, configure agents/models/cost policies, and coordinate work through either:

- Cowork mode: generated prompts executed manually or semi-assisted in tools such as Claude Cowork, Codex, Gemini or similar.
- API mode: future direct execution through user-provided model API keys, with explicit cost controls and human gates.

## Core principles

- GitHub remains the source of truth for issues, pull requests and merge state.
- `status.md` remains the source of truth for feature workflow state.
- The orchestrator may validate state, resolve next actions and render prompts.
- The orchestrator must not silently override workflow state.
- Human final merge remains required.
- Cost and context usage must be visible, logged and optimizable.

## Initial target

The first milestone is to extract the semi-assisted runtime coordinator proven in `events-app` into an installable runtime kit.

## v0.1 status

v0.1 is a demo-ready local MVP for Cowork mode.

What it supports:

- local repository inspection;
- local runtime kit installation;
- dry-run install preview;
- feature initialization with `init-feature`;
- local prompt generation through `npm run agent:next`;
- human-supervised execution in Claude Cowork, Codex, Gemini, or similar tools.

What it does not support:

- dashboard;
- API mode;
- autonomous execution;
- automatic merge;
- external AI API calls;
- remote repository cloning;
- production packaging or hosted operations.

## v0.1 quickstart

Install orchestrator dependencies:

```bash
npm install
```

Create a sandbox in PowerShell:

```powershell
$sandbox = Join-Path $env:TEMP "agentic-sdd-demo-sandbox"
if (Test-Path $sandbox) { Remove-Item -Recurse -Force $sandbox }
New-Item -ItemType Directory -Path $sandbox | Out-Null
git -C $sandbox init
@'
{
  "name": "agentic-sdd-demo-sandbox",
  "version": "1.0.0",
  "private": true
}
'@ | Set-Content -Path (Join-Path $sandbox "package.json")
```

Install the runtime kit from this repository:

```bash
npx tsx packages/cli/src/index.ts install <sandbox>
```

Initialize the first feature:

```bash
npx tsx packages/cli/src/index.ts init-feature <sandbox> --issue 1 --slug demo-feature --title "Demo feature"
```

Inside the target repo:

```bash
npm install
npm run agent:next
```

Open:

```text
.agent_runtime/next_prompt.md
```

Paste that generated prompt into Claude Cowork, Codex, Gemini, or a similar human-supervised tool.

## Safety guarantees

- GitHub and `status.md` remain the source of truth;
- prompt generation is semi-assisted only;
- no autonomous execution is performed by the orchestrator;
- no automatic merge is performed by the orchestrator;
- human final merge remains required.

## Current limitations

See [docs/product/known-limitations.md](./docs/product/known-limitations.md).

## Next roadmap

- improve installer conflict reporting;
- make feature index updates more structured;
- prepare packaging and distribution options for the CLI;
- expand verification and demo coverage without changing the safety model.
