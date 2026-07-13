#!/usr/bin/env node
import path from "node:path";
import { pathToFileURL } from "node:url";
import { runInitFeatureCommand } from "./commands/init-feature.js";
import { runInspectCommand } from "./commands/inspect.js";
import { runInstallCommand } from "./commands/install.js";

type CommandName = "inspect" | "install" | "init-feature";

type CliIo = {
  log: (message: string) => void;
  error: (message: string) => void;
};

const defaultIo: CliIo = {
  log: (message) => console.log(message),
  error: (message) => console.error(message),
};

export function runCli(argv: string[], io: CliIo = defaultIo): number {
  const [, , command, targetPath, ...flags] = argv;
  const dryRun = flags.includes("--dry-run");

  if (!command) {
    io.error("Missing command.");
    printUsage(io);
    return 1;
  }

  if (!isCommandName(command)) {
    io.error(`Unknown command: ${command}`);
    printUsage(io);
    return 1;
  }

  if (!targetPath) {
    io.error(`Missing target repository for command: ${command}`);
    printUsage(io);
    return 1;
  }

  if (command === "inspect") {
    runInspectCommand({ targetPath });
    return 0;
  }

  if (command === "install") {
    runInstallCommand({ targetPath, dryRun });
    return 0;
  }

  const issue = readIssueFlag(flags);
  const slug = readRequiredFlagValue(flags, "--slug");
  const title = readRequiredFlagValue(flags, "--title");

  runInitFeatureCommand({
    targetPath,
    issue,
    slug,
    title,
  });
  return 0;
}

function readRequiredFlagValue(flags: string[], name: string): string {
  const index = flags.indexOf(name);
  const value = index >= 0 ? flags[index + 1] : undefined;
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing required flag: ${name}`);
  }
  return value;
}

function readIssueFlag(flags: string[]): number {
  const rawIssue = readRequiredFlagValue(flags, "--issue");
  const issue = Number(rawIssue);

  if (!Number.isInteger(issue) || issue <= 0) {
    throw new Error(`Invalid issue number for "--issue": ${rawIssue}. Expected a positive integer.`);
  }

  return issue;
}

function isCommandName(command: string): command is CommandName {
  return command === "inspect" || command === "install" || command === "init-feature";
}

function printUsage(io: CliIo): void {
  io.log("Usage:");
  io.log("  agentic-sdd inspect <target-repo>");
  io.log("  agentic-sdd install <target-repo> [--dry-run]");
  io.log("  agentic-sdd init-feature <target-repo> --issue <number> --slug <slug> --title <title>");
}

if (isDirectExecution()) {
  try {
    process.exitCode = runCli(process.argv);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  }
}

function isDirectExecution(): boolean {
  const entryPath = process.argv[1];
  if (!entryPath) {
    return false;
  }

  return import.meta.url === pathToFileURL(path.resolve(entryPath)).href;
}
