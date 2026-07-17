import { findAgent, resolveEffectiveConfig } from "./config.js";
import { diagnoseTargetRepo, isRuntimeKitInstalled } from "./diagnostics.js";
import { resolveFeature } from "./feature-resolver.js";
import type { Handoff, HandoffAgent, HandoffEnvironment } from "./handoff-types.js";
import { resolveAgentContext, resolveEnvironmentContext } from "./prompt-context.js";
import {
  CURRENT_STEP_GOAL_BY_STATE,
  DEFAULT_EXPECTED_OUTPUTS,
  DEFAULT_INPUT_FILES,
  EXPECTED_OUTPUTS_BY_STATE,
  INPUT_FILES_BY_STATE,
  isBlockedState,
  stateHandoff,
} from "./workflow-state-map.js";

export type GenerateHandoffOptions = {
  orchestratorRoot: string;
  targetPath: string;
  projectName: string | null;
  requestedAgent?: string;
  requestedFeatureId?: string;
  requestedEnvironment?: string;
};

export type GenerateHandoffError = {
  ok: false;
  message: string;
};

export type GenerateHandoffSuccess = {
  ok: true;
  handoff: Handoff;
};

const OVERALL_GOAL =
  "You are participating in a multi-agent SDD (spec-driven development) workflow. " +
  "The final expected result is a feature that is implemented, reviewed, validated, and ready for a human to review and merge as a pull request. " +
  "Do not merge automatically. Do not call external AI APIs. Stay inside the scope described in this handoff.";

const BASE_FORBIDDEN_ACTIONS: readonly string[] = [
  "do not auto-merge or create a pull request on your own",
  "do not call external AI APIs",
  "do not add secrets or credentials",
  "do not delete user files",
  "do not create a new branch unless explicitly instructed",
  "do not scan the full repository unless you are blocked and have no other way forward",
  "do not create duplicate documentation files",
  "do not modify unrelated workflow/runtime files unless this task requires it",
];

/**
 * Resolves project, feature, current/target state, agent, environment, and
 * composes the full Cowork handoff prompt. Read-only: never writes to the
 * target repository or calls any AI model. This is the single entry point
 * `handoff generate`, `handoff write`, and their tests all go through.
 */
