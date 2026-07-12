import { existsSync } from "node:fs";
import path from "node:path";
import { inspectPackageJsonScripts } from "../lib/package-json.js";
import { inspectTargetRepo } from "../lib/target-repo.js";

export type InspectCommandOptions = {
  targetPath: string;
};

export function runInspectCommand(options: InspectCommandOptions): void {
  const target = inspectTargetRepo(options.targetPath);
  const packageReport = inspectPackageJsonScripts(target.targetPath);

  const requiredRuntimePaths = [
    ".agents",
    "docs/agents",
    "docs/features",
    "docs/metrics",
    "scripts/agent",
    ".github/workflows/agent-sdd-guard.yml"
  ];

  const missingRuntimePaths = requiredRuntimePaths.filter(
    (runtimePath) => !existsSync(path.join(target.targetPath, runtimePath))
  );

  const gitignorePath = path.join(target.targetPath, ".gitignore");
  const hasGitignore = existsSync(gitignorePath);

  console.log("Agentic SDD target inspection");
  console.log("");
  console.log(`Target: ${target.targetPath}`);
  console.log(`Exists: ${target.exists}`);
  console.log(`Directory: ${target.isDirectory}`);
  console.log(`Git repository: ${target.isGitRepository}`);
  console.log(`package.json: ${packageReport.exists}`);
  console.log(`Missing package scripts: ${packageReport.missingScripts.join(", ") || "none"}`);
  console.log(`Missing runtime paths: ${missingRuntimePaths.join(", ") || "none"}`);
  console.log(`.gitignore exists: ${hasGitignore}`);
}
