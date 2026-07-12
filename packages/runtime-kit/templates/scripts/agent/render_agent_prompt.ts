import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import { buildPromptContext, renderPromptTemplate } from "./lib/render";
import type { NextAction } from "./lib/resolve";

export { buildPromptContext, renderPromptTemplate } from "./lib/render";
export type { PromptContext, RenderResult } from "./lib/render";

const RUNTIME_DIR = ".agent_runtime";
const NEXT_ACTION_PATH = `${RUNTIME_DIR}/next_action.json`;
const NEXT_PROMPT_PATH = `${RUNTIME_DIR}/next_prompt.md`;

function writeRuntimeFile(repoRoot: string, relativePath: string, content: string): void {
  const fullPath = join(repoRoot, relativePath);
  const dir = dirname(fullPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(fullPath, content, "utf8");
}

function currentCommitSha(repoRoot: string): string {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: repoRoot,
      encoding: "utf8",
    }).trim();
  } catch {
    return "";
  }
}

export function runCli(argv: string[] = process.argv.slice(2)): number {
  const repoRoot = process.cwd();
  const nextActionArg = argv.find((arg) => arg.startsWith("--next-action="))?.split("=")[1];
  const nextActionPath = nextActionArg ?? join(repoRoot, NEXT_ACTION_PATH);

  if (!existsSync(nextActionPath)) {
    console.log(
      `No ${NEXT_ACTION_PATH} found; nothing to render (the current state may be blocked, terminal, or agent:resolve has not run yet).`,
    );
    return 0;
  }

  const nextAction = JSON.parse(readFileSync(nextActionPath, "utf8")) as NextAction;

  const headSha = currentCommitSha(repoRoot);
  if (!nextAction.commit_sha || !headSha || nextAction.commit_sha !== headSha) {
    console.error(
      `Stale next_action.json: commit_sha "${nextAction.commit_sha ?? "(missing)"}" does not match current branch HEAD "${headSha || "(unresolved)"}". Re-run "npm run agent:next" before executing this prompt.`,
    );
    return 1;
  }

  if (!nextAction.prompt_template) {
    console.error(
      'next_action.json has no "prompt_template" set; nothing to render for this state.',
    );
    return 1;
  }

  const templatePath = join(repoRoot, nextAction.prompt_template);
  if (!existsSync(templatePath)) {
    console.error(`Prompt template "${nextAction.prompt_template}" is missing.`);
    return 1;
  }

  const template = readFileSync(templatePath, "utf8");
  const context = buildPromptContext(nextAction);
  const result = renderPromptTemplate(template, context);

  if (!result.ok || !result.rendered) {
    console.error("Failed to render prompt:");
    for (const error of result.errors) {
      console.error(`  - ${error}`);
    }
    return 1;
  }

  writeRuntimeFile(repoRoot, NEXT_PROMPT_PATH, result.rendered);
  console.log(`Wrote ${NEXT_PROMPT_PATH}`);
  return 0;
}

const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  process.exitCode = runCli();
}
