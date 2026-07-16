import path from "node:path";
import { diagnoseTargetRepo, isRuntimeKitInstalled, type TargetDiagnostics } from "./diagnostics.js";

export type CheckStatus = "PASS" | "WARN" | "FAIL";

export type DoctorCheck = {
  label: string;
  status: CheckStatus;
  detail: string;
};

export type OverallStatus =
  | "READY"
  | "NEEDS_SETUP"
  | "NEEDS_FEATURE"
  | "NEEDS_NEXT_PROMPT"
  | "CHECK_WARNINGS";

export type NextAction = {
  summary: string;
  command: string | null;
  reason: string;
};

export type DoctorReport = {
  diagnostics: TargetDiagnostics;
  checks: DoctorCheck[];
  overallStatus: OverallStatus;
  nextAction: NextAction;
};

/**
 * Read-only diagnosis of a target repository's Agentic SDD readiness.
 * Shared by the `doctor` and `next` commands so their verdicts never
 * disagree. Never writes to the target repository.
 */
export function runDoctor(targetPath: string): DoctorReport {
  const diagnostics = diagnoseTargetRepo(targetPath);
  const checks = buildChecks(diagnostics);
  const nextAction = recommendNextAction(diagnostics);
  const overallStatus = computeOverallStatus(diagnostics, checks);

  return { diagnostics, checks, overallStatus, nextAction };
}

function buildChecks(diagnostics: TargetDiagnostics): DoctorCheck[] {
  const checks: DoctorCheck[] = [];
  const targetPath = diagnostics.target.targetPath;

  checks.push({
    label: "Target path exists",
    status: diagnostics.target.exists ? "PASS" : "FAIL",
    detail: targetPath,
  });

  checks.push({
    label: "Target is a directory",
    status: diagnostics.target.exists && diagnostics.target.isDirectory ? "PASS" : "FAIL",
    detail: diagnostics.target.isDirectory ? "yes" : "no",
  });

  checks.push({
    label: "Git repository",
    status: diagnostics.target.isGitRepository ? "PASS" : "FAIL",
    detail: diagnostics.target.isGitRepository ? ".git found" : ".git not found",
  });

  checks.push({
    label: "package.json exists",
    status: diagnostics.packageJsonExists ? "PASS" : "FAIL",
    detail: diagnostics.packageJsonExists ? "found" : "missing",
  });

  checks.push({
    label: "Runtime kit folders present",
    status: diagnostics.missingRuntimePaths.length === 0 ? "PASS" : "FAIL",
    detail:
      diagnostics.missingRuntimePaths.length === 0
        ? "all present"
        : `missing: ${diagnostics.missingRuntimePaths.join(", ")}`,
  });

  checks.push({
    label: "Agent SDD Guard workflow present",
    status: diagnostics.hasGuardWorkflow ? "PASS" : "FAIL",
    detail: diagnostics.hasGuardWorkflow
      ? ".github/workflows/agent-sdd-guard.yml found"
      : ".github/workflows/agent-sdd-guard.yml missing",
  });

  checks.push({
    label: "package.json agent scripts present",
    status: diagnostics.missingAgentScripts.length === 0 ? "PASS" : "FAIL",
    detail:
      diagnostics.missingAgentScripts.length === 0
        ? "all present"
        : `missing: ${diagnostics.missingAgentScripts.join(", ")}`,
  });

  checks.push({
    label: ".agent_runtime/ is gitignored",
    status: diagnostics.agentRuntimeDirExists
      ? diagnostics.agentRuntimeIsGitignored
        ? "PASS"
        : "WARN"
      : "PASS",
    detail: diagnostics.agentRuntimeDirExists
      ? diagnostics.agentRuntimeIsGitignored
        ? "gitignored"
        : ".agent_runtime/ exists but is not listed in .gitignore"
      : "not created yet",
  });

  checks.push({
    label: "At least one feature folder exists",
    status: diagnostics.featureFolders.length > 0 ? "PASS" : "WARN",
    detail:
      diagnostics.featureFolders.length > 0
        ? diagnostics.featureFolders.map((feature) => feature.featureId).join(", ")
        : "no docs/features/<issue>-<slug>/ folders found",
  });

  if (diagnostics.featureFolders.length > 0) {
    const missingStatus = diagnostics.featureFolders.filter((feature) => !feature.hasStatusMarkdown);
    checks.push({
      label: "Feature folders have status.md",
      status: missingStatus.length === 0 ? "PASS" : "WARN",
      detail:
        missingStatus.length === 0
          ? "all feature folders have status.md"
          : `missing status.md: ${missingStatus.map((feature) => feature.featureId).join(", ")}`,
    });
  }

  checks.push({
    label: "Dependencies installed (node_modules)",
    status: diagnostics.nodeModulesExists ? "PASS" : "WARN",
    detail: diagnostics.nodeModulesExists ? "node_modules found" : "node_modules not found",
  });

  checks.push({
    label: "Generated next_prompt.md",
    status: diagnostics.nextPromptExists ? "PASS" : "WARN",
    detail: diagnostics.nextPromptExists
      ? ".agent_runtime/next_prompt.md found"
      : ".agent_runtime/next_prompt.md not generated yet",
  });

  return checks;
}

