export type ExecutionMode = "manual" | "automatic";

export type ExternalReferenceKind = "gem" | "custom_gpt" | "claude_project" | "none";

export type ExternalReference = {
  kind: ExternalReferenceKind;
  name: string;
};

export type AgentDefinition = {
  name: string;
  role: string;
  description: string;
  defaultProfile: string;
  executionMode: ExecutionMode;
  provider: string;
  externalReference?: ExternalReference;
  skills: string[];
  responsibilities: string[];
  forbiddenActions: string[];
};

export type ContextPolicy = "minimal" | "targeted" | "full";

export type ProfileDefinition = {
  name: string;
  description: string;
  promptTemplate: string;
  contextPolicy: ContextPolicy;
  recommendedReasoning: "low" | "medium" | "high";
};

export type SkillDefinition = {
  name: string;
  description: string;
  appliesTo: string[];
  promptGuidance: string;
  antiPatterns: string[];
};

export type EnvironmentTools = {
  git: boolean;
  gh: boolean;
  node: boolean;
  npm: boolean;
  browser: boolean;
};

export type EnvironmentDefinition = {
  name: string;
  os: string;
  shell: string;
  commandStyle: string;
  executionSurface: string;
  tools: EnvironmentTools;
  executionRules: string[];
  forbiddenActions: string[];
  expectedOutputFormat: string;
};

export type AgenticSddConfig = {
  version: 1;
  agents: AgentDefinition[];
  profiles: ProfileDefinition[];
  skills: SkillDefinition[];
  environments: EnvironmentDefinition[];
};
