import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runDoctorCommand } from "../src/commands/doctor.js";
import { runInitFeatureCommand } from "../src/commands/init-feature.js";
import { runInstallCommand } from "../src/commands/install.js";
import { runNextCommand } from "../src/commands/next.js";
import {
  runProjectAddCommand,
  runProjectInspectCommand,
  runProjectListCommand,
  runProjectRemoveCommand,
} from "../src/commands/project.js";
import { loadRegistry } from "../src/lib/project-registry.js";

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

function createGitRepo(prefix: string): string {
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

describe("project registry", () => {
  it("project add creates .agentic-sdd/projects.json with a human-readable, 2-space-indented registry", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-orchestrator-root-");
    const target = createGitRepo("agentic-sdd-project-target-");
    const { io } = collectIo();

    runProjectAddCommand({ orchestratorRoot, targetPath: target, name: "demo", io });

    const registryPath = path.join(orchestratorRoot, ".agentic-sdd", "projects.json");
    expect(existsSync(registryPath)).toBe(true);

    const raw = readFileSync(registryPath, "utf8");
    expect(raw).toContain('  "version": 1');
    expect(raw).toContain('  "projects"');

    const registry = loadRegistry(orchestratorRoot);
    expect(registry.projects).toHaveLength(1);
    expect(registry.projects[0].name).toBe("demo");
    expect(registry.projects[0].path).toBe(path.resolve(target));
    expect(registry.projects[0].createdAt).toBeTruthy();
    expect(registry.projects[0].updatedAt).toBeTruthy();
  });

  it("rejects a duplicate project name", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-orchestrator-root-");
    const targetA = createGitRepo("agentic-sdd-project-a-");
    const targetB = createGitRepo("agentic-sdd-project-b-");
    const { io } = collectIo();

    runProjectAddCommand({ orchestratorRoot, targetPath: targetA, name: "demo", io });

    expect(() =>
      runProjectAddCommand({ orchestratorRoot, targetPath: targetB, name: "demo", io })
    ).toThrow(/already registered/);
  });

  it("rejects a target path that does not exist", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-orchestrator-root-");
    const { io } = collectIo();

    expect(() =>
      runProjectAddCommand({
        orchestratorRoot,
        targetPath: path.join(orchestratorRoot, "does-not-exist"),
        name: "demo",
        io,
      })
    ).toThrow(/does not exist/);
  });

  it("rejects a target path that is not a git repository", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-orchestrator-root-");
    const target = createTempDir("agentic-sdd-non-git-");
    const { io } = collectIo();

    expect(() => runProjectAddCommand({ orchestratorRoot, targetPath: target, name: "demo", io })).toThrow(
      /not a git repository/
    );
  });

  it("project list reports no projects registered when the registry is empty or missing", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-orchestrator-root-");
    const { io, stdout } = collectIo();

    runProjectListCommand({ orchestratorRoot, io });

    expect(stdout()).toContain("No projects registered.");
    expect(stdout()).toContain("project add <target-repo> --name <name>");
  });

  it("project list shows a single registered project's name and path", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-orchestrator-root-");
    const target = createGitRepo("agentic-sdd-project-target-");
    const addIo = collectIo();
    runProjectAddCommand({ orchestratorRoot, targetPath: target, name: "demo", io: addIo.io });

    const { io, stdout } = collectIo();
    runProjectListCommand({ orchestratorRoot, io });

    expect(stdout()).toContain("demo");
    expect(stdout()).toContain(path.resolve(target));
  });

  it("project remove deletes the registry entry but not the target repo files", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-orchestrator-root-");
    const target = createGitRepo("agentic-sdd-project-target-");
    const addIo = collectIo();
    runProjectAddCommand({ orchestratorRoot, targetPath: target, name: "demo", io: addIo.io });

    const { io, stdout } = collectIo();
    runProjectRemoveCommand({ orchestratorRoot, name: "demo", io });

    expect(stdout()).toContain('Removed project "demo"');
    expect(loadRegistry(orchestratorRoot).projects).toHaveLength(0);
    expect(existsSync(path.join(target, "package.json"))).toBe(true);
  });

  it("project remove on an unknown name reports nothing removed without throwing", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-orchestrator-root-");
    const { io, stdout } = collectIo();

    runProjectRemoveCommand({ orchestratorRoot, name: "ghost", io });

    expect(stdout()).toContain('No registered project named "ghost"');
  });

  it("project inspect resolves a registered name to its path and reports status", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-orchestrator-root-");
    const target = createGitRepo("agentic-sdd-project-target-");
    const addIo = collectIo();
    runProjectAddCommand({ orchestratorRoot, targetPath: target, name: "demo", io: addIo.io });

    const { io, stdout } = collectIo();
    runProjectInspectCommand({ orchestratorRoot, nameOrPath: "demo", io });

    expect(stdout()).toContain("Project name: demo");
    expect(stdout()).toContain(path.resolve(target));
    expect(stdout()).toContain("Git repository: true");
    expect(stdout()).toContain("Runtime kit installed: false");
  });

  it("project inspect falls back to a direct path when the name is not registered", () => {
    const orchestratorRoot = createTempDir("agentic-sdd-orchestrator-root-");
    const target = createGitRepo("agentic-sdd-project-target-");
    const { io, stdout } = collectIo();

    runProjectInspectCommand({ orchestratorRoot, nameOrPath: target, io });

    expect(stdout()).toContain("(not registered - direct path)");
    expect(stdout()).toContain(path.resolve(target));
  });
});

