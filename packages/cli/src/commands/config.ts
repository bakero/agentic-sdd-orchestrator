import { configPath, initLocalConfig, resolveEffectiveConfig } from "../lib/config.js";
import { validateConfig } from "../lib/config-validate.js";

export type ConfigCliIo = {
  log: (message: string) => void;
  error: (message: string) => void;
};

export type ConfigInitOptions = {
  orchestratorRoot: string;
  force: boolean;
  io: ConfigCliIo;
};

export function runConfigInitCommand(options: ConfigInitOptions): void {
  const result = initLocalConfig(options.orchestratorRoot, options.force);

  if (!result.created) {
    options.io.log(`Local config already exists at ${result.path}.`);
    options.io.log("Use --force to overwrite it.");
    return;
  }

  options.io.log(`Created local config at ${result.path}.`);
  options.io.log("Recommended next command:");
  options.io.log("  npm run agentic-sdd -- config validate");
}

export type ConfigShowOptions = {
  orchestratorRoot: string;
  io: ConfigCliIo;
};

export function runConfigShowCommand(options: ConfigShowOptions): void {
  const { config, source } = resolveEffectiveConfig(options.orchestratorRoot);

  options.io.log("Agentic SDD effective configuration");
  options.io.log("");
  options.io.log(`Source: ${source === "local" ? `local override (${configPath(options.orchestratorRoot)})` : "built-in defaults"}`);
  options.io.log(`Agents: ${config.agents.length}`);
  options.io.log(`Profiles: ${config.profiles.length}`);
  options.io.log(`Skills: ${config.skills.length}`);
  options.io.log(`Environments: ${config.environments.length}`);
  options.io.log("");
  options.io.log(JSON.stringify(config, null, 2));
}

export type ConfigValidateOptions = {
  orchestratorRoot: string;
  io: ConfigCliIo;
};

export function runConfigValidateCommand(options: ConfigValidateOptions): number {
  const { config, source } = resolveEffectiveConfig(options.orchestratorRoot);
  const result = validateConfig(config);

  options.io.log("Agentic SDD config validation");
  options.io.log("");
  options.io.log(`Source: ${source === "local" ? `local override (${configPath(options.orchestratorRoot)})` : "built-in defaults"}`);

  if (result.errors.length === 0) {
    options.io.log("No errors found.");
  } else {
    options.io.log(`${result.errors.length} error(s):`);
    for (const error of result.errors) {
      options.io.log(`  [ERROR] ${error}`);
    }
  }

  if (result.warnings.length > 0) {
    options.io.log("");
    options.io.log(`${result.warnings.length} warning(s):`);
    for (const warning of result.warnings) {
      options.io.log(`  [WARN] ${warning}`);
    }
  }

  options.io.log("");
  options.io.log(result.ok ? "Result: VALID" : "Result: INVALID");

  return result.ok ? 0 : 1;
}
