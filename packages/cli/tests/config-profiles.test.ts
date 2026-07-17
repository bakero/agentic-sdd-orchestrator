import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runAgentListCommand, runAgentShowCommand } from "../src/commands/agent.js";
import {
  runConfigInitCommand,
  runConfigShowCommand,
  runConfigValidateCommand,
} from "../src/commands/config.js";
import { runEnvListCommand, runEnvShowCommand } from "../src/commands/env.js";
import { runProfileListCommand, runProfileShowCommand } from "../src/commands/profile.js";
import { runProjectConfigCommand } from "../src/commands/project.js";
import { defaultConfig, initLocalConfig, resolveEffectiveConfig } from "../src/lib/config.js";
import { validateConfig } from "../src/lib/config-validate.js";
import {
  resolveAgentContext,
  resolveEnvironmentContext,
  resolveHandoffInputs,
} from "../src/lib/prompt-context.js";
import type { AgenticSddConfig } from "../src/config/types.js";

const tempDirsForCleanup: string[] = [];

afterEach(() => {
  for (const dir of tempDirsForCleanup.splice(0, tempDirsForCleanup.length)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function createTempDir(prefix: string): string {
  const target = mkdtempSync(path.join(tmpdir(), prefix));
  tempDirsForCleanup.push(target);
  return target;
}

function collectIo() {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    io: {
      log: (message: string) => stdout.push(message),
      error: (message: string) => stderr.push(message),
    },
    stdout: () => stdout.join("\n"),
    stderr: () => stderr.join("\n"),
  };
}

describe("default config", () => {
  it("validates with no errors", () => {
    const result = validateConfig(defaultConfig());
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("defines the five required default agents", () => {
    const config = defaultConfig();
    const names = config.agents.map((agent) => agent.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "gemini_product_owner",
        "codex_architect",
        "claude_implementer",
        "codex_reviewer",
        "gemini_validator",
      ])
    );
  });

  it("defines at least the required default environments", () => {
    const config = defaultConfig();
    const names = config.environments.map((environment) => environment.name);
    expect(names).toEqual(
      expect.arrayContaining(["local_windows_powershell", "claude_cowork_browser", "manual_copy_paste"])
    );
  });

  it("every agent's skills exist in the skill list", () => {
    const config = defaultConfig();
    const skillNames = new Set(config.skills.map((skill) => skill.name));
    for (const agent of config.agents) {
      for (const skillName of agent.skills) {
        expect(skillNames.has(skillName)).toBe(true);
      }
    }
  });
});

describe("validateConfig", () => {
  function baseConfig(): AgenticSddConfig {
    return defaultConfig();
  }

  it("rejects duplicate agent names", () => {
    const config = baseConfig();
    config.agents.push({ ...config.agents[0] });

    const result = validateConfig(config);

    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => /Duplicate agent name/.test(error))).toBe(true);
  });

  it("rejects an agent with a missing default profile", () => {
    const config = baseConfig();
    config.agents[0].defaultProfile = "does_not_exist";

    const result = validateConfig(config);

    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => /unknown default profile/.test(error))).toBe(true);
  });

  it("rejects an agent with a missing skill", () => {
    const config = baseConfig();
    config.agents[0].skills = ["does_not_exist"];

    const result = validateConfig(config);

    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => /unknown skill/.test(error))).toBe(true);
  });

  it("rejects an invalid execution mode", () => {
    const config = baseConfig();
    // @ts-expect-error intentionally invalid value for the test
    config.agents[0].executionMode = "sometimes";

    const result = validateConfig(config);

    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => /invalid executionMode/.test(error))).toBe(true);
  });

  it("rejects an environment missing shell/os/executionSurface", () => {
    const config = baseConfig();
    config.environments[0].shell = "";
    config.environments[0].os = "";

    const result = validateConfig(config);

    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => /missing "shell"/.test(error))).toBe(true);
    expect(result.errors.some((error) => /missing "os"/.test(error))).toBe(true);
  });

  it("rejects duplicate profile/skill/environment names", () => {
    const config = baseConfig();
    config.profiles.push({ ...config.profiles[0] });
    config.skills.push({ ...config.skills[0] });
    config.environments.push({ ...config.environments[0] });

    const result = validateConfig(config);

    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => /Duplicate profile name/.test(error))).toBe(true);
    expect(result.errors.some((error) => /Duplicate skill name/.test(error))).toBe(true);
    expect(result.errors.some((error) => /Duplicate environment name/.test(error))).toBe(true);
  });
});

