import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import defaultConfigJson from "../config/defaults/default-config.json" with { type: "json" };
import type {
  AgentDefinition,
  AgenticSddConfig,
  EnvironmentDefinition,
  ProfileDefinition,
  SkillDefinition,
} from "../config/types.js";

const CONFIG_DIR_NAME = ".agentic-sdd";
const CONFIG_FILE_NAME = "config.json";

export function defaultConfig(): AgenticSddConfig {
  // Deep-clone so callers can freely inspect/mutate without touching the
  // imported JSON module's shared object.
  return JSON.parse(JSON.stringify(defaultConfigJson)) as AgenticSddConfig;
}

export function configDir(orchestratorRoot: string): string {
  return path.join(orchestratorRoot, CONFIG_DIR_NAME);
}

export function configPath(orchestratorRoot: string): string {
  return path.join(configDir(orchestratorRoot), CONFIG_FILE_NAME);
}

export function localConfigExists(orchestratorRoot: string): boolean {
  return existsSync(configPath(orchestratorRoot));
}

/**
 * Reads the local override file if present; returns null when missing or
 * unreadable so callers can fall back to defaults instead of crashing.
 */
export function readLocalConfig(orchestratorRoot: string): AgenticSddConfig | null {
  const filePath = configPath(orchestratorRoot);
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as AgenticSddConfig;
  } catch {
    return null;
  }
}

export type ConfigInitResult = {
  created: boolean;
  path: string;
  reason?: string;
};

/**
 * Writes .agentic-sdd/config.json from the built-in defaults. Refuses to
 * overwrite an existing file unless force is set.
 */
export function initLocalConfig(orchestratorRoot: string, force = false): ConfigInitResult {
  const filePath = configPath(orchestratorRoot);

  if (existsSync(filePath) && !force) {
    return {
      created: false,
      path: filePath,
      reason: "Local config already exists. Use --force to overwrite.",
    };
  }

  const dir = configDir(orchestratorRoot);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(filePath, `${JSON.stringify(defaultConfig(), null, 2)}\n`);

  return { created: true, path: filePath };
}

/**
 * The effective config is the local override file when present, otherwise
 * the built-in defaults. v0.4 does not merge field-by-field: a local
 * config.json is expected to be a full config (typically produced by
 * `config init` and then edited), not a partial patch.
 */
export function resolveEffectiveConfig(orchestratorRoot: string): {
  config: AgenticSddConfig;
  source: "local" | "default";
} {
  const local = readLocalConfig(orchestratorRoot);
  if (local) {
    return { config: local, source: "local" };
  }
  return { config: defaultConfig(), source: "default" };
}

export function findAgent(config: AgenticSddConfig, name: string): AgentDefinition | undefined {
  return config.agents.find((agent) => agent.name === name);
}

export function findProfile(config: AgenticSddConfig, name: string): ProfileDefinition | undefined {
  return config.profiles.find((profile) => profile.name === name);
}

export function findSkill(config: AgenticSddConfig, name: string): SkillDefinition | undefined {
  return config.skills.find((skill) => skill.name === name);
}

export function findEnvironment(
  config: AgenticSddConfig,
  name: string
): EnvironmentDefinition | undefined {
  return config.environments.find((environment) => environment.name === name);
}

export function skillsForAgent(config: AgenticSddConfig, agentName: string): SkillDefinition[] {
  const agent = findAgent(config, agentName);
  if (!agent) {
    return [];
  }
  return agent.skills
    .map((skillName) => findSkill(config, skillName))
    .filter((skill): skill is SkillDefinition => skill !== undefined);
}
