import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import { validateWorkflowState } from "./lib/validate";
import { parseWorkflowContract } from "./lib/workflow_contract";

export { validateWorkflowState } from "./lib/validate";
export type {
  NormalizedState,
  ValidateWorkflowStateInput,
  ValidateWorkflowStateResult,
} from "./lib/validate";

const CONTRACT_PATH = ".agents/runtime/workflow_contract.json";
const RUNTIME_DIR = ".agent_runtime";
const VALIDATION_REPORT_PATH = `${RUNTIME_DIR}/validation_report.json`;
const UNCOMMITTED_HEAD = "0000000000000000000000000000000000000000";

export function featureIdFromBranch(branch: string): string | null {
  const match = /^feature\/(.+)$/.exec(branch);
  return match ? match[1] : null;
}

function readOptional(path: string): string | null {
  return existsSync(path) ? readFileSync(path, "utf8") : null;
}

function currentBranch(repoRoot: string): string {
  if (process.env.GITHUB_HEAD_REF) return process.env.GITHUB_HEAD_REF;
  if (process.env.GITHUB_REF_NAME) return process.env.GITHUB_REF_NAME;
  try {
    return execFileSync("git", ["symbolic-ref", "--short", "HEAD"], {
      cwd: repoRoot,
      encoding: "utf8",
    }).trim();
  } catch {
    return "";
  }
}

function currentCommitSha(repoRoot: string): string {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return UNCOMMITTED_HEAD;
  }
}

/**
 * Reads `current_state` from the previous commit's status.md for this
 * feature, so the validator can check transition reachability against the
 * state that was actually committed before HEAD, not just structural
 * membership in the allowed-state list.
 *
 * In GitHub Actions this should be `github.event.before`; locally it
 * defaults to `HEAD~1`. Returns null when there is no previous commit or
 * the feature folder did not exist yet at that commit (a legitimate first
 * validated state, checked against `entry_states` by the caller).
 */
function previousCurrentState(
  repoRoot: string,
  previousSha: string,
  featureId: string,
): string | null {
  if (!previousSha) return null;
  try {
    const raw = execFileSync(
      "git",
      ["show", `${previousSha}:docs/features/${featureId}/status.md`],
      { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    const match = /^current_state:\s*(.*)$/m.exec(raw);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

function previousCommitSha(repoRoot: string): string {
  if (process.env.GITHUB_EVENT_BEFORE) return process.env.GITHUB_EVENT_BEFORE;
  try {
    return execFileSync("git", ["rev-parse", "HEAD~1"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function writeRuntimeFile(repoRoot: string, relativePath: string, content: string): void {
  const fullPath = join(repoRoot, relativePath);
  const dir = dirname(fullPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(fullPath, content, "utf8");
}

export function runCli(argv: string[] = process.argv.slice(2)): number {
  const repoRoot = process.cwd();
  const branchArg = argv.find((arg) => arg.startsWith("--branch="))?.split("=")[1];
  const featureArg = argv.find((arg) => arg.startsWith("--feature="))?.split("=")[1];

  const branch = branchArg ?? currentBranch(repoRoot);
  const featureId = featureArg ?? featureIdFromBranch(branch);

  if (!featureId) {
    const message = `Current branch "${branch}" does not match the feature/<feature-id> pattern; nothing to validate.`;
    console.error(message);
    writeRuntimeFile(
      repoRoot,
      VALIDATION_REPORT_PATH,
      JSON.stringify({ ok: false, blocked: false, errors: [message] }, null, 2),
    );
    return 1;
  }

  const featureDir = join(repoRoot, "docs", "features", featureId);
  const statusMarkdown = readOptional(join(featureDir, "status.md"));
  const indexMarkdown = readOptional(join(repoRoot, "docs", "features", "INDEX.md"));
  const docsIssuesExists = existsSync(join(repoRoot, "docs", "issues"));

  const contract = parseWorkflowContract(
    readFileSync(join(repoRoot, CONTRACT_PATH), "utf8"),
  );

  const commitSha = currentCommitSha(repoRoot);
  const previousSha = previousCommitSha(repoRoot);
  const previousState = previousCurrentState(repoRoot, previousSha, featureId);

  const result = validateWorkflowState({
    featureId,
    branch,
    commitSha,
    statusMarkdown,
    indexMarkdown,
    readFeatureDoc: (relativePath) => readOptional(join(featureDir, relativePath)),
    docsIssuesExists,
    previousState,
    transitions: contract.transitions,
    entryStates: contract.entry_states,
    anyStateSuccessors: contract.any_state_successors,
    promptTemplateExists: (templatePath) => existsSync(join(repoRoot, templatePath)),
    runtimeSchemaExists: (schemaPath) => existsSync(join(repoRoot, schemaPath)),
    allowedStates: contract.allowed_states,
  });

  const report = {
    ok: result.ok,
    blocked: result.blocked,
    featureId,
    branch,
    errors: result.errors,
    normalized: result.normalized,
  };
  writeRuntimeFile(repoRoot, VALIDATION_REPORT_PATH, JSON.stringify(report, null, 2));

  if (result.ok) {
    console.log(`Workflow state valid for ${featureId} (${result.normalized?.currentState}).`);
    console.log(`Wrote ${VALIDATION_REPORT_PATH}`);
    return 0;
  }

  console.error("Agent runtime coordinator validation failed:");
  for (const error of result.errors) {
    console.error(`  - ${error}`);
  }
  console.error(`Wrote ${VALIDATION_REPORT_PATH}`);
  return 1;
}

const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  process.exitCode = runCli();
}
