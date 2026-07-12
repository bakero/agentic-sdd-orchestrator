# Runtime Kit Extraction Summary

## Current status

The first runtime kit template extraction has been completed.

## Extracted assets

The following generic assets were copied from `events-app` PR #7 into `packages/runtime-kit/templates/`:

- agent prompt templates;
- agent rules;
- runtime contracts;
- workflow documentation;
- feature template documents;
- metrics files;
- runtime coordinator scripts;
- GitHub Actions guard workflow.

## Sanitization performed

Direct references to the original sandbox feature were removed from runtime examples:

- `feature/6-agent-runtime-coordinator` replaced with `feature/123-example-feature`;
- `Issue #6` replaced with `Issue #123`.

No direct references to `events-app`, `bakero`, `PR #7`, or local Windows paths remain in the extracted templates.

## Manifest

A generated template manifest is available at:

`packages/runtime-kit/docs/template-file-manifest.txt`

## Next work

The next step is to turn the copied templates into an installable runtime kit by adding:

- an installer strategy;
- package metadata;
- dependency requirements;
- validation against a clean sandbox repository;
- generic configuration placeholders where needed.