describe("doctor", () => {
  it("reports NEEDS_SETUP and recommends install on a repo with no runtime kit", () => {
    const target = createGitRepo("agentic-sdd-doctor-empty-");
    const { io } = collectIo();

    const report = runDoctorCommand({ orchestratorRoot: target, nameOrPath: target, io });

    expect(report.overallStatus).toBe("NEEDS_SETUP");
    expect(report.checks.some((check) => check.label === "Runtime kit folders present" && check.status === "FAIL")).toBe(
      true
    );
    expect(report.nextAction.command).toContain("agentic-sdd -- install");
  });

  it("reports NEEDS_FEATURE once the runtime kit is installed but no feature exists", () => {
    const target = createGitRepo("agentic-sdd-doctor-installed-");
    runInstallCommand({ targetPath: target });
    const { io } = collectIo();

    const report = runDoctorCommand({ orchestratorRoot: target, nameOrPath: target, io });

    expect(report.overallStatus).toBe("NEEDS_FEATURE");
    expect(report.diagnostics.missingRuntimePaths).toEqual([]);
    expect(report.nextAction.command).toContain("init-feature");
  });

  it("reports NEEDS_NEXT_PROMPT once a feature exists but no prompt was generated", () => {
    const target = createGitRepo("agentic-sdd-doctor-feature-");
    runInstallCommand({ targetPath: target });
    runInitFeatureCommand({ targetPath: target, issue: 1, slug: "demo-feature", title: "Demo feature" });
    const { io } = collectIo();

    const report = runDoctorCommand({ orchestratorRoot: target, nameOrPath: target, io });

    expect(["NEEDS_NEXT_PROMPT", "CHECK_WARNINGS"]).toContain(report.overallStatus);
    expect(report.diagnostics.featureFolders.map((f) => f.featureId)).toContain("1-demo-feature");
  });

  it("does not modify the target repository", () => {
    const target = createGitRepo("agentic-sdd-doctor-readonly-");
    const before = readFileSync(path.join(target, "package.json"), "utf8");
    const { io } = collectIo();

    runDoctorCommand({ orchestratorRoot: target, nameOrPath: target, io });

    expect(existsSync(path.join(target, ".agents"))).toBe(false);
    expect(readFileSync(path.join(target, "package.json"), "utf8")).toBe(before);
  });
});

describe("next", () => {
  it("recommends install when the runtime kit is missing", () => {
    const target = createGitRepo("agentic-sdd-next-empty-");
    const { io, stdout } = collectIo();

    const report = runNextCommand({ orchestratorRoot: target, nameOrPath: target, io });

    expect(report.nextAction.command).toContain("agentic-sdd -- install");
    expect(stdout()).toContain("Install the runtime kit.");
  });

  it("recommends init-feature when the runtime kit exists but there is no feature", () => {
    const target = createGitRepo("agentic-sdd-next-installed-");
    runInstallCommand({ targetPath: target });
    const { io, stdout } = collectIo();

    const report = runNextCommand({ orchestratorRoot: target, nameOrPath: target, io });

    expect(report.nextAction.command).toContain("init-feature");
    expect(stdout()).toContain("Initialize the first feature.");
  });

  it("recommends npm run agent:next when a feature exists and dependencies are installed but no prompt exists", () => {
    const target = createGitRepo("agentic-sdd-next-feature-");
    runInstallCommand({ targetPath: target });
    runInitFeatureCommand({ targetPath: target, issue: 1, slug: "demo-feature", title: "Demo feature" });

    execFileSync("node", ["-e", "require('fs').mkdirSync(require('path').join(process.argv[1], 'node_modules'))", target], {
      cwd: target,
    });

    const { io, stdout } = collectIo();
    const report = runNextCommand({ orchestratorRoot: target, nameOrPath: target, io });

    expect(report.nextAction.command).toContain("npm run agent:next");
    expect(stdout()).toContain("Generate the next agent prompt.");
  });

  it("does not modify the target repository", () => {
    const target = createGitRepo("agentic-sdd-next-readonly-");
    const before = readFileSync(path.join(target, "package.json"), "utf8");
    const { io } = collectIo();

    runNextCommand({ orchestratorRoot: target, nameOrPath: target, io });

    expect(existsSync(path.join(target, ".agents"))).toBe(false);
    expect(readFileSync(path.join(target, "package.json"), "utf8")).toBe(before);
  });
});
