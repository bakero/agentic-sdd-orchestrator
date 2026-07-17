import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runCli } from "../src/index.js";

describe("CLI invocation", () => {
  afterEach(() => {
    for (const dir of tempDirsForCleanup.splice(0, tempDirsForCleanup.length)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("prints usage and returns non-zero when the command is missing", () => {
    const result = captureCli(["node", "agentic-sdd"]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Missing command.");
    expect(result.stdout).toContain("agentic-sdd inspect <target-repo>");
  });

  it("prints usage and returns non-zero for an unknown command", () => {
    const result = captureCli(["node", "agentic-sdd", "ship", "."]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Unknown command: ship");
    expect(result.stdout).toContain("agentic-sdd install <target-repo> [--dry-run]");
  });

  it("prints usage and returns non-zero when the target repo is missing", () => {
    const result = captureCli(["node", "agentic-sdd", "inspect"]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Missing target repository for command: inspect");
    expect(result.stdout).toContain("agentic-sdd init-feature <target-repo> --issue <number> --slug <slug> --title <title>");
  });

  it("supports the npm run agentic-sdd dry-run path without writing files", () => {
    const target = createTempDir("agentic-sdd-cli-dry-run-");
    writeFileSync(
      path.join(target, "package.json"),
      JSON.stringify({ name: "sandbox", private: true }, null, 2)
    );

    const output = execFileSync(npmCommand(), npmRunArgs(`agentic-sdd -- install ${target} --dry-run`), {
      cwd: path.resolve("."),
      encoding: "utf8",
      env: process.env,
    });

    expect(output).toContain("Dry run: true");
    expect(existsSync(path.join(target, ".agents"))).toBe(false);
    expect(readFileSync(path.join(target, "package.json"), "utf8")).not.toContain("agent:next");
  });

  it("validates required init-feature flags", () => {
    const target = createTempDir("agentic-sdd-cli-init-feature-");
    writeFileSync(
      path.join(target, "package.json"),
      JSON.stringify({ name: "sandbox", private: true }, null, 2)
    );

    expect(() =>
      runCli(["node", "agentic-sdd", "init-feature", target, "--issue", "1", "--slug", "demo-feature"])
    ).toThrow(/Missing required flag: --title/);
  });

  it("routes unknown project subcommands to a clear error", () => {
    const result = captureCli(["node", "agentic-sdd", "project", "ship"]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Unknown project subcommand: ship");
  });

  it("requires --name for project add", () => {
    const target = createTempDir("agentic-sdd-cli-project-add-");

    expect(() => runCli(["node", "agentic-sdd", "project", "add", target])).toThrow(
      /Missing required flag: --name/
    );
  });

  it("requires a name or path for doctor", () => {
    const result = captureCli(["node", "agentic-sdd", "doctor"]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Missing project name or path for command: doctor");
  });

  it("requires a name or path for next", () => {
    const result = captureCli(["node", "agentic-sdd", "next"]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Missing project name or path for command: next");
  });

  it("routes doctor and next by direct path end to end via the CLI", () => {
    const target = createTempDir("agentic-sdd-cli-doctor-");
    writeFileSync(
      path.join(target, "package.json"),
      JSON.stringify({ name: "sandbox", private: true }, null, 2)
    );
    execFileSync("git", ["init"], { cwd: target, stdio: "ignore" });

    const doctorResult = captureCli(["node", "agentic-sdd", "doctor", target]);
    expect(doctorResult.exitCode).toBe(0);
    expect(doctorResult.stdout).toContain("Overall status: NEEDS_SETUP");

    const nextResult = captureCli(["node", "agentic-sdd", "next", target]);
    expect(nextResult.exitCode).toBe(0);
    expect(nextResult.stdout).toContain("Install the runtime kit.");
  });

  it("routes profile/agent/env list and show commands", () => {
    const profileList = captureCli(["node", "agentic-sdd", "profile", "list"]);
    expect(profileList.exitCode).toBe(0);
    expect(profileList.stdout).toContain("technical_specification");

    const profileShow = captureCli(["node", "agentic-sdd", "profile", "show", "technical_specification"]);
    expect(profileShow.exitCode).toBe(0);
    expect(profileShow.stdout).toContain("codex_architect.md");

    const agentList = captureCli(["node", "agentic-sdd", "agent", "list"]);
    expect(agentList.exitCode).toBe(0);
    expect(agentList.stdout).toContain("codex_architect");

    const agentShow = captureCli(["node", "agentic-sdd", "agent", "show", "codex_architect"]);
    expect(agentShow.exitCode).toBe(0);
    expect(agentShow.stdout).toContain("Forbidden actions:");

    const envList = captureCli(["node", "agentic-sdd", "env", "list"]);
    expect(envList.exitCode).toBe(0);
    expect(envList.stdout).toContain("claude_cowork_browser");

    const envShow = captureCli(["node", "agentic-sdd", "env", "show", "claude_cowork_browser"]);
    expect(envShow.exitCode).toBe(0);
    expect(envShow.stdout).toContain("Execution rules:");
  });

  it("routes config show and config validate (read-only, no local config required)", () => {
    const showResult = captureCli(["node", "agentic-sdd", "config", "show"]);
    expect(showResult.exitCode).toBe(0);
    expect(showResult.stdout).toContain("Agents:");

    const validateResult = captureCli(["node", "agentic-sdd", "config", "validate"]);
    expect(validateResult.exitCode).toBe(0);
    expect(validateResult.stdout).toContain("Result: VALID");
  });

  it("routes unknown config subcommands to a clear error", () => {
    const result = captureCli(["node", "agentic-sdd", "config", "ship"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Unknown config subcommand: ship");
  });

  it("routes unknown profile/agent/env subcommands to a clear error", () => {
    const profileResult = captureCli(["node", "agentic-sdd", "profile", "ship"]);
    expect(profileResult.exitCode).toBe(1);
    expect(profileResult.stderr).toContain("Unknown profile subcommand: ship");

    const agentResult = captureCli(["node", "agentic-sdd", "agent", "ship"]);
    expect(agentResult.exitCode).toBe(1);
    expect(agentResult.stderr).toContain("Unknown agent subcommand: ship");

    const envResult = captureCli(["node", "agentic-sdd", "env", "ship"]);
    expect(envResult.exitCode).toBe(1);
    expect(envResult.stderr).toContain("Unknown env subcommand: ship");
  });

  it("routes unknown handoff subcommands to a clear error", () => {
    const result = captureCli(["node", "agentic-sdd", "handoff", "ship"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Unknown handoff subcommand: ship");
  });

  it("requires a name or path for handoff generate/write/show/list", () => {
    const generateResult = captureCli(["node", "agentic-sdd", "handoff", "generate"]);
    expect(generateResult.exitCode).toBe(1);
    expect(generateResult.stderr).toContain("Missing project name or path for command: handoff generate");

    const showResult = captureCli(["node", "agentic-sdd", "handoff", "show"]);
    expect(showResult.exitCode).toBe(1);
    expect(showResult.stderr).toContain("Missing project name or path for command: handoff show");
  });

  it("routes handoff generate by direct path end to end via the CLI, failing clearly with no runtime kit", () => {
    const target = createTempDir("agentic-sdd-cli-handoff-");
    writeFileSync(
      path.join(target, "package.json"),
      JSON.stringify({ name: "sandbox", private: true }, null, 2)
    );
    execFileSync("git", ["init"], { cwd: target, stdio: "ignore" });

    const result = captureCli(["node", "agentic-sdd", "handoff", "generate", target]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("runtime kit is not installed");
  });

  it("rejects invalid issue numbers before touching git state", () => {
    const target = createTempDir("agentic-sdd-cli-invalid-issue-");
    writeFileSync(
      path.join(target, "package.json"),
      JSON.stringify({ name: "sandbox", private: true }, null, 2)
    );

    expect(() =>
      runCli([
        "node",
        "agentic-sdd",
        "init-feature",
        target,
        "--issue",
        "abc",
        "--slug",
        "demo-feature",
        "--title",
        "Demo feature",
      ])
    ).toThrow(/Invalid issue number/);
  });
});

function captureCli(argv: string[]): { exitCode: number; stdout: string; stderr: string } {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const exitCode = runCli(argv, {
    log: (message) => stdout.push(message),
    error: (message) => stderr.push(message),
  });

  return {
    exitCode,
    stdout: stdout.join("\n"),
    stderr: stderr.join("\n"),
  };
}

function createTempDir(prefix: string): string {
  const target = mkdtempSync(path.join(tmpdir(), prefix));
  tempDirsForCleanup.push(target);
  return target;
}

const tempDirsForCleanup: string[] = [];

function npmCommand(): string {
  return process.platform === "win32" ? "cmd.exe" : "npm";
}

function npmRunArgs(scriptWithArgs: string): string[] {
  return process.platform === "win32"
    ? ["/d", "/s", "/c", `npm run ${scriptWithArgs}`]
    : ["run", ...scriptWithArgs.split(" ")];
}
