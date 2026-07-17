import { findEnvironment, resolveEffectiveConfig } from "../lib/config.js";

export type EnvCliIo = {
  log: (message: string) => void;
  error: (message: string) => void;
};

export type EnvListOptions = {
  orchestratorRoot: string;
  io: EnvCliIo;
};

export function runEnvListCommand(options: EnvListOptions): void {
  const { config } = resolveEffectiveConfig(options.orchestratorRoot);

  options.io.log("Agentic SDD environments");
  options.io.log("");

  if (config.environments.length === 0) {
    options.io.log("No environments configured.");
    return;
  }

  for (const environment of config.environments) {
    const mainTools = Object.entries(environment.tools)
      .filter(([, available]) => available)
      .map(([tool]) => tool);
    options.io.log(
      `${environment.name}  -  shell: ${environment.shell}  -  surface: ${environment.executionSurface}  -  tools: ${mainTools.join(", ") || "none"}`
    );
  }
}

export type EnvShowOptions = {
  orchestratorRoot: string;
  name: string;
  io: EnvCliIo;
};

export function runEnvShowCommand(options: EnvShowOptions): void {
  const { config } = resolveEffectiveConfig(options.orchestratorRoot);
  const environment = findEnvironment(config, options.name);

  if (!environment) {
    options.io.error(`No environment named "${options.name}" was found.`);
    return;
  }

  options.io.log(`Environment: ${environment.name}`);
  options.io.log(`OS: ${environment.os}`);
  options.io.log(`Shell: ${environment.shell}`);
  options.io.log(`Command style: ${environment.commandStyle}`);
  options.io.log(`Execution surface: ${environment.executionSurface}`);

  options.io.log("");
  options.io.log("Tools:");
  for (const [tool, available] of Object.entries(environment.tools)) {
    options.io.log(`  ${tool}: ${available}`);
  }

  options.io.log("");
  options.io.log("Execution rules:");
  for (const rule of environment.executionRules) {
    options.io.log(`  - ${rule}`);
  }

  options.io.log("");
  options.io.log("Forbidden actions:");
  for (const forbidden of environment.forbiddenActions) {
    options.io.log(`  - ${forbidden}`);
  }

  options.io.log("");
  options.io.log(`Expected output format: ${environment.expectedOutputFormat}`);
}
