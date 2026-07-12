import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

export type CopyRuntimeKitOptions = {
  templateRoot: string;
  targetRoot: string;
  dryRun?: boolean;
};

export type CopyRuntimeKitReport = {
  copiedFiles: string[];
  skippedExistingFiles: string[];
  createdDirectories: string[];
};

export function copyRuntimeKit(options: CopyRuntimeKitOptions): CopyRuntimeKitReport {
  const templateRoot = path.resolve(options.templateRoot);
  const targetRoot = path.resolve(options.targetRoot);
  const dryRun = options.dryRun ?? false;

  if (!existsSync(templateRoot)) {
    throw new Error(`Runtime kit template root does not exist: ${templateRoot}`);
  }

  const report: CopyRuntimeKitReport = {
    copiedFiles: [],
    skippedExistingFiles: [],
    createdDirectories: []
  };

  copyDirectory(templateRoot, targetRoot, templateRoot, dryRun, report);

  return report;
}

function copyDirectory(
  sourceDirectory: string,
  targetDirectory: string,
  templateRoot: string,
  dryRun: boolean,
  report: CopyRuntimeKitReport
): void {
  if (!existsSync(targetDirectory)) {
    report.createdDirectories.push(relativeToRoot(targetDirectory, path.dirname(targetDirectory)));

    if (!dryRun) {
      mkdirSync(targetDirectory, { recursive: true });
    }
  }

  for (const entry of readdirSync(sourceDirectory)) {
    const sourcePath = path.join(sourceDirectory, entry);
    const targetPath = path.join(targetDirectory, entry);
    const sourceStat = statSync(sourcePath);

    if (sourceStat.isDirectory()) {
      copyDirectory(sourcePath, targetPath, templateRoot, dryRun, report);
      continue;
    }

    const relativePath = normalizePath(path.relative(templateRoot, sourcePath));

    if (existsSync(targetPath)) {
      report.skippedExistingFiles.push(relativePath);
      continue;
    }

    report.copiedFiles.push(relativePath);

    if (!dryRun) {
      mkdirSync(path.dirname(targetPath), { recursive: true });
      cpSync(sourcePath, targetPath);
    }
  }
}

function relativeToRoot(targetPath: string, rootPath: string): string {
  return normalizePath(path.relative(rootPath, targetPath));
}

function normalizePath(inputPath: string): string {
  return inputPath.replaceAll("\\", "/");
}
