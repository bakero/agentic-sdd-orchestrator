import { runInitFeatureCommand } from "./commands/init-feature.js";
import { runInspectCommand } from "./commands/inspect.js";
import { runInstallCommand } from "./commands/install.js";

function main(): void {
  const [, , command, targetPath, ...flags] = process.argv;
  const dryRun = flags.includes("--dry-run");

  if (!command || !targetPath) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  if (command === "inspect") {
    runInspectCommand({ targetPath });
    return;
  }

  if (command === "install") {
    runInstallCommand({ targetPath, dryRun });
    return;
  }

  if (command === "init-feature") {
    const issue = readRequiredFlagValue(flags, "--issue");
    const slug = readRequiredFlagValue(flags, "--slug");
    const title = readRequiredFlagValue(flags, "--title");

    runInitFeatureCommand({
      targetPath,
      issue: Number(issue),
      slug,
      title,
    });
    return;
  }

  console.error(`Unknown command: ${command}`);
  printUsage();
  process.exitCode = 1;
}

function readRequiredFlagValue(flags: string[], name: string): string {
  const index = flags.indexOf(name);
  const value = index >= 0 ? flags[index + 1] : undefined;
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing required flag: ${name}`);
  }
  return value;
}

function printUsage(): void {
  console.log("Usage:");
  console.log("  agentic-sdd inspect <target-repo>");
  console.log("  agentic-sdd install <target-repo> [--dry-run]");
  console.log("  agentic-sdd init-feature <target-repo> --issue <number> --slug <slug> --title <title>");
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
}