export function generateHandoff(
  options: GenerateHandoffOptions
): GenerateHandoffError | GenerateHandoffSuccess {
  const diagnostics = diagnoseTargetRepo(options.targetPath);

  if (!diagnostics.target.exists) {
    return { ok: false, message: `Target path does not exist: ${diagnostics.target.targetPath}` };
  }

  if (!diagnostics.target.isGitRepository) {
    return {
      ok: false,
      message: `Target is not a git repository: ${diagnostics.target.targetPath}. Run "git init" there first.`,
    };
  }

  if (!isRuntimeKitInstalled(diagnostics)) {
    return {
      ok: false,
      message:
        `The Agentic SDD runtime kit is not installed in ${diagnostics.target.targetPath}. ` +
        `Run: npm run agentic-sdd -- install ${diagnostics.target.targetPath}`,
    };
  }

  const featureResult = resolveFeature(options.targetPath, options.requestedFeatureId);
  if (!featureResult.ok) {
    if (featureResult.reason === "no_feature") {
      return {
        ok: false,
        message:
          `${featureResult.message} ` +
          `Run: npm run agentic-sdd -- init-feature ${options.targetPath} --issue 1 --slug demo-feature --title "Demo feature"`,
      };
    }
    const candidateList = featureResult.candidates.map((candidate) => candidate.featureId).join(", ");
    return {
      ok: false,
      message: `${featureResult.message} Candidates: ${candidateList}.`,
    };
  }

  const { config } = resolveEffectiveConfig(options.orchestratorRoot);
  const feature = featureResult.feature;
  const currentState = feature.currentState ?? "state_unknown";

  if (currentState === "state_unknown") {
    return {
      ok: false,
      message:
        `Could not determine current_state for feature "${feature.id}" (status.md is missing or has no readable frontmatter). ` +
        `Run "npm run agentic-sdd -- doctor ${options.projectName ?? options.targetPath}" or check status.md manually before requesting a handoff.`,
    };
  }

  if (isBlockedState(currentState)) {
    return {
      ok: false,
      message:
        `Feature "${feature.id}" is in a blocked/terminal state (${currentState}) and does not have an executable next handoff. ` +
        `Resolve the block (see status.md "Blocking issues") or check state manually before requesting a handoff.`,
    };
  }

  const handoffEntry = stateHandoff(currentState);
  const agentName = options.requestedAgent ?? handoffEntry?.agent ?? feature.nextAgent ?? undefined;

  if (!agentName) {
    return {
      ok: false,
      message:
        `current_state "${currentState}" has no known agent mapping and status.md has no usable next_agent. ` +
        `Pass --agent <agent-name> explicitly, or check status.md manually.`,
    };
  }

  if (!findAgent(config, agentName)) {
    return {
      ok: false,
      message: `Unknown agent "${agentName}". Run "npm run agentic-sdd -- agent list" to see available agents.`,
    };
  }

  const agentContextResult = resolveAgentContext(config, agentName);
  if (!agentContextResult.ok) {
    return { ok: false, message: agentContextResult.errors.join(" ") };
  }

  const environmentName = options.requestedEnvironment ?? "local_windows_powershell";
  const environmentResult = resolveEnvironmentContext(config, environmentName);
  if (!environmentResult.ok) {
    return { ok: false, message: environmentResult.errors.join(" ") };
  }

  const targetState = handoffEntry?.targetStates[0] ?? null;
  const currentStepGoal =
    CURRENT_STEP_GOAL_BY_STATE[currentState] ??
    `Advance feature "${feature.id}" from its current state (${currentState}).`;
  const expectedOutputs = EXPECTED_OUTPUTS_BY_STATE[currentState] ?? DEFAULT_EXPECTED_OUTPUTS;
  const inputFileNames = INPUT_FILES_BY_STATE[currentState] ?? DEFAULT_INPUT_FILES;
  const featureRelativePath = `docs/features/${feature.id}`;
  const inputFiles = inputFileNames.map((fileName) => `${featureRelativePath}/${fileName}`);

  const agentDefinition = agentContextResult.context.agent;
  const environmentDefinition = environmentResult.environment;

  const handoffAgent: HandoffAgent = {
    name: agentDefinition.name,
    role: agentDefinition.role,
    provider: agentDefinition.provider,
    externalReference: agentDefinition.externalReference
      ? `${agentDefinition.externalReference.kind}: ${agentDefinition.externalReference.name}`
      : null,
    executionMode: agentDefinition.executionMode,
    profile: agentContextResult.context.profile.name,
    skills: agentContextResult.context.skills.map((skill) => skill.name),
  };

  const handoffEnvironment: HandoffEnvironment = {
    name: environmentDefinition.name,
    shell: environmentDefinition.shell,
    commandStyle: environmentDefinition.commandStyle,
    executionSurface: environmentDefinition.executionSurface,
    tools: environmentDefinition.tools,
  };

  const allowedPaths = [`${featureRelativePath}/`, "status.md (inside the feature folder above)"];
  const forbiddenActions = [
    ...BASE_FORBIDDEN_ACTIONS,
    ...agentDefinition.forbiddenActions,
  ];

  const validationCommands = buildValidationCommands(currentState, diagnostics.presentAgentScripts);

  const contextSummary =
    `Feature ${feature.id} is at state ${currentState}` +
    (targetState ? `, target state ${targetState}.` : ".") +
    ` Recommended agent: ${agentDefinition.name} (${agentDefinition.role}).`;

  const handoff: Handoff = {
    version: 1,
    createdAt: new Date().toISOString(),
    project: { name: options.projectName, path: diagnostics.target.targetPath },
    feature: {
      id: feature.id,
      slug: feature.slug,
      path: feature.path,
      currentState,
      targetState,
    },
    orchestration: {
      overallGoal: OVERALL_GOAL,
      currentStepGoal,
      safetyMode: "semi_assisted",
      executionMode: "cowork",
    },
    agent: handoffAgent,
    environment: handoffEnvironment,
    context: {
      inputFiles,
      summary: contextSummary,
      contextPolicy: agentContextResult.context.profile.contextPolicy,
    },
    expectedOutputs,
    allowedPaths,
    forbiddenActions,
    validationCommands,
    prompt: "",
  };

  handoff.prompt = composeHandoffPrompt(handoff, agentContextResult.context.promptGuidance);

  return { ok: true, handoff };
}

function buildValidationCommands(currentState: string, presentAgentScripts: string[]): string[] {
  const commands: string[] = [];
  if (presentAgentScripts.includes("agent:validate")) {
    commands.push("npm run agent:validate");
  }
  if (currentState === "READY_FOR_IMPLEMENTATION" || currentState === "IMPLEMENTATION_READY_FOR_REVIEW") {
    commands.push("npm test");
    commands.push("npm run typecheck");
  }
  if (presentAgentScripts.includes("agent:next")) {
    commands.push("npm run agent:next");
  }
  return commands.length > 0 ? commands : ["npm run agent:validate"];
}

