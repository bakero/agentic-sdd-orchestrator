import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const REQUIRED_AGENT_SCRIPTS: Record<string, string> = {
  "agent:validate": "tsx scripts/agent/validate_workflow_state.ts",
  "agent:resolve": "tsx scripts/agent/resolve_next_action.ts",
  "agent:prompt": "tsx scripts/agent/render_agent_prompt.ts",
  "agent:next": "npm run agent:validate && npm run agent:resolve && npm run agent:prompt"
};

export const REQUIRED_AGENT_DEV_DEPENDENCIES: Record<string, string> = {
  tsx: "^4.20.0"
};

export type PackageJsonScriptReport = {
  packageJsonPath: string;
  exists: boolean;
  missingScripts: string[];
  existingScripts: string[];
  missingDevDependencies: string[];
  existingDevDependencies: string[];
};

type PackageJsonShape = {
  scripts?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
};

export function inspectPackageJsonScripts(targetPath: string): PackageJsonScriptReport {
  const packageJsonPath = path.join(targetPath, "package.json");

  if (!existsSync(packageJsonPath)) {
    return {
      packageJsonPath,
      exists: false,
      missingScripts: Object.keys(REQUIRED_AGENT_SCRIPTS),
      existingScripts: [],
      missingDevDependencies: Object.keys(REQUIRED_AGENT_DEV_DEPENDENCIES),
      existingDevDependencies: []
    };
  }

  const packageJson = readPackageJson(packageJsonPath);
  const scripts = packageJson.scripts ?? {};
  const requiredScriptNames = Object.keys(REQUIRED_AGENT_SCRIPTS);

  return {
    packageJsonPath,
    exists: true,
    missingScripts: requiredScriptNames.filter((scriptName) => !(scriptName in scripts)),
    existingScripts: requiredScriptNames.filter((scriptName) => scriptName in scripts),
    missingDevDependencies: Object.keys(REQUIRED_AGENT_DEV_DEPENDENCIES).filter(
      (dependencyName) => !(dependencyName in (packageJson.devDependencies ?? {}))
    ),
    existingDevDependencies: Object.keys(REQUIRED_AGENT_DEV_DEPENDENCIES).filter(
      (dependencyName) => dependencyName in (packageJson.devDependencies ?? {})
    )
  };
}

export function ensurePackageJsonScripts(targetPath: string, dryRun = false): PackageJsonScriptReport {
  const report = inspectPackageJsonScripts(targetPath);

  if (!report.exists || report.missingScripts.length === 0 || dryRun) {
    return report;
  }

  const packageJson = readPackageJson(report.packageJsonPath);
  packageJson.scripts = packageJson.scripts ?? {};
  packageJson.devDependencies = packageJson.devDependencies ?? {};

  for (const scriptName of report.missingScripts) {
    packageJson.scripts[scriptName] = REQUIRED_AGENT_SCRIPTS[scriptName];
  }

  for (const dependencyName of report.missingDevDependencies) {
    packageJson.devDependencies[dependencyName] = REQUIRED_AGENT_DEV_DEPENDENCIES[dependencyName];
  }

  writeFileSync(report.packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

  return inspectPackageJsonScripts(targetPath);
}

function readPackageJson(packageJsonPath: string): PackageJsonShape {
  return JSON.parse(readFileSync(packageJsonPath, "utf8")) as PackageJsonShape;
}
