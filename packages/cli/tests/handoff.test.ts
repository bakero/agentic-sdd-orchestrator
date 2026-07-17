import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runHandoffGenerateCommand, runHandoffShowCommand, runHandoffWriteCommand } from "../src/commands/handoff.js";
import { runInitFeatureCommand } from "../src/commands/init-feature.js";
import { runInstallCommand } from "../src/commands/install.js";
import { generateHandoff } from "../src/lib/handoff.js";
import { latestHandoff, projectSlugFor, readHandoffJson } from "../src/lib/handoff-storage.js";

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

function createSandboxRepo(prefix: string): string {
  const target = createTempDir(prefix);
  writeFileSync(
    path.join(target, "package.json"),
    JSON.stringify({ name: "sandbox", version: "1.0.0", private: true }, null, 2)
  );
  execFileSync("git", ["init"], { cwd: target, stdio: "ignore" });
  execFileSync("git", ["config", "user.name", "Test User"], { cwd: target, stdio: "ignore" });
  execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: target, stdio: "ignore" });
  execFileSync("git", ["add", "package.json"], { cwd: target, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "Initial commit"], { cwd: target, stdio: "ignore" });
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

function installedRepoWithFeature(prefix: string, issue = 1, slug = "demo-feature"): string {
  const target = createSandboxRepo(prefix);
  runInstallCommand({ targetPath: target });
  runInitFeatureCommand({ targetPath: target, issue, slug, title: "Demo feature" });
  return target;
}

