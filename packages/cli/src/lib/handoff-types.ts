export type HandoffProject = {
  name: string | null;
  path: string;
};

export type HandoffFeature = {
  id: string;
  slug: string;
  path: string;
  currentState: string;
  targetState: string | null;
};

export type HandoffOrchestration = {
  overallGoal: string;
  currentStepGoal: string;
  safetyMode: "semi_assisted";
  executionMode: "cowork";
};

export type HandoffAgent = {
  name: string;
  role: string;
  provider: string;
  externalReference: string | null;
  executionMode: string;
  profile: string;
  skills: string[];
};

export type HandoffEnvironment = {
  name: string;
  shell: string;
  commandStyle: string;
  executionSurface: string;
  tools: Record<string, boolean>;
};

export type HandoffContext = {
  inputFiles: string[];
  summary: string;
  contextPolicy: string;
};

export type Handoff = {
  version: 1;
  createdAt: string;
  project: HandoffProject;
  feature: HandoffFeature;
  orchestration: HandoffOrchestration;
  agent: HandoffAgent;
  environment: HandoffEnvironment;
  context: HandoffContext;
  expectedOutputs: string[];
  allowedPaths: string[];
  forbiddenActions: string[];
  validationCommands: string[];
  prompt: string;
};
