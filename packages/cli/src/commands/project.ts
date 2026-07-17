import path from "node:path";
import { resolveEffectiveConfig } from "../lib/config.js";
import { diagnoseTargetRepo, isRuntimeKitInstalled } from "../lib/diagnostics.js";
import {
  addProject,
  findProjectByName,
  listProjects,
  loadRegistry,
  normalizeProjectPath,
  removeProject,
  resolveProjectNameOrPath,
} from "../lib/project-registry.js";

export type ProjectCliIo = {
  log: (message: string) => void;
  error: (message: string) => void;
};

export type ProjectAddOptions = {
  orchestratorRoot: string;
  targetPath: string;
  name: string;
  io: ProjectCliIo;
};

export function runProjectAddCommand(options: ProjectAddOptions): void {
  const record = addProject(options.orchestratorRoot, {
    name: options.name,
    targetPath: options.targetPath,
  });

  options.io.log("Agentic SDD project registered");
  options.io.log("");
  options.io.log(`Name: ${record.name}`);
  options.io.log(`Path: ${record.path}`);
  options.io.log("");
  options.io.log("Recommended next command:");
  options.io.log(`  npm run agentic-sdd -- doctor ${record.name}`);
}

export type ProjectListOptions = {
  orchestratorRoot: string;
  io: ProjectCliIo;
};

export function runProjectListCommand(options: ProjectListOptions): void {
  const projects = listProjects(options.orchestratorRoot);

  options.io.log("Agentic SDD registered projects");
  options.io.log("");

  if (projects.length === 0) {
    options.io.log("No projects registered.");
    options.io.log("Register one with:");
    options.io.log("  npm run agentic-sdd -- project add <target-repo> --name <name>");
    return;
  }

  for (const project of projects) {
    options.io.log(`${project.name}  ->  ${project.path}`);
  }
}

export type ProjectRemoveOptions = {
  orchestratorRoot: string;
  name: string;
  io: ProjectCliIo;
};

export function runProjectRemoveCommand(options: ProjectRemoveOptions): void {
  const removed = removeProject(options.orchestratorRoot, options.name);

  if (!removed) {
    options.io.log(`No registered project named "${options.name}" was found. Nothing removed.`);
    return;
  }

  options.io.log(`Removed project "${options.name}" from the registry.`);
  options.io.log("Target repository files were not modified or deleted.");
}

export type ProjectInspectOptions = {
  orchestratorRoot: string;
  nameOrPath: string;
  io: ProjectCliIo;
};

export function runProjectInspectCommand(options: ProjectInspectOptions): void {
  const resolved = resolveProjectNameOrPath(options.orchestratorRoot, options.nameOrPath);
  const diagnostics = diagnoseTargetRepo(resolved.targetPath);

  options.io.log("Agentic SDD project inspection");
  options.io.log("");
  options.io.log(`Project name: ${resolved.name ?? "(not registered - direct path)"}`);
  options.io.log(`Path: ${diagnostics.target.targetPath}`);
  options.io.log(`Git repository: ${diagnostics.target.isGitRepository}`);
  options.io.log(`Runtime kit installed: ${isRuntimeKitInstalled(diagnostics)}`);
  options.io.log(`package.json present: ${diagnostics.packageJsonExists}`);
  options.io.log(`Agent npm scripts present: ${diagnostics.missingAgentScripts.length === 0}`);
  options.io.log(`.agent_runtime/ present: ${diagnostics.agentRuntimeDirExists}`);
  options.io.log(`docs/features present: ${diagnostics.docsFeaturesExists}`);

  if (diagnostics.featureFolders.length === 0) {
    options.io.log("Active feature folders: none detected");
  } else {
    options.io.log(
      `Active feature folders: ${diagnostics.featureFolders.map((feature) => feature.featureId).join(", ")}`
    );
  }
}

export type ProjectConfigOptions = {
  orchestratorRoot: string;
  nameOrPath: string;
  io: ProjectCliIo;
};

/**
 * Shows which agents/profiles/environments the orchestrator's effective
 * config would apply to a resolved project. v0.4 has no per-project
 * override mechanism yet, so this reads the same orchestrator-level
 * config as `config show`, scoped to the resolved project's identity for
 * readability. It never writes to the project or the orchestrator config.
 */
export function runProjectConfigCommand(options: ProjectConfigOptions): void {
  const resolved = resolveProjectNameOrPath(options.orchestratorRoot, options.nameOrPath);
  const { config, source } = resolveEffectiveConfig(options.orchestratorRoot);

  options.io.log("Agentic SDD project configuration");
  options.io.log("");
  options.io.log(`Project name: ${resolved.name ?? "(not registered - direct path)"}`);
  options.io.log(`Path: ${resolved.targetPath}`);
  options.io.log(`Config source: ${source === "local" ? "local override (.agentic-sdd/config.json)" : "built-in defaults"}`);
  options.io.log("");

  options.io.log("Agents and their default profile:");
  for (const agent of config.agents) {
    options.io.log(`  - ${agent.name} (${agent.role}) -> profile: ${agent.defaultProfile}, mode: ${agent.executionMode}`);
  }

  options.io.log("");
  options.io.log("Available environments:");
  for (const environment of config.environments) {
    options.io.log(`  - ${environment.name} (${environment.shell}, ${environment.executionSurface})`);
  }

  options.io.log("");
  options.io.log(
    "This project does not have a project-specific override yet; it uses the orchestrator's effective config as shown above."
  );
}

/**
 * Re-exported so callers (and tests) can look up registered projects
 * without importing the registry module directly.
 */
export function projectExists(orchestratorRoot: string, name: string): boolean {
  return Boolean(findProjectByName(loadRegistry(orchestratorRoot), name));
}

export function resolveOrchestratorRoot(explicitRoot?: string): string {
  return explicitRoot ? normalizeProjectPath(explicitRoot) : path.resolve(".");
}