describe("generateHandoff", () => {
  it("fails clearly when the project path does not exist", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-handoff-orch-");
    const missingPath = path.join(orchestratorRoot, "does-not-exist");

    const result = generateHandoff({ orchestratorRoot, targetPath: missingPath, projectName: null });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/does not exist/);
    }
  });

  it("fails clearly when the runtime kit is not installed", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-handoff-orch-");
    const target = createSandboxRepo("agentic-sdd-handoff-noruntime-");

    const result = generateHandoff({ orchestratorRoot, targetPath: target, projectName: null });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/runtime kit is not installed/);
      expect(result.message).toContain("agentic-sdd -- install");
    }
  });

  it("fails clearly when no feature exists", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-handoff-orch-");
    const target = createSandboxRepo("agentic-sdd-handoff-nofeature-");
    runInstallCommand({ targetPath: target });

    const result = generateHandoff({ orchestratorRoot, targetPath: target, projectName: null });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/No feature folders found/);
      expect(result.message).toContain("init-feature");
    }
  });

  it("fails clearly when multiple features exist without --feature", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-handoff-orch-");
    const target = createSandboxRepo("agentic-sdd-handoff-multi-");
    runInstallCommand({ targetPath: target });
    runInitFeatureCommand({ targetPath: target, issue: 1, slug: "first-feature", title: "First" });
    execFileSync("git", ["checkout", "-b", "feature/2-second-feature"], { cwd: target, stdio: "ignore" });
    runInitFeatureCommand({ targetPath: target, issue: 2, slug: "second-feature", title: "Second" });

    const result = generateHandoff({ orchestratorRoot, targetPath: target, projectName: null });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/Multiple feature folders found/);
      expect(result.message).toContain("1-first-feature");
      expect(result.message).toContain("2-second-feature");
    }
  });

  it("resolves a single feature automatically", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-handoff-orch-");
    const target = installedRepoWithFeature("agentic-sdd-handoff-single-");

    const result = generateHandoff({ orchestratorRoot, targetPath: target, projectName: null });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.handoff.feature.id).toBe("1-demo-feature");
      expect(result.handoff.feature.currentState).toBe("BRANCH_INITIALIZED");
    }
  });

  it("resolves the requested feature when --feature is passed among multiple", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-handoff-orch-");
    const target = createSandboxRepo("agentic-sdd-handoff-pick-");
    runInstallCommand({ targetPath: target });
    runInitFeatureCommand({ targetPath: target, issue: 1, slug: "first-feature", title: "First" });
    execFileSync("git", ["checkout", "-b", "feature/2-second-feature"], { cwd: target, stdio: "ignore" });
    runInitFeatureCommand({ targetPath: target, issue: 2, slug: "second-feature", title: "Second" });

    const result = generateHandoff({
      orchestratorRoot,
      targetPath: target,
      projectName: null,
      requestedFeatureId: "2-second-feature",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.handoff.feature.id).toBe("2-second-feature");
    }
  });

  it("includes agent/profile/environment details", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-handoff-orch-");
    const target = installedRepoWithFeature("agentic-sdd-handoff-agent-");

    const result = generateHandoff({ orchestratorRoot, targetPath: target, projectName: null });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.handoff.agent.name).toBe("gemini_product_owner");
      expect(result.handoff.agent.role).toBe("Product Owner");
      expect(result.handoff.agent.profile).toBe("functional_discovery");
      expect(result.handoff.agent.skills.length).toBeGreaterThan(0);
      expect(result.handoff.environment.name).toBe("local_windows_powershell");
    }
  });

  it("honors an explicit --agent override", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-handoff-orch-");
    const target = installedRepoWithFeature("agentic-sdd-handoff-agentoverride-");

    const result = generateHandoff({
      orchestratorRoot,
      targetPath: target,
      projectName: null,
      requestedAgent: "codex_architect",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.handoff.agent.name).toBe("codex_architect");
    }
  });

  it("includes the overall orchestration goal", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-handoff-orch-");
    const target = installedRepoWithFeature("agentic-sdd-handoff-goal-");

    const result = generateHandoff({ orchestratorRoot, targetPath: target, projectName: null });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.handoff.orchestration.overallGoal).toMatch(/multi-agent SDD/);
      expect(result.handoff.orchestration.overallGoal).toMatch(/Do not merge automatically/);
      expect(result.handoff.prompt).toContain("## C. Overall orchestration goal");
    }
  });

  it("includes expected outputs", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-handoff-orch-");
    const target = installedRepoWithFeature("agentic-sdd-handoff-outputs-");

    const result = generateHandoff({ orchestratorRoot, targetPath: target, projectName: null });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.handoff.expectedOutputs).toContain("functional_spec.md");
      expect(result.handoff.prompt).toContain("## G. Expected outputs");
    }
  });

  it("includes forbidden actions covering the required safety baseline", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-handoff-orch-");
    const target = installedRepoWithFeature("agentic-sdd-handoff-forbidden-");

    const result = generateHandoff({ orchestratorRoot, targetPath: target, projectName: null });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const joined = result.handoff.forbiddenActions.join(" | ");
      expect(joined).toMatch(/do not auto-merge/);
      expect(joined).toMatch(/do not call external AI APIs/);
      expect(joined).toMatch(/do not add secrets/);
      expect(joined).toMatch(/do not delete user files/);
      expect(joined).toMatch(/do not create a new branch/);
      expect(result.handoff.prompt).toContain("## I. Forbidden actions");
    }
  });

  it("includes environment and browser instructions for the Claude Cowork browser environment", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-handoff-orch-");
    const target = installedRepoWithFeature("agentic-sdd-handoff-browser-");

    const result = generateHandoff({
      orchestratorRoot,
      targetPath: target,
      projectName: null,
      requestedEnvironment: "claude_cowork_browser",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.handoff.prompt).toContain("You are running inside Claude Cowork in the browser.");
      expect(result.handoff.prompt).toMatch(/do not assume local file or shell access/);
      expect(result.handoff.environment.tools.browser).toBe(true);
      expect(result.handoff.environment.tools.git).toBe(false);
    }
  });

  it("fails clearly for an unknown --agent", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-handoff-orch-");
    const target = installedRepoWithFeature("agentic-sdd-handoff-badagent-");

    const result = generateHandoff({
      orchestratorRoot,
      targetPath: target,
      projectName: null,
      requestedAgent: "not_a_real_agent",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/Unknown agent/);
    }
  });

  it("does not modify the target repository", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-handoff-orch-");
    const target = installedRepoWithFeature("agentic-sdd-handoff-readonly-");
    const statusPath = path.join(target, "docs", "features", "1-demo-feature", "status.md");
    const before = readFileSync(statusPath, "utf8");

    generateHandoff({ orchestratorRoot, targetPath: target, projectName: null });

    expect(readFileSync(statusPath, "utf8")).toBe(before);
  });
});

