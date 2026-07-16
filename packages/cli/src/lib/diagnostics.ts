import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { inspectPackageJsonScripts } from "./package-json.js";
import { inspectTargetRepo, type TargetRepoInspection } from "./target-repo.js";

export const RUNTIME_KIT_PATHS = [
  ".agents",
  "docs/agents",
  "docs/features",
  "docs/metrics",
  "scripts/agent",
] as const;

export const GUARD_WORKFLOW_PATH = ".github/workflows/agent-sdd-guard.yml";

export const DOCTOR_REQUIRED_SCRIPTS = [
  "agent:validate",
  "agent:next",
  "agent:prompt",
  "agent:log-call",
] as const;

export type FeatureFolderReport = {
  featureId: string;
  hasStatusMarkdown: boolean;
};

export type TargetDiagnostics = {
  target: TargetRepoInspection;
  packageJsonExists: boolean;
  missingRuntimePaths: string[];
  hasGuardWorkflow: boolean;
  missingAgentScripts: string[];
  presentAgentScripts: string[];
  agentRuntimeDirExists: boolean;
  agentRuntimeIsGitignored: boolean;
  nodeModulesExists: boolean;
  docsFeaturesExists: boolean;
  featureFolders: FeatureFolderReport[];
  nextPromptExists: boolean;
};

export function isRuntimeKitInstalled(diagnostics: TargetDiagnostics): boolean {
  return diagnostics.missingRuntimePaths.length === 0 && diagnostics.hasGuardWorkflow;
}

/**
 * Read-only diagnostic sweep over a target repository. Shared by `inspect`,
 * `project inspect`, and `doctor` so their reports stay consistent instead
 * of drifting apart. Never writes to the target.
 */
export function diagnoseTargetRepo(inputPath: string): TargetDiagnostics {
  const target = inspectTargetRepo(inputPath);
  const targetPath = target.targetPath;

  const packageJsonExists = existsSync(path.join(targetPath, "package.json"));

  const missingRuntimePaths = RUNTIME_KIT_PATHS.filter(
    (runtimePath) => !existsSync(path.join(targetPath, runtimePath))
  );

  const hasGuardWorkflow = existsSync(path.join(targetPath, GUARD_WORKFLOW_PATH));

  const packageReport = inspectPackageJsonScripts(targetPath);
  const missingAgentScripts = DOCTOR_REQUIRED_SCRIPTS.filter(
    (scriptName) => !packageReport.existingScripts.includes(scriptName) && missingScript(targetPath, scriptName)
  );
  const presentAgentScripts = DOCTOR_REQUIRED_SCRIPTS.filter(
    (scriptName) => !missingAgentScripts.includes(scriptName)
  );

  const agentRuntimeDirExists = existsSync(path.join(targetPath, ".agent_runtime"));
  const agentRuntimeIsGitignored = isPathGitignored(targetPath, ".agent_runtime/");
  const nodeModulesExists = existsSync(path.join(targetPath, "node_modules"));
  const docsFeaturesPath = path.join(targetPath, "docs", "features");
  const docsFeaturesExists = existsSync(docsFeaturesPath);
  const featureFolders = docsFeaturesExists ? listFeatureFolders(docsFeaturesPath) : [];
  const nextPromptExists = existsSync(path.join(targetPath, ".agent_runtime", "next_prompt.md"));

  return {
    target,
    packageJsonExists,
    missingRuntimePaths,
    hasGuardWorkflow,
    missingAgentScripts,
    presentAgentScripts,
    agentRuntimeDirExists,
    agentRuntimeIsGitignored,
    nodeModulesExists,
    docsFeaturesExists,
    featureFolders,
    nextPromptExists,
  };
}

function missingScript(targetPath: string, scriptName: string): boolean {
  const packageJsonPath = path.join(targetPath, "package.json");
  if (!existsSync(packageJsonPath)) {
    return true;
  }

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      scripts?: Record<string, string>;
    };
    return !(scriptName in (packageJson.scripts ?? {}));
  } catch {
    return true;
  }
}

function isPathGitignored(targetPath: string, entry: string): boolean {
  const gitignorePath = path.join(targetPath, ".gitignore");
  if (!existsSync(gitignorePath)) {
    return false;
  }

  const lines = readFileSync(gitignorePath, "utf8").split(/\r?\n/);
  return lines.some((line) => line.trim() === entry || line.trim() === entry.replace(/\/$/, ""));
}

function listFeatureFolders(docsFeaturesPath: string): FeatureFolderReport[] {
  const entries = readdirSync(docsFeaturesPath).filter((entry) => {
    if (entry === "_template" || entry === "INDEX.md") {
      return false;
    }
    return statSync(path.join(docsFeaturesPath, entry)).isDirectory();
  });

  return entries
    .sort()
    .map((featureId) => ({
      featureId,
      hasStatusMarkdown: existsSync(path.join(docsFeaturesPath, featureId, "status.md")),
    }));
}