describe("config init/show/validate", () => {
  it("config init creates .agentic-sdd/config.json from defaults", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-config-init-");
    const { io } = collectIo();

    runConfigInitCommand({ orchestratorRoot, force: false, io });

    const filePath = path.join(orchestratorRoot, ".agentic-sdd", "config.json");
    expect(existsSync(filePath)).toBe(true);

    const written = JSON.parse(readFileSync(filePath, "utf8")) as AgenticSddConfig;
    expect(written.version).toBe(1);
    expect(written.agents.length).toBeGreaterThan(0);
  });

  it("config init does not overwrite an existing local config without --force", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-config-init-noforce-");
    const filePath = path.join(orchestratorRoot, ".agentic-sdd", "config.json");
    const initIo = collectIo();
    runConfigInitCommand({ orchestratorRoot, force: false, io: initIo.io });

    const before = readFileSync(filePath, "utf8");
    writeFileSync(filePath, before.replace('"version": 1', '"version": 1 '));

    const { io, stdout } = collectIo();
    runConfigInitCommand({ orchestratorRoot, force: false, io });

    expect(stdout()).toContain("already exists");
    expect(readFileSync(filePath, "utf8")).not.toBe(before);
  });

  it("config init overwrites when --force is passed", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-config-init-force-");
    const filePath = path.join(orchestratorRoot, ".agentic-sdd", "config.json");
    const initIo = collectIo();
    runConfigInitCommand({ orchestratorRoot, force: false, io: initIo.io });
    writeFileSync(filePath, "{ not valid json");

    const { io, stdout } = collectIo();
    runConfigInitCommand({ orchestratorRoot, force: true, io });

    expect(stdout()).toContain("Created local config");
    const written = JSON.parse(readFileSync(filePath, "utf8")) as AgenticSddConfig;
    expect(written.version).toBe(1);
  });

  it("config show prints the effective config and reports the source", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-config-show-");
    const { io, stdout } = collectIo();

    runConfigShowCommand({ orchestratorRoot, io });

    expect(stdout()).toContain("built-in defaults");
    expect(stdout()).toContain('"version": 1');
  });

  it("config show reports local override once config init has run", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-config-show-local-");
    const initIo = collectIo();
    runConfigInitCommand({ orchestratorRoot, force: false, io: initIo.io });

    const { io, stdout } = collectIo();
    runConfigShowCommand({ orchestratorRoot, io });

    expect(stdout()).toContain("local override");
  });

  it("config validate passes for the built-in defaults with no local config", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-config-validate-default-");
    const { io } = collectIo();

    const exitCode = runConfigValidateCommand({ orchestratorRoot, io });

    expect(exitCode).toBe(0);
  });

  it("config validate fails and returns non-zero for an invalid local config", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-config-validate-invalid-");
    const dir = path.join(orchestratorRoot, ".agentic-sdd");
    const filePath = path.join(dir, "config.json");
    const broken: AgenticSddConfig = defaultConfig();
    broken.agents[0].defaultProfile = "does_not_exist";
    mkdirSync(dir, { recursive: true });
    writeFileSync(filePath, JSON.stringify(broken, null, 2));

    const { io, stdout } = collectIo();
    const exitCode = runConfigValidateCommand({ orchestratorRoot, io });

    expect(exitCode).toBe(1);
    expect(stdout()).toContain("Result: INVALID");
  });
});

