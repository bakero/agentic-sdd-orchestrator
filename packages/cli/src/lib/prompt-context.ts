import { findAgent, findEnvironment, findProfile, skillsForAgent } from "./config.js";
import type { AgenticSddConfig } from "../config/types.js";

export type ResolvedAgentContext = {
  agent: NonNullable<ReturnType<typeof findAgent>>;
  profile: NonNullable<ReturnType<typeof findProfile>>;
  skills: ReturnType<typeof skillsForAgent>;
  promptGuidance: string[];
};

export type ResolveAgentContextError = {
  ok: false;
  errors: string[];
};

export type ResolveAgentContextSuccess = {
  ok: true;
  context: ResolvedAgentContext;
};

/**
 * Resolves everything a future handoff/prompt generator (v0.5) will need
 * for one agent step: the agent definition, its profile, its skills, and
 * the flattened prompt-guidance fragments those skills contribute. This
 * module does not render or write a prompt; it only resolves the inputs
 * a renderer would need.
 */
export function resolveAgentContext(
  config: AgenticSddConfig,
  agentName: string
): ResolveAgentContextError | ResolveAgentContextSuccess {
  const agent = findAgent(config, agentName);
  if (!agent) {
    return { ok: false, errors: [`Unknown agent: "${agentName}".`] };
  }

  const profile = findProfile(config, agent.defaultProfile);
  if (!profile) {
    return {
      ok: false,
      errors: [`Agent "${agentName}" references unknown profile "${agent.defaultProfile}".`],
    };
  }

  const skills = skillsForAgent(config, agentName);
  const promptGuidance = skills.map((skill) => skill.promptGuidance);

  return { ok: true, context: { agent, profile, skills, promptGuidance } };
}

export type ResolveEnvironmentError = {
  ok: false;
  errors: string[];
};

export type ResolveEnvironmentSuccess = {
  ok: true;
  environment: NonNullable<ReturnType<typeof findEnvironment>>;
};

export function resolveEnvironmentContext(
  config: AgenticSddConfig,
  environmentName: string
): ResolveEnvironmentError | ResolveEnvironmentSuccess {
  const environment = findEnvironment(config, environmentName);
  if (!environment) {
    return { ok: false, errors: [`Unknown environment: "${environmentName}".`] };
  }
  return { ok: true, environment };
}

/**
 * Convenience combination of agent context + environment context for a
 * single handoff step. Still resolution only, no rendering or execution;
 * this is the seam v0.5's handoff generator is expected to call into.
 */
export function resolveHandoffInputs(
  config: AgenticSddConfig,
  agentName: string,
  environmentName: string
):
  | { ok: false; errors: string[] }
  | { ok: true; agentContext: ResolvedAgentContext; environment: NonNullable<ReturnType<typeof findEnvironment>> } {
  const agentResult = resolveAgentContext(config, agentName);
  const environmentResult = resolveEnvironmentContext(config, environmentName);

  const errors = [
    ...(agentResult.ok ? [] : agentResult.errors),
    ...(environmentResult.ok ? [] : environmentResult.errors),
  ];

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    agentContext: (agentResult as ResolveAgentContextSuccess).context,
    environment: (environmentResult as ResolveEnvironmentSuccess).environment,
  };
}