describe("handoff write / show", () => {
  it("handoff write creates handoff.json, prompt.md, and context_files.txt", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-handoff-orch-");
    const target = installedRepoWithFeature("agentic-sdd-handoff-write-");
    const { io } = collectIo();

    runHandoffWriteCommand({ orchestratorRoot, nameOrPath: target, io });

    const projectSlug = projectSlugFor(null, target);
    const latest = latestHandoff(orchestratorRoot, projectSlug);
    expect(latest).toBeDefined();
    if (latest) {
      expect(existsSync(path.join(latest.dir, "handoff.json"))).toBe(true);
      expect(existsSync(path.join(latest.dir, "prompt.md"))).toBe(true);
      expect(existsSync(path.join(latest.dir, "context_files.txt"))).toBe(true);

      const handoff = readHandoffJson(latest.dir);
      expect(handoff.feature.id).toBe("1-demo-feature");
      expect(handoff.agent.name).toBe("gemini_product_owner");

      const contextFiles = readFileSync(path.join(latest.dir, "context_files.txt"), "utf8");
      expect(contextFiles).toContain("docs/features/1-demo-feature/status.md");
    }
  });

  it("handoff write is written under the orchestrator's .agentic-sdd/handoffs, not the target repo", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-handoff-orch-");
    const target = installedRepoWithFeature("agentic-sdd-handoff-location-");
    const { io } = collectIo();

    runHandoffWriteCommand({ orchestratorRoot, nameOrPath: target, io });

    const projectSlug = projectSlugFor(null, target);
    const latest = latestHandoff(orchestratorRoot, projectSlug);
    expect(latest?.dir.startsWith(path.join(orchestratorRoot, ".agentic-sdd", "handoffs"))).toBe(true);
    expect(existsSync(path.join(target, ".agentic-sdd"))).toBe(false);
  });

  it("handoff show reads the latest written handoff", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-handoff-orch-");
    const target = installedRepoWithFeature("agentic-sdd-handoff-show-");
    const writeIo = collectIo();
    runHandoffWriteCommand({ orchestratorRoot, nameOrPath: target, io: writeIo.io });

    const { io, stdout } = collectIo();
    runHandoffShowCommand({ orchestratorRoot, nameOrPath: target, io });

    expect(stdout()).toContain("1-demo-feature");
    expect(stdout()).toContain("gemini_product_owner");
    expect(stdout()).toContain("## A. Execution surface");
  });

  it("handoff show suggests handoff write when no handoff exists yet", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-handoff-orch-");
    const target = installedRepoWithFeature("agentic-sdd-handoff-noneyet-");
    const { io, stdout } = collectIo();

    runHandoffShowCommand({ orchestratorRoot, nameOrPath: target, io });

    expect(stdout()).toContain("No handoff has been written yet");
    expect(stdout()).toContain("handoff write");
  });
});

describe("handoff generate command output", () => {
  it("prints a metadata header followed by the prompt", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-handoff-orch-");
    const target = installedRepoWithFeature("agentic-sdd-handoff-cli-");
    const { io, stdout } = collectIo();

    const result = runHandoffGenerateCommand({ orchestratorRoot, nameOrPath: target, io });

    expect(result.ok).toBe(true);
    expect(stdout()).toContain("Feature: 1-demo-feature");
    expect(stdout()).toContain("Current state: BRANCH_INITIALIZED");
    expect(stdout()).toContain("Agent: gemini_product_owner");
    expect(stdout()).toContain("Estimated context files:");
    expect(stdout()).toContain("# Cowork Handoff - gemini_product_owner");
  });

  it("reports a clear error and does not print a prompt when generation fails", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-handoff-orch-");
    const target = createSandboxRepo("agentic-sdd-handoff-clifail-");
    const { io, stderr, stdout } = collectIo();

    const result = runHandoffGenerateCommand({ orchestratorRoot, nameOrPath: target, io });

    expect(result.ok).toBe(false);
    expect(stderr()).toMatch(/runtime kit is not installed/);
    expect(stdout()).toBe("");
  });
});
