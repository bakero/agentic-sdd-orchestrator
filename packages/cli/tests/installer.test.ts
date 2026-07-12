import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runInitFeatureCommand } from "../src/commands/init-feature.js";
import { runInstallCommand } from "../src/commands/install.js";

describe("runtime kit installer", () => {
  it("installs runtime kit files into a local target repository", () => {
    const target = mkdtempSync(path.join(tmpdir(), "agentic-sdd-install-"));

    try {
      writeFileSync(
        path.join(target, "package.json"),
        JSON.stringify({ name: "sandbox", version: "1.0.0", private: true }, null, 2)
      );

      runInstallCommand({ targetPath: target });

      expect(path.join(target, ".agents", "runtime", "next_action.schema.json")).toBeTruthy();
      expect(readFileSync(path.join(target, ".gitignore"), "utf8")).toContain(".agent_runtime/");
      const packageJson = JSON.parse(readFileSync(path.join(target, "package.json"), "utf8"));
      expect(packageJson.devDependencies.tsx).toBe("^4.20.0");
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  it("preserves existing package scripts", () => {
    const target = mkdtempSync(path.join(tmpdir(), "agentic-sdd-install-"));

    try {
      writeFileSync(
        path.join(target, "package.json"),
        JSON.stringify({ scripts: { "agent:validate": "custom validate" } }, null, 2)
      );

      runInstallCommand({ targetPath: target });

      const packageJson = JSON.parse(readFileSync(path.join(target, "package.json"), "utf8"));

      expect(packageJson.scripts["agent:validate"]).toBe("custom validate");
      expect(packageJson.scripts["agent:next"]).toBeDefined();
      expect(packageJson.devDependencies.tsx).toBe("^4.20.0");
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  it("supports a dry run without writing files", () => {
    const target = mkdtempSync(path.join(tmpdir(), "agentic-sdd-install-"));
    const packageJsonPath = path.join(target, "package.json");

    try {
      writeFileSync(packageJsonPath, JSON.stringify({ name: "sandbox", private: true }, null, 2));

      runInstallCommand({ targetPath: target, dryRun: true });

      expect(existsSync(path.join(target, ".agents"))).toBe(false);
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
      expect(packageJson.scripts).toBeUndefined();
      expect(packageJson.devDependencies).toBeUndefined();
      expect(existsSync(path.join(target, ".gitignore"))).toBe(false);
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  it("init-feature creates a feature folder from the template", () => {
    const target = createSandboxRepo("agentic-sdd-feature-");

    try {
      runInstallCommand({ targetPath: target });
      runInitFeatureCommand({
        targetPath: target,
        issue: 1,
        slug: "example-feature",
        title: "Example feature",
      });

      const featureRoot = path.join(target, "docs", "features", "1-example-feature");
      const status = readFileSync(path.join(featureRoot, "status.md"), "utf8");

      expect(existsSync(path.join(featureRoot, "functional_spec.md"))).toBe(true);
      expect(status).toContain("current_state: BRANCH_INITIALIZED");
      expect(status).toContain("docs/features/1-example-feature/README.md");
      expect(status).not.toContain("<issue-id>");
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  it("init-feature refuses to overwrite an existing feature folder", () => {
    const target = createSandboxRepo("agentic-sdd-feature-");

    try {
      runInstallCommand({ targetPath: target });
      runInitFeatureCommand({
        targetPath: target,
        issue: 1,
        slug: "example-feature",
        title: "Example feature",
      });

      expect(() =>
        runInitFeatureCommand({
          targetPath: target,
          issue: 1,
          slug: "example-feature",
          title: "Example feature",
        })
      ).toThrow(/already exists/);
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  it("install plus init-feature allows agent:next to render the first prompt", () => {
    const target = createSandboxRepo("agentic-sdd-next-");

    try {
      runInstallCommand({ targetPath: target });
      runInitFeatureCommand({
        targetPath: target,
        issue: 1,
        slug: "example-feature",
        title: "Example feature",
      });

      execFileSync(runtimeCommand(), runtimeArgs("agent:next"), {
        cwd: target,
        encoding: "utf8",
        env: buildRuntimeEnv(),
      });

      expect(existsSync(path.join(target, ".agent_runtime", "validation_report.json"))).toBe(true);
      expect(existsSync(path.join(target, ".agent_runtime", "next_action.json"))).toBe(true);
      expect(existsSync(path.join(target, ".agent_runtime", "context_files.txt"))).toBe(true);
      expect(existsSync(path.join(target, ".agent_runtime", "next_prompt.md"))).toBe(true);

      const nextPrompt = readFileSync(path.join(target, ".agent_runtime", "next_prompt.md"), "utf8");
      expect(nextPrompt).toContain("Act as gemini-product-owner for Issue #1");
      expect(nextPrompt).toContain("FUNCTIONAL_SPEC_IN_PROGRESS");
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });
});

function createSandboxRepo(prefix: string): string {
  const target = mkdtempSync(path.join(tmpdir(), prefix));
  const packageJsonPath = path.join(target, "package.json");

  writeFileSync(
    packageJsonPath,
    JSON.stringify({ name: "sandbox", version: "1.0.0", private: true }, null, 2)
  );

  execFileSync("git", ["init"], { cwd: target, stdio: "ignore" });
  execFileSync("git", ["config", "user.name", "Codex Tester"], { cwd: target, stdio: "ignore" });
  execFileSync("git", ["config", "user.email", "codex@example.com"], { cwd: target, stdio: "ignore" });
  execFileSync("git", ["add", "package.json"], { cwd: target, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "Initial commit"], { cwd: target, stdio: "ignore" });

  return target;
}

function buildRuntimeEnv(): NodeJS.ProcessEnv {
  const rootBin = path.resolve("node_modules", ".bin");
  const separator = process.platform === "win32" ? ";" : ":";

  return {
    ...process.env,
    PATH: `${rootBin}${separator}${process.env.PATH ?? ""}`,
  };
}

function runtimeCommand(): string {
  return process.platform === "win32" ? "cmd.exe" : "npm";
}

function runtimeArgs(scriptName: string): string[] {
  return process.platform === "win32"
    ? ["/d", "/s", "/c", `npm run ${scriptName}`]
    : ["run", scriptName];
}
