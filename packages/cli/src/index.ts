#!/usr/bin/env node
import path from "node:path";
import { pathToFileURL } from "node:url";
import { runDoctorCommand } from "./commands/doctor.js";
import { runInitFeatureCommand } from "./commands/init-feature.js";
import { runInspectCommand } from "./commands/inspect.js";
import { runInstallCommand } from "./commands/install.js";
import { runNextCommand } from "./commands/next.js";
import {
  resolveOrchestratorRoot,
  runProjectAddCommand,
  runProjectInspectCommand,
  runProjectListCommand,
  runProjectRemoveCommand,
} from "./commands/project.js";

type LegacyTargetCommandName = "inspect" | "install" | "init-feature";
type NameOrPathCommandName = "doctor" | "next";
type CommandName = LegacyTargetCommandName | NameOrPathCommandName | "project";

type CliIo = {
  log: (message: string) => void;
  error: (message: string) => void;
};

const defaultIo: CliIo = {
  log: (message) => console.log(message),
  error: (message) => console.error(message),
};

export function runCli(argv: string[], io: CliIo = defaultIo): number {
  const [, , command, ...rest] = argv;

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

  if (command === "project") {
    return runProjectCommand(rest, io);
  }

  if (command === "doctor" || command === "next") {
    return runNameOrPathCommand(command, rest, io);
  }

  return runLegacyTargetCommand(command, rest, io);
}

function runLegacyTargetCommand(
  command: LegacyTargetCommandName,
  rest: string[],
  io: CliIo
): number {
  const [targetPath, ...flags] = rest;
  const dryRun = flags.includes("--dry-run");

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

function runNameOrPathCommand(
  command: NameOrPathCommandName,
  rest: string[],
  io: CliIo
): number {
  const [nameOrPath] = rest;

  if (!nameOrPath) {
    io.error(`Missing project name or path for command: ${command}`);
    printUsage(io);
    return 1;
  }

  const orchestratorRoot = resolveOrchestratorRoot();

  if (command === "doctor") {
    runDoctorCommand({ orchestratorRoot, nameOrPath, io });
    return 0;
  }

  runNextCommand({ orchestratorRoot, nameOrPath, io });
  return 0;
}

function runProjectCommand(rest: string[], io: CliIo): number {
  const [subcommand, ...subArgs] = rest;
  const orchestratorRoot = resolveOrchestratorRoot();

  if (!subcommand) {
    io.error("Missing project subcommand.");
    printUsage(io);
    return 1;
  }

  if (subcommand === "add") {
    const [targetPath, ...flags] = subArgs;
    if (!targetPath) {
      io.error("Missing target repository for command: project add");
      printUsage(io);
      return 1;
    }
    const name = readRequiredFlagValue(flags, "--name");
    runProjectAddCommand({ orchestratorRoot, targetPath, name, io });
    return 0;
  }

  if (subcommand === "list") {
    runProjectListCommand({ orchestratorRoot, io });
    return 0;
  }

  if (subcommand === "remove") {
    const [name] = subArgs;
    if (!name) {
      io.error("Missing project name for command: project remove");
      printUsage(io);
      return 1;
    }
    runProjectRemoveCommand({ orchestratorRoot, name, io });
    return 0;
  }

  if (subcommand === "inspect") {
    const [nameOrPath] = subArgs;
    if (!nameOrPath) {
      io.error("Missing project name or path for command: project inspect");
      printUsage(io);
      return 1;
    }
    runProjectInspectCommand({ orchestratorRoot, nameOrPath, io });
    return 0;
  }

  io.error(`Unknown project subcommand: ${subcommand}`);
  printUsage(io);
  return 1;
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
  return (
    command === "inspect" ||
    command === "install" ||
    command === "init-feature" ||
    command === "project" ||
    command === "doctor" ||
    command === "next"
  );
}

function printUsage(io: CliIo): void {
  io.log("Usage:");
  io.log("  agentic-sdd inspect <target-repo>");
  io.log("  agentic-sdd install <target-repo> [--dry-run]");
  io.log("  agentic-sdd init-feature <target-repo> --issue <number> --slug <slug> --title <title>");
  io.log("  agentic-sdd project add <target-repo> --name <name>");
  io.log("  agentic-sdd project list");
  io.log("  agentic-sdd project remove <name>");
  io.log("  agentic-sdd project inspect <name-or-target-repo>");
  io.log("  agentic-sdd doctor <name-or-target-repo>");
  io.log("  agentic-sdd next <name-or-target-repo>");
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
