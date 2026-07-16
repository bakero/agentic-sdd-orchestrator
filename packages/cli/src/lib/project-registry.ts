import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export type ProjectRecord = {
  name: string;
  path: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectRegistry = {
  version: 1;
  projects: ProjectRecord[];
};

const REGISTRY_DIR_NAME = ".agentic-sdd";
const REGISTRY_FILE_NAME = "projects.json";

export function registryDir(orchestratorRoot: string): string {
  return path.join(orchestratorRoot, REGISTRY_DIR_NAME);
}

export function registryPath(orchestratorRoot: string): string {
  return path.join(registryDir(orchestratorRoot), REGISTRY_FILE_NAME);
}

export function loadRegistry(orchestratorRoot: string): ProjectRegistry {
  const filePath = registryPath(orchestratorRoot);

  if (!existsSync(filePath)) {
    return { version: 1, projects: [] };
  }

  try {
    const raw = readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<ProjectRegistry>;

    return {
      version: 1,
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
    };
  } catch {
    return { version: 1, projects: [] };
  }
}

export function saveRegistry(orchestratorRoot: string, registry: ProjectRegistry): void {
  const dir = registryDir(orchestratorRoot);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(registryPath(orchestratorRoot), `${JSON.stringify(registry, null, 2)}\n`);
}

export function findProjectByName(
  registry: ProjectRegistry,
  name: string
): ProjectRecord | undefined {
  return registry.projects.find((project) => project.name === name);
}

export function normalizeProjectPath(inputPath: string): string {
  return path.resolve(inputPath);
}

export function addProject(
  orchestratorRoot: string,
  input: { name: string; targetPath: string }
): ProjectRecord {
  const name = input.name.trim();
  if (!name) {
    throw new Error('Project "--name" must not be empty.');
  }

  const normalizedPath = normalizeProjectPath(input.targetPath);

  if (!existsSync(normalizedPath)) {
    throw new Error(`Target repository does not exist: ${normalizedPath}`);
  }

  if (!existsSync(path.join(normalizedPath, ".git"))) {
    throw new Error(`Target path is not a git repository: ${normalizedPath}`);
  }

  const registry = loadRegistry(orchestratorRoot);

  if (findProjectByName(registry, name)) {
    throw new Error(`A project named "${name}" is already registered.`);
  }

  const now = new Date().toISOString();
  const record: ProjectRecord = {
    name,
    path: normalizedPath,
    createdAt: now,
    updatedAt: now,
  };

  registry.projects.push(record);
  saveRegistry(orchestratorRoot, registry);

  return record;
}

export function listProjects(orchestratorRoot: string): ProjectRecord[] {
  return loadRegistry(orchestratorRoot).projects;
}

export function removeProject(orchestratorRoot: string, name: string): boolean {
  const registry = loadRegistry(orchestratorRoot);
  const initialLength = registry.projects.length;
  registry.projects = registry.projects.filter((project) => project.name !== name);

  if (registry.projects.length === initialLength) {
    return false;
  }

  saveRegistry(orchestratorRoot, registry);
  return true;
}

/**
 * Resolves a "project name or path" argument the way the CLI's
 * doctor/next/project-inspect commands accept it: a registered project
 * name takes priority, otherwise the raw value is treated as a filesystem
 * path (the "direct path fallback" flow).
 */
export function resolveProjectNameOrPath(
  orchestratorRoot: string,
  nameOrPath: string
): { targetPath: string; name: string | null } {
  const registry = loadRegistry(orchestratorRoot);
  const project = findProjectByName(registry, nameOrPath);

  if (project) {
    return { targetPath: project.path, name: project.name };
  }

  return { targetPath: normalizeProjectPath(nameOrPath), name: null };
}