function composeHandoffPrompt(handoff: Handoff, promptGuidance: string[]): string {
  const lines: string[] = [];

  lines.push(`# Cowork Handoff - ${handoff.agent.name}`);
  lines.push("");

  lines.push("## A. Execution surface");
  lines.push("");
  lines.push(executionSurfaceSentence(handoff.environment.executionSurface));
  lines.push("");

  lines.push("## B. Available environment");
  lines.push("");
  lines.push(`- OS / shell: ${handoff.environment.shell === "none" ? "not applicable (no local shell access)" : handoff.environment.shell}`);
  lines.push(`- Command style: ${handoff.environment.commandStyle}`);
  const availableTools = Object.entries(handoff.environment.tools)
    .filter(([, available]) => available)
    .map(([tool]) => tool);
  lines.push(`- Tools available: ${availableTools.length > 0 ? availableTools.join(", ") : "none"}`);
  lines.push(`- Target repository path: ${handoff.project.path}`);
  if (handoff.environment.executionSurface !== "local_shell") {
    lines.push("- Browser rule: treat the pasted content of this handoff as the only available context; do not assume local file or shell access.");
  }
  lines.push("");

  lines.push("## C. Overall orchestration goal");
  lines.push("");
  lines.push(handoff.orchestration.overallGoal);
  lines.push("");

  lines.push("## D. This execution goal");
  lines.push("");
  lines.push(handoff.orchestration.currentStepGoal);
  lines.push(
    `Current state: ${handoff.feature.currentState}${handoff.feature.targetState ? ` -> target state: ${handoff.feature.targetState}` : ""}.`
  );
  lines.push("");

  lines.push("## E. Agent profile");
  lines.push("");
  lines.push(`- Agent: ${handoff.agent.name}`);
  lines.push(`- Role: ${handoff.agent.role}`);
  lines.push(`- Recommended provider/tool: ${handoff.agent.provider}${handoff.agent.externalReference ? ` (${handoff.agent.externalReference})` : ""}`);
  lines.push(`- Execution mode: ${handoff.agent.executionMode}`);
  lines.push(`- Profile: ${handoff.agent.profile}`);
  lines.push(`- Active skills: ${handoff.agent.skills.join(", ") || "none"}`);
  if (promptGuidance.length > 0) {
    lines.push("- Skill guidance:");
    for (const guidance of promptGuidance) {
      lines.push(`  - ${guidance}`);
    }
  }
  lines.push("");

  lines.push("## F. Inputs");
  lines.push("");
  lines.push("Read these files first. Do not read the full repository unless you are blocked.");
  for (const inputFile of handoff.context.inputFiles) {
    lines.push(`- ${inputFile}`);
  }
  lines.push(`Context policy: ${handoff.context.contextPolicy}.`);
  lines.push("");

  lines.push("## G. Expected outputs");
  lines.push("");
  for (const output of handoff.expectedOutputs) {
    lines.push(`- ${output}`);
  }
  lines.push("");

  lines.push("## H. Allowed paths");
  lines.push("");
  for (const allowedPath of handoff.allowedPaths) {
    lines.push(`- ${allowedPath}`);
  }
  lines.push("");

  lines.push("## I. Forbidden actions");
  lines.push("");
  for (const forbidden of handoff.forbiddenActions) {
    lines.push(`- ${forbidden}`);
  }
  lines.push("");

  lines.push("## J. Validation commands");
  lines.push("");
  for (const command of handoff.validationCommands) {
    lines.push(`- ${command}`);
  }
  lines.push("");

  lines.push("## K. Final report format");
  lines.push("");
  lines.push("When you finish (or if you get blocked), report:");
  lines.push("- branch");
  lines.push("- files changed");
  lines.push("- tests run and their results");
  lines.push("- result (done / partially done / blocked)");
  lines.push("- blockers, if any");
  lines.push("- next recommended state");
  lines.push("- exact paths to any output files you created or updated");
  lines.push("");
  lines.push("Do not merge or create a pull request yourself. A human reviews and merges.");

  return lines.join("\n");
}

function executionSurfaceSentence(executionSurface: string): string {
  if (executionSurface === "claude_cowork_browser") {
    return "You are running inside Claude Cowork in the browser.";
  }
  if (executionSurface === "manual_copy_paste") {
    return "You are receiving this handoff as manually copied/pasted text, with no other context than what is included here.";
  }
  return "You are running in a local shell with direct filesystem access to the target repository path listed below.";
}
