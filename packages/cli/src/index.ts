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

  console.error(`Unknown command: ${command}`);
  printUsage();
  process.exitCode = 1;
}

function printUsage(): void {
  console.log("Usage:");
  console.log("  agentic-sdd inspect <target-repo>");
  console.log("  agentic-sdd install <target-repo> [--dry-run]");
}

main();
