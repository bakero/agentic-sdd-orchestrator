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
