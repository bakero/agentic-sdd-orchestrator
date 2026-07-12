import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { assertUsableTargetRepo } from "../lib/target-repo.js";

export type InitFeatureCommandOptions = {
  targetPath: string;
  issue: number;
  slug: string;
  title: string;
};

type IndexUpdateResult =
  | { status: "updated"; path: string }
  | { status: "pending"; reason: string };

export function runInitFeatureCommand(options: InitFeatureCommandOptions): void {
  const target = assertUsableTargetRepo(options.targetPath);
  const issue = normalizeIssue(options.issue);
  const slug = normalizeSlug(options.slug);
  const title = normalizeTitle(options.title);
  const featureId = `${issue}-${slug}`;
  const branchName = `feature/${featureId}`;
  const today = new Date().toISOString().slice(0, 10);
  const templateRoot = path.resolve("packages/runtime-kit/templates/docs/features/_template");
  const featuresRoot = path.join(target.targetPath, "docs", "features");
  const featureRoot = path.join(featuresRoot, featureId);

  if (!existsSync(templateRoot)) {
    throw new Error(`Feature template root does not exist: ${templateRoot}`);
  }

  if (existsSync(featureRoot)) {
    throw new Error(`Feature folder already exists: ${featureRoot}`);
  }

  ensureFeatureBranch(target.targetPath, branchName);

  mkdirSync(featuresRoot, { recursive: true });
  copyDirectory(templateRoot, featureRoot);
  applyReplacements(featureRoot, {
    "<issue-id>-<short-slug>": featureId,
    "<issue-id>": String(issue),
    "feature/<issue-id>-<short-slug>": branchName,
    "<YYYY-MM-DD>": today,
  });

  writeFileSync(path.join(featureRoot, "README.md"), buildReadmeMarkdown({
    issue,
    slug,
    title,
    featureId,
    branchName,
    today,
  }));
  writeFileSync(path.join(featureRoot, "status.md"), buildStatusMarkdown({
    issue,
    title,
    featureId,
    branchName,
    today,
  }));

  const indexUpdate = maybeUpdateFeaturesIndex(target.targetPath, {
    issue,
    featureId,
    title,
    branchName,
  });

  console.log("Agentic SDD feature initialization");
  console.log("");
  console.log(`Target: ${target.targetPath}`);
  console.log(`Feature: ${featureId}`);
  console.log(`Branch: ${branchName}`);
  console.log(`Created: docs/features/${featureId}`);
  if (indexUpdate.status === "updated") {
    console.log(`INDEX.md updated: ${path.relative(target.targetPath, indexUpdate.path).replaceAll("\\", "/")}`);
  } else {
    console.log(`INDEX.md update pending: ${indexUpdate.reason}`);
  }
}

function ensureFeatureBranch(targetPath: string, branchName: string): void {
  if (!isGitRepository(targetPath)) {
    throw new Error(
      `Target repository must be a git repository before init-feature can create ${branchName}.`,
    );
  }

  const currentBranch = gitOutput(targetPath, ["rev-parse", "--abbrev-ref", "HEAD"]);
  if (currentBranch === branchName) {
    return;
  }

  const branchExists = gitExitCode(targetPath, ["show-ref", "--verify", `refs/heads/${branchName}`]) === 0;
  if (branchExists) {
    execFileSync("git", ["checkout", branchName], {
      cwd: targetPath,
      encoding: "utf8",
      stdio: ["ignore", "ignore", "pipe"],
    });
    return;
  }

  execFileSync("git", ["checkout", "-b", branchName], {
    cwd: targetPath,
    encoding: "utf8",
    stdio: ["ignore", "ignore", "pipe"],
  });
}

function isGitRepository(targetPath: string): boolean {
  return gitExitCode(targetPath, ["rev-parse", "--is-inside-work-tree"]) === 0;
}

function gitOutput(targetPath: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: targetPath,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function gitExitCode(targetPath: string, args: string[]): number {
  try {
    execFileSync("git", args, {
      cwd: targetPath,
      encoding: "utf8",
      stdio: ["ignore", "ignore", "ignore"],
    });
    return 0;
  } catch (error) {
    return typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status?: number }).status ?? 1)
      : 1;
  }
}

function normalizeIssue(issue: number): number {
  if (!Number.isInteger(issue) || issue <= 0) {
    throw new Error(`"--issue" must be a positive integer (got "${String(issue)}").`);
  }
  return issue;
}

function normalizeSlug(slug: string): string {
  const normalized = slug.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
    throw new Error(
      `"--slug" must use lowercase letters, numbers, and single hyphens only (got "${slug}").`,
    );
  }
  return normalized;
}

function normalizeTitle(title: string): string {
  const normalized = title.trim();
  if (!normalized) {
    throw new Error('"--title" must not be empty.');
  }
  return normalized;
}

function copyDirectory(sourceDirectory: string, targetDirectory: string): void {
  mkdirSync(targetDirectory, { recursive: true });

  for (const entry of readdirSync(sourceDirectory)) {
    const sourcePath = path.join(sourceDirectory, entry);
    const targetPath = path.join(targetDirectory, entry);
    const sourceStat = statSync(sourcePath);

    if (sourceStat.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
      continue;
    }

    cpSync(sourcePath, targetPath);
  }
}

