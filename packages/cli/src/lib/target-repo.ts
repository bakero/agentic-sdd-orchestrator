import { existsSync, statSync } from "node:fs";
import path from "node:path";

export type TargetRepoInspection = {
  targetPath: string;
  exists: boolean;
  isDirectory: boolean;
  isGitRepository: boolean;
};

export function resolveTargetPath(inputPath: string): string {
  return path.resolve(inputPath);
}

export function inspectTargetRepo(inputPath: string): TargetRepoInspection {
  const targetPath = resolveTargetPath(inputPath);
  const exists = existsSync(targetPath);
  const isDirectory = exists ? statSync(targetPath).isDirectory() : false;
  const isGitRepository = existsSync(path.join(targetPath, ".git"));

  return {
    targetPath,
    exists,
    isDirectory,
    isGitRepository
  };
}

export function assertUsableTargetRepo(inputPath: string): TargetRepoInspection {
  const inspection = inspectTargetRepo(inputPath);

  if (!inspection.exists) {
    throw new Error(`Target repository does not exist: ${inspection.targetPath}`);
  }

  if (!inspection.isDirectory) {
    throw new Error(`Target path is not a directory: ${inspection.targetPath}`);
  }

  return inspection;
}
