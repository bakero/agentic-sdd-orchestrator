import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const REQUIRED_AGENT_SCRIPTS: Record<string, string> = {
  "agent:validate": "tsx scripts/agent/validate_workflow_state.ts",
  "agent:resolve": "tsx scripts/agent/resolve_next_action.ts",
  "agent:prompt": "tsx scripts/agent/render_agent_prompt.ts",
  "agent:next": "npm run agent:validate && npm run agent:resolve && npm run agent:prompt"
};

export type PackageJsonScriptReport = {
  packageJsonPath: string;
  exists: boolean;
  missingScripts: string[];
  existingScripts: string[];
};

type PackageJsonShape = {
  scripts?: Record<string, string>;
  [key: string]: unknown;
};

export function inspectPackageJsonScripts(targetPath: string): PackageJsonScriptReport {
  const packageJsonPath = path.join(targetPath, "package.json");

  if (!existsSync(packageJsonPath)) {
    return {
      packageJsonPath,
      exists: false,
      missingScripts: Object.keys(REQUIRED_AGENT_SCRIPTS),
      existingScripts: []
    };
  }

  const packageJson = readPackageJson(packageJsonPath);
  const scripts = packageJson.scripts ?? {};
  const requiredScriptNames = Object.keys(REQUIRED_AGENT_SCRIPTS);

  return {
    packageJsonPath,
    exists: true,
    missingScripts: requiredScriptNames.filter((scriptName) => !(scriptName in scripts)),
    existingScripts: requiredScriptNames.filter((scriptName) => scriptName in scripts)
  };
}

export function ensurePackageJsonScripts(targetPath: string, dryRun = false): PackageJsonScriptReport {
  const report = inspectPackageJsonScripts(targetPath);

  if (!report.exists || report.missingScripts.length === 0 || dryRun) {
    return report;
  }

  const packageJson = readPackageJson(report.packageJsonPath);
  packageJson.scripts = packageJson.scripts ?? {};

  for (const scriptName of report.missingScripts) {
    packageJson.scripts[scriptName] = REQUIRED_AGENT_SCRIPTS[scriptName];
  }

  writeFileSync(report.packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

  return inspectPackageJsonScripts(targetPath);
}

function readPackageJson(packageJsonPath: string): PackageJsonShape {
  return JSON.parse(readFileSync(packageJsonPath, "utf8")) as PackageJsonShape;
}