function recommendNextAction(diagnostics: TargetDiagnostics): NextAction {
  const targetPath = diagnostics.target.targetPath;

  if (!diagnostics.target.exists) {
    return {
      summary: "Target path does not exist.",
      command: null,
      reason: `No directory found at ${targetPath}.`,
    };
  }

  if (!diagnostics.target.isGitRepository) {
    return {
      summary: "Initialize the target as a git repository first.",
      command: `git init ${targetPath}`,
      reason: `${targetPath} is not a git repository (no .git found).`,
    };
  }

  if (!isRuntimeKitInstalled(diagnostics) || diagnostics.missingAgentScripts.length > 0) {
    return {
      summary: "Install the runtime kit.",
      command: `npm run agentic-sdd -- install ${targetPath}`,
      reason: `Runtime folders and/or package.json agent scripts are missing: ${[
        ...diagnostics.missingRuntimePaths,
        ...(diagnostics.hasGuardWorkflow ? [] : [".github/workflows/agent-sdd-guard.yml"]),
        ...diagnostics.missingAgentScripts,
      ].join(", ")}.`,
    };
  }

  if (diagnostics.featureFolders.length === 0) {
    return {
      summary: "Initialize the first feature.",
      command: `npm run agentic-sdd -- init-feature ${targetPath} --issue 1 --slug demo-feature --title "Demo feature"`,
      reason: "No docs/features/<issue>-<slug>/ folder was found yet.",
    };
  }

  if (!diagnostics.nodeModulesExists) {
    return {
      summary: "Install target dependencies.",
      command: `cd ${targetPath}\nnpm install`,
      reason: "node_modules was not found in the target repository.",
    };
  }

  if (!diagnostics.nextPromptExists) {
    return {
      summary: "Generate the next agent prompt.",
      command: `cd ${targetPath}\nnpm run agent:next`,
      reason: ".agent_runtime/next_prompt.md has not been generated yet.",
    };
  }

  return {
    summary: "Open the generated prompt and hand it to your Cowork/Codex/Gemini/Claude session.",
    command: `${path.join(targetPath, ".agent_runtime", "next_prompt.md")}`,
    reason: "The runtime kit is installed, a feature exists, and a next prompt has been generated.",
  };
}

function computeOverallStatus(
  diagnostics: TargetDiagnostics,
  checks: DoctorCheck[]
): OverallStatus {
  const hasFailure = checks.some((check) => check.status === "FAIL");
  if (hasFailure) {
    return "NEEDS_SETUP";
  }

  if (diagnostics.featureFolders.length === 0) {
    return "NEEDS_FEATURE";
  }

  if (!diagnostics.nextPromptExists) {
    return "NEEDS_NEXT_PROMPT";
  }

  const hasWarning = checks.some((check) => check.status === "WARN");
  if (hasWarning) {
    return "CHECK_WARNINGS";
  }

  return "READY";
}
