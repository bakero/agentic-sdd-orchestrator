import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Handoff } from "./handoff-types.js";

const HANDOFFS_DIR_NAME = "handoffs";

export function handoffsRootDir(orchestratorRoot: string): string {
  return path.join(orchestratorRoot, ".agentic-sdd", HANDOFFS_DIR_NAME);
}

export function handoffProjectDir(orchestratorRoot: string, projectSlug: string): string {
  return path.join(handoffsRootDir(orchestratorRoot), projectSlug);
}

export function handoffFeatureDir(
  orchestratorRoot: string,
  projectSlug: string,
  featureId: string
): string {
  return path.join(handoffProjectDir(orchestratorRoot, projectSlug), featureId);
}

/**
 * Timestamp-named folders sort lexicographically in creation order, so the
 * "latest" handoff is always the last directory entry once sorted - no
 * separate index file needed.
 */
export function timestampDirName(createdAt: string): string {
  return createdAt.replace(/[:.]/g, "-");
}

export type WriteHandoffResult = {
  dir: string;
  handoffJsonPath: string;
  promptMarkdownPath: string;
  contextFilesPath: string;
};

/**
 * Writes a generated handoff under
 * .agentic-sdd/handoffs/<project-slug>/<feature-id>/<timestamp>/ inside the
 * orchestrator repo. Never writes into the target repository.
 */
export function writeHandoff(
  orchestratorRoot: string,
  projectSlug: string,
  handoff: Handoff
): WriteHandoffResult {
  const dir = path.join(
    handoffFeatureDir(orchestratorRoot, projectSlug, handoff.feature.id),
    timestampDirName(handoff.createdAt)
  );
  mkdirSync(dir, { recursive: true });

  const handoffJsonPath = path.join(dir, "handoff.json");
  const promptMarkdownPath = path.join(dir, "prompt.md");
  const contextFilesPath = path.join(dir, "context_files.txt");

  writeFileSync(handoffJsonPath, `${JSON.stringify(handoff, null, 2)}\n`);
  writeFileSync(promptMarkdownPath, `${handoff.prompt}\n`);
  writeFileSync(contextFilesPath, `${handoff.context.inputFiles.join("\n")}\n`);

  return { dir, handoffJsonPath, promptMarkdownPath, contextFilesPath };
}

export type StoredHandoffSummary = {
  dir: string;
  featureId: string;
  createdAt: string;
};

/**
 * Lists every previously written handoff for a project across all its
 * feature subfolders, newest first (by directory name, which sorts
 * lexicographically the same as creation order - see timestampDirName).
 */
export function listHandoffs(orchestratorRoot: string, projectSlug: string): StoredHandoffSummary[] {
  const projectDir = handoffProjectDir(orchestratorRoot, projectSlug);
  if (!existsSync(projectDir)) {
    return [];
  }

  const summaries: StoredHandoffSummary[] = [];

  for (const featureId of readdirSync(projectDir)) {
    const featureDir = path.join(projectDir, featureId);
    if (!statSync(featureDir).isDirectory()) continue;

    for (const timestampDir of readdirSync(featureDir)) {
      const fullDir = path.join(featureDir, timestampDir);
      if (!statSync(fullDir).isDirectory()) continue;
      if (!existsSync(path.join(fullDir, "handoff.json"))) continue;

      summaries.push({ dir: fullDir, featureId, createdAt: timestampDir });
    }
  }

  return summaries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function latestHandoff(
  orchestratorRoot: string,
  projectSlug: string,
  featureId?: string
): StoredHandoffSummary | undefined {
  const all = listHandoffs(orchestratorRoot, projectSlug);
  const filtered = featureId ? all.filter((entry) => entry.featureId === featureId) : all;
  return filtered[0];
}

export function readHandoffJson(dir: string): Handoff {
  return JSON.parse(readFileSync(path.join(dir, "handoff.json"), "utf8")) as Handoff;
}

export function readHandoffPrompt(dir: string): string {
  return readFileSync(path.join(dir, "prompt.md"), "utf8");
}

/**
 * Registry project names may contain characters that are awkward in
 * filesystem paths on some platforms; this keeps the folder name simple
 * and stable without needing a lookup table.
 */
export function projectSlugFor(projectName: string | null, targetPath: string): string {
  const base = projectName ?? path.basename(targetPath);
  return base.replace(/[^a-zA-Z0-9._-]/g, "_") || "project";
}
