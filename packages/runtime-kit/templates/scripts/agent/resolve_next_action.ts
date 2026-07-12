import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import { resolveNextAction } from "./lib/resolve";
import type { NormalizedState } from "./lib/validate";

export { resolveNextAction } from "./lib/resolve";
export type { NextAction, ResolveNextActionResult } from "./lib/resolve";

const RUNTIME_DIR = ".agent_runtime";
const VALIDATION_REPORT_PATH = `${RUNTIME_DIR}/validation_report.json`;
const NEXT_ACTION_PATH = `${RUNTIME_DIR}/next_action.json`;
const CONTEXT_FILES_PATH = `${RUNTIME_DIR}/context_files.txt`;
const SCHEMA_PATH = ".agents/runtime/next_action.schema.json";

interface ValidationReport {
  ok: boolean;
  blocked: boolean;
  featureId: string;
  branch: string;
  errors: string[];
  normalized: NormalizedState | null;
}

function writeRuntimeFile(repoRoot: string, relativePath: string, content: string): void {
  const fullPath = join(repoRoot, relativePath);
  const dir = dirname(fullPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(fullPath, content, "utf8");
}

function removeIfExists(repoRoot: string, relativePath: string): void {
  const fullPath = join(repoRoot, relativePath);
  if (existsSync(fullPath)) {
    rmSync(fullPath);
  }
}

export function runCli(argv: string[] = process.argv.slice(2)): number {
  const repoRoot = process.cwd();
  const reportArg = argv.find((arg) => arg.startsWith("--report="))?.split("=")[1];
  const reportPath = reportArg ?? join(repoRoot, VALIDATION_REPORT_PATH);

  if (!existsSync(reportPath)) {
    console.error(
      `resolve_next_action requires ${VALIDATION_REPORT_PATH} (run "npm run agent:validate" first).`,
    );
    return 1;
  }

  const report = JSON.parse(readFileSync(reportPath, "utf8")) as ValidationReport;

  if (!report.ok || !report.normalized) {
    console.error(
      "Cannot resolve next_action: the last validation run failed. Fix the reported errors and re-run agent:validate.",
    );
    return 1;
  }

  removeIfExists(repoRoot, NEXT_ACTION_PATH);
  removeIfExists(repoRoot, CONTEXT_FILES_PATH);

  if (report.blocked) {
    console.log(
      `current_state "${report.normalized.currentState}" is blocked or terminal; no next_action.json was generated. Resolve the block and re-run.`,
    );
    return 0;
  }

  const schema = JSON.parse(readFileSync(join(repoRoot, SCHEMA_PATH), "utf8"));
  const generatedAt = new Date().toISOString();

  const { skipped, reason, nextAction, schemaErrors } = resolveNextAction(
    report.normalized,
    generatedAt,
    schema,
  );

  if (skipped) {
    console.log(reason);
    return 0;
  }

  if (schemaErrors.length > 0 || !nextAction) {
    console.error("Resolved next_action failed schema validation:");
    for (const error of schemaErrors) {
      console.error(`  - ${error}`);
    }
    return 1;
  }

  writeRuntimeFile(repoRoot, NEXT_ACTION_PATH, JSON.stringify(nextAction, null, 2));
  writeRuntimeFile(
    repoRoot,
    CONTEXT_FILES_PATH,
    `${nextAction.required_reading.join("\n")}\n`,
  );

  console.log(`Wrote ${NEXT_ACTION_PATH} and ${CONTEXT_FILES_PATH}.`);
  return 0;
}

const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  process.exitCode = runCli();
}