function applyReplacements(
  featureRoot: string,
  replacements: Record<string, string>,
): void {
  for (const entry of readdirSync(featureRoot)) {
    const fullPath = path.join(featureRoot, entry);
    const entryStat = statSync(fullPath);

    if (entryStat.isDirectory()) {
      applyReplacements(fullPath, replacements);
      continue;
    }

    const content = readFileSync(fullPath, "utf8");
    const updated = Object.entries(replacements).reduce(
      (current, [from, to]) => current.split(from).join(to),
      content,
    );
    writeFileSync(fullPath, updated);
  }
}

function buildReadmeMarkdown(input: {
  issue: number;
  slug: string;
  title: string;
  featureId: string;
  branchName: string;
  today: string;
}): string {
  return `---
feature_id: ${input.featureId}
issue: ${input.issue}
branch: ${input.branchName}
document: README
status: IN_PROGRESS
owner_agent: gemini-product-owner
last_updated: ${input.today}
---

# ${input.title}

## Summary

Initial feature workspace for Issue #${input.issue}.

## Why this feature exists

Pending functional discovery with the human.

## Final functional scope

To be defined by Gemini Product Owner during functional discovery.

## Final technical scope

Not defined yet.

## Tests and validation

Technical planning has not started yet.

## Documentation updated

Feature folder initialized from the runtime kit template.

## Risks or limitations

Functional requirements, scope boundaries, and conflicts still need confirmation.

## Links

- Issue: #${input.issue}
- Branch: ${input.branchName}
- PR: TBD
`;
}

function buildStatusMarkdown(input: {
  issue: number;
  title: string;
  featureId: string;
  branchName: string;
  today: string;
}): string {
  return `---
feature_id: ${input.featureId}
issue: ${input.issue}
branch: ${input.branchName}
document: status
current_state: BRANCH_INITIALIZED
current_agent: gemini-product-owner
next_agent: gemini-product-owner
blocked: false
last_updated: ${input.today}
---

# Status

## Current summary

Feature workspace initialized for Issue #${input.issue}: ${input.title}. The next step is functional discovery and the first draft of the functional specification.

## Checklist

- [x] Issue created
- [x] Branch created
- [x] Documentation folder initialized
- [ ] Functional spec approved
- [ ] Technical spec ready
- [ ] Test plan ready
- [ ] Implementation complete
- [ ] Technical review approved
- [ ] Functional validation approved
- [ ] PR created

## Blocking issues

None.

## Agent Cost Log

| Phase | Agent | Model/mode | Reasoning | Context budget | Result | Notes |
|---|---|---|---|---|---|---|
| Branch initialization | gemini-product-owner | cowork-manual | low | XS | initialized | Feature folder scaffolded by the CLI for Issue #${input.issue}. |

## Next Agent Cost Recommendation

Recommended agent: gemini-product-owner.
Recommended model/mode: Cowork / manual prompt.
Reasoning level: medium
Opusplan: no.
Context budget: S
Rationale: Complete functional discovery and produce the first approved functional specification before any technical handoff.

## Context Pack for Next Agent

### Next agent

gemini-product-owner

### Required reading

- docs/features/${input.featureId}/README.md
- docs/features/${input.featureId}/status.md
- docs/agents/workflow.md
- docs/agents/common_contract.md

### Targeted reading

- docs/agents/roles/gemini_product_owner.md

### Optional reading

- docs/agents/context_strategy.md
- docs/agents/escalation_policy.md

### Do not read by default

- Historical feature folders unless a conflict or dependency is explicitly suspected.
- Full repository code unless functional discovery proves it is necessary.

### Context budget

S

### Relevant code areas to inspect

- None.

### Relevant tests to inspect or run

- None.

### Known constraints

- GitHub Issues remain the source of truth.
- Human merge control remains required.
- No dashboard, API mode, autonomous execution, or automatic merge.

### Open questions

- None.

### Reason for selected context

These documents are enough to complete feature intake, ask the human only the necessary questions, and draft the first functional specification safely.
`;
}

function maybeUpdateFeaturesIndex(
  targetRoot: string,
  input: { issue: number; featureId: string; title: string; branchName: string },
): IndexUpdateResult {
  const indexPath = path.join(targetRoot, "docs", "features", "INDEX.md");
  if (!existsSync(indexPath)) {
    return {
      status: "pending",
      reason: "docs/features/INDEX.md does not exist and no safe template format is defined yet.",
    };
  }

  const content = readFileSync(indexPath, "utf8");
  const rowPrefix = `| ${input.issue} | ${input.title} |`;
  if (content.includes(rowPrefix) || content.includes(input.featureId)) {
    return {
      status: "pending",
      reason: `docs/features/INDEX.md already references ${input.featureId}.`,
    };
  }

  const headers = /^\|\s*Issue\s*\|\s*Feature\s*\|\s*Status\s*\|\s*Path\s*\|\s*Branch\s*\|\s*$/m;
  if (!headers.test(content)) {
    return {
      status: "pending",
      reason: "Existing docs/features/INDEX.md format is not a known safe table layout.",
    };
  }

  const lines = content.split(/\r?\n/);
  let insertAt = -1;
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (lines[index]?.trim().startsWith("|")) {
      insertAt = index;
      break;
    }
  }
  const row = `| ${input.issue} | ${input.title} | BRANCH_INITIALIZED | docs/features/${input.featureId} | ${input.branchName} |`;
  lines.splice(insertAt + 1, 0, row);
  writeFileSync(indexPath, `${lines.join("\n")}\n`);

  return { status: "updated", path: indexPath };
}
