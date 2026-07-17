import { findAgent, resolveEffectiveConfig, skillsForAgent } from "../lib/config.js";

export type AgentCliIo = {
  log: (message: string) => void;
  error: (message: string) => void;
};

export type AgentListOptions = {
  orchestratorRoot: string;
  io: AgentCliIo;
};

export function runAgentListCommand(options: AgentListOptions): void {
  const { config } = resolveEffectiveConfig(options.orchestratorRoot);

  options.io.log("Agentic SDD agents");
  options.io.log("");

  if (config.agents.length === 0) {
    options.io.log("No agents configured.");
    return;
  }

  for (const agent of config.agents) {
    options.io.log(
      `${agent.name}  -  ${agent.role}  -  profile: ${agent.defaultProfile}  -  mode: ${agent.executionMode}  -  provider: ${agent.provider}`
    );
  }
}

export type AgentShowOptions = {
  orchestratorRoot: string;
  name: string;
  io: AgentCliIo;
};

export function runAgentShowCommand(options: AgentShowOptions): void {
  const { config } = resolveEffectiveConfig(options.orchestratorRoot);
  const agent = findAgent(config, options.name);

  if (!agent) {
    options.io.error(`No agent named "${options.name}" was found.`);
    return;
  }

  options.io.log(`Agent: ${agent.name}`);
  options.io.log(`Role: ${agent.role}`);
  options.io.log(`Description: ${agent.description}`);
  options.io.log(`Default profile: ${agent.defaultProfile}`);
  options.io.log(`Execution mode: ${agent.executionMode}`);
  options.io.log(`Provider: ${agent.provider}`);

  if (agent.externalReference) {
    options.io.log(`External reference: ${agent.externalReference.kind} - ${agent.externalReference.name}`);
  } else {
    options.io.log("External reference: none");
  }

  const skills = skillsForAgent(config, agent.name);
  options.io.log("");
  options.io.log("Skills:");
  if (skills.length === 0) {
    options.io.log("  none");
  } else {
    for (const skill of skills) {
      options.io.log(`  - ${skill.name}: ${skill.description}`);
    }
  }

  options.io.log("");
  options.io.log("Responsibilities:");
  for (const responsibility of agent.responsibilities) {
    options.io.log(`  - ${responsibility}`);
  }

  options.io.log("");
  options.io.log("Forbidden actions:");
  for (const forbidden of agent.forbiddenActions) {
    options.io.log(`  - ${forbidden}`);
  }
}