describe("profile/agent/env commands", () => {
  it("profile list prints all default profiles", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-profile-list-");
    const { io, stdout } = collectIo();

    runProfileListCommand({ orchestratorRoot, io });

    expect(stdout()).toContain("technical_specification");
    expect(stdout()).toContain("functional_discovery");
  });

  it("profile show prints prompt template and used-by agents", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-profile-show-");
    const { io, stdout } = collectIo();

    runProfileShowCommand({ orchestratorRoot, name: "technical_specification", io });

    expect(stdout()).toContain("codex_architect.md");
    expect(stdout()).toContain("codex_architect");
  });

  it("profile show reports an error for an unknown profile", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-profile-show-unknown-");
    const { io, stderr } = collectIo();

    runProfileShowCommand({ orchestratorRoot, name: "does_not_exist", io });

    expect(stderr()).toContain('No profile named "does_not_exist"');
  });

  it("agent list prints role, profile, mode, and provider for each agent", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-agent-list-");
    const { io, stdout } = collectIo();

    runAgentListCommand({ orchestratorRoot, io });

    expect(stdout()).toContain("codex_architect");
    expect(stdout()).toContain("mode: manual");
  });

  it("agent show prints skills, responsibilities, and forbidden actions", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-agent-show-");
    const { io, stdout } = collectIo();

    runAgentShowCommand({ orchestratorRoot, name: "codex_architect", io });

    expect(stdout()).toContain("repo_analysis");
    expect(stdout()).toContain("Responsibilities:");
    expect(stdout()).toContain("Forbidden actions:");
  });

  it("env list prints shell, surface, and tools for each environment", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-env-list-");
    const { io, stdout } = collectIo();

    runEnvListCommand({ orchestratorRoot, io });

    expect(stdout()).toContain("claude_cowork_browser");
    expect(stdout()).toContain("local_windows_powershell");
  });

  it("env show prints execution rules and forbidden actions", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-env-show-");
    const { io, stdout } = collectIo();

    runEnvShowCommand({ orchestratorRoot, name: "claude_cowork_browser", io });

    expect(stdout()).toContain("Execution rules:");
    expect(stdout()).toContain("Forbidden actions:");
    expect(stdout()).toContain("do not assume local file or shell access");
  });
});

describe("prompt-context resolution hooks", () => {
  it("resolves an agent's profile and flattened skill prompt guidance", () => {
    const config = defaultConfig();
    const result = resolveAgentContext(config, "codex_architect");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context.profile.name).toBe("technical_specification");
      expect(result.context.skills.length).toBeGreaterThan(0);
      expect(result.context.promptGuidance.length).toBe(result.context.skills.length);
    }
  });

  it("returns an error for an unknown agent", () => {
    const config = defaultConfig();
    const result = resolveAgentContext(config, "does_not_exist");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatch(/Unknown agent/);
    }
  });

  it("resolves a known environment", () => {
    const config = defaultConfig();
    const result = resolveEnvironmentContext(config, "claude_cowork_browser");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.environment.executionSurface).toBe("claude_cowork_browser");
    }
  });

  it("resolves combined handoff inputs for a valid agent/environment pair", () => {
    const config = defaultConfig();
    const result = resolveHandoffInputs(config, "claude_implementer", "local_windows_powershell");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.agentContext.agent.name).toBe("claude_implementer");
      expect(result.environment.name).toBe("local_windows_powershell");
    }
  });

  it("aggregates errors when both agent and environment are unknown", () => {
    const config = defaultConfig();
    const result = resolveHandoffInputs(config, "nope", "also_nope");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBe(2);
    }
  });
});

describe("project config", () => {
  it("shows agents and environments resolved for a direct path project", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-project-config-");
    const { io, stdout } = collectIo();

    runProjectConfigCommand({ orchestratorRoot, nameOrPath: orchestratorRoot, io });

    expect(stdout()).toContain("(not registered - direct path)");
    expect(stdout()).toContain("codex_architect");
    expect(stdout()).toContain("claude_cowork_browser");
    expect(stdout()).toContain("built-in defaults");
  });

  it("does not modify the resolved project or write a local config as a side effect", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-project-config-readonly-");
    const { io } = collectIo();

    runProjectConfigCommand({ orchestratorRoot, nameOrPath: orchestratorRoot, io });

    expect(existsSync(path.join(orchestratorRoot, ".agentic-sdd", "config.json"))).toBe(false);
  });
});

describe("resolveEffectiveConfig", () => {
  it("falls back to defaults when no local config exists", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-effective-default-");

    const { config, source } = resolveEffectiveConfig(orchestratorRoot);

    expect(source).toBe("default");
    expect(config.agents.length).toBeGreaterThan(0);
  });

  it("uses the local config once initLocalConfig has written one", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-effective-local-");
    initLocalConfig(orchestratorRoot);

    const { source } = resolveEffectiveConfig(orchestratorRoot);

    expect(source).toBe("local");
  });
});
