import type { AgenticSddConfig, ExecutionMode } from "../config/types.js";

export type ValidationIssue = {
  level: "error" | "warning";
  message: string;
};

export type ValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

const VALID_EXECUTION_MODES: ExecutionMode[] = ["manual", "automatic"];
const VALID_CONTEXT_POLICIES = ["minimal", "targeted", "full"];
const VALID_REASONING_LEVELS = ["low", "medium", "high"];

/**
 * Structural validation only: no network access, no filesystem access
 * beyond what the caller already loaded. Aggregates every problem instead
 * of stopping at the first one, matching the runtime kit validator's
 * "fail fast, report everything" convention.
 */
export function validateConfig(config: AgenticSddConfig): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (config.version !== 1) {
    issues.push({ level: "error", message: `Unsupported config version: ${String(config.version)}. Expected 1.` });
  }

  if (!Array.isArray(config.agents)) {
    issues.push({ level: "error", message: '"agents" must be an array.' });
  }
  if (!Array.isArray(config.profiles)) {
    issues.push({ level: "error", message: '"profiles" must be an array.' });
  }
  if (!Array.isArray(config.skills)) {
    issues.push({ level: "error", message: '"skills" must be an array.' });
  }
  if (!Array.isArray(config.environments)) {
    issues.push({ level: "error", message: '"environments" must be an array.' });
  }

  if (issues.some((issue) => issue.level === "error")) {
    return toResult(issues);
  }

  checkDuplicateNames(config.agents.map((agent) => agent.name), "agent", issues);
  checkDuplicateNames(config.profiles.map((profile) => profile.name), "profile", issues);
  checkDuplicateNames(config.skills.map((skill) => skill.name), "skill", issues);
  checkDuplicateNames(config.environments.map((environment) => environment.name), "environment", issues);

  const profileNames = new Set(config.profiles.map((profile) => profile.name));
  const skillNames = new Set(config.skills.map((skill) => skill.name));
  const agentNames = new Set(config.agents.map((agent) => agent.name));

  for (const agent of config.agents) {
    if (!agent.name) {
      issues.push({ level: "error", message: "Found an agent with no name." });
      continue;
    }

    if (!agent.defaultProfile) {
      issues.push({ level: "error", message: `Agent "${agent.name}" is missing "defaultProfile".` });
    } else if (!profileNames.has(agent.defaultProfile)) {
      issues.push({
        level: "error",
        message: `Agent "${agent.name}" references unknown default profile "${agent.defaultProfile}".`,
      });
    }

    if (!VALID_EXECUTION_MODES.includes(agent.executionMode)) {
      issues.push({
        level: "error",
        message: `Agent "${agent.name}" has invalid executionMode "${String(agent.executionMode)}". Expected "manual" or "automatic".`,
      });
    }

    if (!Array.isArray(agent.skills) || agent.skills.length === 0) {
      issues.push({ level: "warning", message: `Agent "${agent.name}" has no skills listed.` });
    } else {
      for (const skillName of agent.skills) {
        if (!skillNames.has(skillName)) {
          issues.push({
            level: "error",
            message: `Agent "${agent.name}" references unknown skill "${skillName}".`,
          });
        }
      }
    }

    if (!agent.provider) {
      issues.push({ level: "warning", message: `Agent "${agent.name}" has no provider set.` });
    }
  }

  for (const profile of config.profiles) {
    if (!profile.name) {
      issues.push({ level: "error", message: "Found a profile with no name." });
      continue;
    }

    if (!profile.promptTemplate) {
      issues.push({ level: "error", message: `Profile "${profile.name}" is missing "promptTemplate".` });
    } else if (!looksLikePromptTemplateReference(profile.promptTemplate)) {
      issues.push({
        level: "warning",
        message: `Profile "${profile.name}" has a promptTemplate reference that does not look like a ".md" filename: "${profile.promptTemplate}".`,
      });
    }

    if (!VALID_CONTEXT_POLICIES.includes(profile.contextPolicy)) {
      issues.push({
        level: "error",
        message: `Profile "${profile.name}" has invalid contextPolicy "${String(profile.contextPolicy)}". Expected one of: ${VALID_CONTEXT_POLICIES.join(", ")}.`,
      });
    }

    if (!VALID_REASONING_LEVELS.includes(profile.recommendedReasoning)) {
      issues.push({
        level: "error",
        message: `Profile "${profile.name}" has invalid recommendedReasoning "${String(profile.recommendedReasoning)}". Expected one of: ${VALID_REASONING_LEVELS.join(", ")}.`,
      });
    }
  }

  for (const skill of config.skills) {
    if (!skill.name) {
      issues.push({ level: "error", message: "Found a skill with no name." });
      continue;
    }

    if (!Array.isArray(skill.appliesTo) || skill.appliesTo.length === 0) {
      issues.push({ level: "warning", message: `Skill "${skill.name}" does not list any agents in "appliesTo".` });
    } else {
      for (const agentName of skill.appliesTo) {
        if (!agentNames.has(agentName)) {
          issues.push({
            level: "warning",
            message: `Skill "${skill.name}" lists "${agentName}" in "appliesTo", but no agent with that name exists.`,
          });
        }
      }
    }
  }

  for (const environment of config.environments) {
    if (!environment.name) {
      issues.push({ level: "error", message: "Found an environment with no name." });
      continue;
    }

    if (!environment.shell) {
      issues.push({ level: "error", message: `Environment "${environment.name}" is missing "shell".` });
    }
    if (!environment.os) {
      issues.push({ level: "error", message: `Environment "${environment.name}" is missing "os".` });
    }
    if (!environment.executionSurface) {
      issues.push({ level: "error", message: `Environment "${environment.name}" is missing "executionSurface".` });
    }
    if (!environment.tools) {
      issues.push({ level: "error", message: `Environment "${environment.name}" is missing "tools".` });
    }
  }

  return toResult(issues);
}

function checkDuplicateNames(names: string[], kind: string, issues: ValidationIssue[]): void {
  const seen = new Set<string>();
  for (const name of names) {
    if (!name) continue;
    if (seen.has(name)) {
      issues.push({ level: "error", message: `Duplicate ${kind} name: "${name}".` });
    }
    seen.add(name);
  }
}

function looksLikePromptTemplateReference(value: string): boolean {
  return value.trim().toLowerCase().endsWith(".md");
}

function toResult(issues: ValidationIssue[]): ValidationResult {
  const errors = issues.filter((issue) => issue.level === "error").map((issue) => issue.message);
  const warnings = issues.filter((issue) => issue.level === "warning").map((issue) => issue.message);
  return { ok: errors.length === 0, errors, warnings };
}
