import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runInstallCommand } from "../src/commands/install.js";

describe("runtime kit installer", () => {
  it("installs runtime kit files into a local target repository", () => {
    const target = mkdtempSync(path.join(tmpdir(), "agentic-sdd-install-"));

    try {
      runInstallCommand({ targetPath: target });

      expect(path.join(target, ".agents", "runtime", "next_action.schema.json")).toBeTruthy();
      expect(readFileSync(path.join(target, ".gitignore"), "utf8")).toContain(".agent_runtime/");
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
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });
});
