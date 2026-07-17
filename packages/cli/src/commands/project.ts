import path from "node:path";
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
