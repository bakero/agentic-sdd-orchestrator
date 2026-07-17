import { generateHandoff, type GenerateHandoffError, type GenerateHandoffSuccess } from "../lib/handoff.js";
import {
  latestHandoff,
  listHandoffs,
  projectSlugFor,
  readHandoffJson,
  readHandoffPrompt,
  writeHandoff,
} from "../lib/handoff-storage.js";
import { resolveProjectNameOrPath } from "../lib/project-registry.js";

export type HandoffCliIo = {
  log: (message: string) => void;
  error: (message: string) => void;
};

export type HandoffGenerateOptions = {
  orchestratorRoot: string;
  nameOrPath: string;
  agent?: string;
  feature?: string;
  environment?: string;
  io: HandoffCliIo;
};

function printMetadataHeader(
  io: HandoffCliIo,
  resolvedName: string | null,
  result: GenerateHandoffError | GenerateHandoffSuccess
): void {
  if (!result.ok) return;
  const h = result.handoff;
  io.log("Agentic SDD Cowork handoff");
  io.log("");
  io.log(`Project: ${resolvedName ?? "(not registered - direct path)"}`);
  io.log(`Feature: ${h.feature.id}`);
  io.log(`Current state: ${h.feature.currentState}`);
  io.log(`Target state: ${h.feature.targetState ?? "(unknown)"}`);
  io.log(`Agent: ${h.agent.name} (${h.agent.role})`);
  io.log(`Environment: ${h.environment.name}`);
  io.log(`Estimated context files: ${h.context.inputFiles.length}`);
  io.log("");
}

export function runHandoffGenerateCommand(options: HandoffGenerateOptions): ReturnType<typeof generateHandoff> {
  const resolved = resolveProjectNameOrPath(options.orchestratorRoot, options.nameOrPath);

  const result = generateHandoff({
    orchestratorRoot: options.orchestratorRoot,
    targetPath: resolved.targetPath,
    projectName: resolved.name,
    requestedAgent: options.agent,
    requestedFeatureId: options.feature,
    requestedEnvironment: options.environment,
  });

  if (!result.ok) {
    options.io.error(result.message);
    return result;
  }

  printMetadataHeader(options.io, resolved.name, result);
  options.io.log(result.handoff.prompt);

  return result;
}

export type HandoffWriteOptions = HandoffGenerateOptions;

export function runHandoffWriteCommand(options: HandoffWriteOptions): void {
  const resolved = resolveProjectNameOrPath(options.orchestratorRoot, options.nameOrPath);

  const result = generateHandoff({
    orchestratorRoot: options.orchestratorRoot,
    targetPath: resolved.targetPath,
    projectName: resolved.name,
    requestedAgent: options.agent,
    requestedFeatureId: options.feature,
    requestedEnvironment: options.environment,
  });

  if (!result.ok) {
    options.io.error(result.message);
    return;
  }

  const projectSlug = projectSlugFor(resolved.name, resolved.targetPath);
  const written = writeHandoff(options.orchestratorRoot, projectSlug, result.handoff);

  options.io.log("Wrote Cowork handoff");
  options.io.log("");
  options.io.log(`Directory: ${written.dir}`);
  options.io.log(`  handoff.json`);
  options.io.log(`  prompt.md`);
  options.io.log(`  context_files.txt`);
  options.io.log("");
  options.io.log("Recommended next command:");
  options.io.log(`  npm run agentic-sdd -- handoff show ${options.nameOrPath}`);
}

export type HandoffShowOptions = {
  orchestratorRoot: string;
  nameOrPath: string;
  feature?: string;
  io: HandoffCliIo;
};

export function runHandoffShowCommand(options: HandoffShowOptions): void {
  const resolved = resolveProjectNameOrPath(options.orchestratorRoot, options.nameOrPath);
  const projectSlug = projectSlugFor(resolved.name, resolved.targetPath);
  const latest = latestHandoff(options.orchestratorRoot, projectSlug, options.feature);

  if (!latest) {
    options.io.log(`No handoff has been written yet for "${options.nameOrPath}".`);
    options.io.log("Recommended next command:");
    options.io.log(`  npm run agentic-sdd -- handoff write ${options.nameOrPath}`);
    return;
  }

  const handoff = readHandoffJson(latest.dir);
  const prompt = readHandoffPrompt(latest.dir);

  options.io.log("Agentic SDD Cowork handoff (latest)");
  options.io.log("");
  options.io.log(`Project: ${resolved.name ?? "(not registered - direct path)"}`);
  options.io.log(`Feature: ${handoff.feature.id}`);
  options.io.log(`Created at: ${handoff.createdAt}`);
  options.io.log(`Directory: ${latest.dir}`);
  options.io.log(`Current state: ${handoff.feature.currentState}`);
  options.io.log(`Agent: ${handoff.agent.name}`);
  options.io.log("");
  options.io.log(prompt);
}

export type HandoffListOptions = {
  orchestratorRoot: string;
  nameOrPath: string;
  io: HandoffCliIo;
};

export function runHandoffListCommand(options: HandoffListOptions): void {
  const resolved = resolveProjectNameOrPath(options.orchestratorRoot, options.nameOrPath);
  const projectSlug = projectSlugFor(resolved.name, resolved.targetPath);
  const entries = listHandoffs(options.orchestratorRoot, projectSlug);

  options.io.log(`Agentic SDD Cowork handoffs for ${resolved.name ?? options.nameOrPath}`);
  options.io.log("");

  if (entries.length === 0) {
    options.io.log("No handoffs have been written yet.");
    options.io.log("Recommended next command:");
    options.io.log(`  npm run agentic-sdd -- handoff write ${options.nameOrPath}`);
    return;
  }

  for (const entry of entries) {
    options.io.log(`${entry.featureId}  ${entry.createdAt}  ${entry.dir}`);
  }
}
