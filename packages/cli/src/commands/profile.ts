import { findProfile, resolveEffectiveConfig } from "../lib/config.js";

export type ProfileCliIo = {
  log: (message: string) => void;
  error: (message: string) => void;
};

export type ProfileListOptions = {
  orchestratorRoot: string;
  io: ProfileCliIo;
};

export function runProfileListCommand(options: ProfileListOptions): void {
  const { config } = resolveEffectiveConfig(options.orchestratorRoot);

  options.io.log("Agentic SDD profiles");
  options.io.log("");

  if (config.profiles.length === 0) {
    options.io.log("No profiles configured.");
    return;
  }

  for (const profile of config.profiles) {
    options.io.log(`${profile.name}  -  ${profile.description}`);
  }
}

export type ProfileShowOptions = {
  orchestratorRoot: string;
  name: string;
  io: ProfileCliIo;
};

export function runProfileShowCommand(options: ProfileShowOptions): void {
  const { config } = resolveEffectiveConfig(options.orchestratorRoot);
  const profile = findProfile(config, options.name);

  if (!profile) {
    options.io.error(`No profile named "${options.name}" was found.`);
    return;
  }

  options.io.log(`Profile: ${profile.name}`);
  options.io.log(`Description: ${profile.description}`);
  options.io.log(`Prompt template: ${profile.promptTemplate}`);
  options.io.log(`Context policy: ${profile.contextPolicy}`);
  options.io.log(`Recommended reasoning: ${profile.recommendedReasoning}`);

  const usedBy = config.agents.filter((agent) => agent.defaultProfile === profile.name);
  options.io.log(
    `Used by: ${usedBy.length > 0 ? usedBy.map((agent) => agent.name).join(", ") : "no agent currently"}`
  );
}
