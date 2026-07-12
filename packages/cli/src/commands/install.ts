import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { copyRuntimeKit } from "../lib/copy-runtime-kit.js";
import { ensurePackageJsonScripts } from "../lib/package-json.js";
import { assertUsableTargetRepo } from "../lib/target-repo.js";

export type InstallCommandOptions = {
  targetPath: string;
  dryRun?: boolean;
};

export function runInstallCommand(options: InstallCommandOptions): void {
  const target = assertUsableTargetRepo(options.targetPath);
  const dryRun = options.dryRun ?? false;
  const templateRoot = path.resolve("packages/runtime-kit/templates");

  const copyReport = copyRuntimeKit({
    templateRoot,
    targetRoot: target.targetPath,
    dryRun
  });

  const packageReport = ensurePackageJsonScripts(target.targetPath, dryRun);
  const gitignoreChanged = ensureAgentRuntimeGitignore(target.targetPath, dryRun);

  console.log("Agentic SDD runtime kit install");
  console.log("");
  console.log(`Target: ${target.targetPath}`);
  console.log(`Dry run: ${dryRun}`);
  console.log(`Copied files: ${copyReport.copiedFiles.length}`);
  console.log(`Skipped existing files: ${copyReport.skippedExistingFiles.length}`);
  console.log(`Missing package scripts after install: ${packageReport.missingScripts.join(", ") || "none"}`);
  console.log(`.agent_runtime/ gitignore ensured: ${gitignoreChanged || dryRun}`);
}

function ensureAgentRuntimeGitignore(targetPath: string, dryRun: boolean): boolean {
  const gitignorePath = path.join(targetPath, ".gitignore");
  const requiredEntry = ".agent_runtime/";

  if (!existsSync(gitignorePath)) {
    if (!dryRun) {
      writeFileSync(gitignorePath, `${requiredEntry}\n`);
    }

    return true;
  }

  const content = readFileSync(gitignorePath, "utf8");

  if (content.split(/\r?\n/).includes(requiredEntry)) {
    return false;
  }

  if (!dryRun) {
    const prefix = content.endsWith("\n") || content.length === 0 ? "" : "\n";
    appendFileSync(gitignorePath, `${prefix}${requiredEntry}\n`);
  }

  return true;
}
