# Known Limitations

This repository currently ships a local Cowork-mode MVP. The current limitations are intentional and should be communicated clearly in demos.

## Product limitations

- local filesystem target repositories only;
- no dashboard;
- no API mode;
- no GitHub App integration;
- no remote clone flow;
- no package publishing yet;
- no migration system for upgrading previously installed runtime kits.

## Installer limitations

- limited installer conflict handling;
- existing files are preserved by default rather than merged intelligently;
- `docs/features/INDEX.md` is only updated when a known safe format exists;
- the current workflow is easiest in Node/TypeScript-friendly repositories because installed scripts run through npm and `tsx`.

## Runtime expectations

- target repositories need `npm install` after runtime kit installation;
- prompt generation is local only;
- the generated prompt still requires a human or coworking tool to execute it;
- merge decisions remain manual.

## Project registry limitations (v0.3)

- the local project registry (`.agentic-sdd/projects.json`) is per-machine and per-orchestrator-checkout; it is gitignored and not shared or synced between machines or clones;
- `project remove` only edits the registry; it does not detect or clean up other references to a removed project;
- `doctor`/`next` diagnostics are structural (file, folder, and script presence) rather than semantic; they do not validate the content of `status.md` or other documents;
- registering a project does not install the runtime kit; `install` remains a separate, explicit step.

## Agent, skill & environment profile limitations (v0.4)

- there is no per-project configuration override yet; `project config` previews the single, shared orchestrator-level effective config, not a project-specific one;
- `config init` writes a full copy of the defaults; there is no partial/patch override format, so editing a large local `config.json` by hand is the only customization path today;
- `automatic` execution mode is declared and validated but has no runtime effect; no provider is called or recommended programmatically yet;
- `config validate`'s `promptTemplate` check only looks for a plausible `.md`-style name; it does not verify the referenced template file exists on disk;
- no prompt was rendered from this configuration in v0.4; that is delivered in v0.5 (Multi-Agent Cowork Handoff), described below.

## Cowork handoff limitations (v0.5)

- the state → agent mapping only covers the seven states the runtime kit coordinator actively models (`IDEA_CAPTURED`, `BRANCH_INITIALIZED`, `READY_FOR_TECHNICAL_SPEC`, `READY_FOR_IMPLEMENTATION`, `IMPLEMENTATION_READY_FOR_REVIEW`, `READY_FOR_FUNCTIONAL_VALIDATION`, `READY_FOR_PR`); a feature in a blocked or unrecognized state does not get an executable handoff;
- if `status.md`'s `current_state` cannot be read, `handoff generate` reports `state_unknown` and refuses to guess rather than inventing a state;
- no token or context-size estimation yet; `context.inputFiles` lists file paths only, not their sizes - that is v0.6 scope (Cycles, Budgets & Token Estimation);
- `handoff write`'s output history (`.agentic-sdd/handoffs/`) is local to the orchestrator's machine and gitignored, same as the v0.3 project registry and v0.4 config override - it is not shared or synced;
- there is no per-project or per-agent default environment; `--environment` defaults to `local_windows_powershell` when omitted;
- the orchestrator does not track whether a written handoff was actually executed, or verify its outputs were produced - that is left to the human/agent's own final report and a subsequent `doctor`/`next` check.
