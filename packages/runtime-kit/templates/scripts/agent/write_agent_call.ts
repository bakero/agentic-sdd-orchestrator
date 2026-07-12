import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import {
  formatAgentCallLine,
  validateAgentCallEntry,
  type AgentCallEntry,
} from "./lib/agent_call";

export { formatAgentCallLine, validateAgentCallEntry } from "./lib/agent_call";
export type { AgentCallEntry } from "./lib/agent_call";

const LOG_PATH = "docs/metrics/agent_calls.jsonl";

export function appendAgentCall(
  entry: AgentCallEntry,
  logPath: string = LOG_PATH,
): void {
  const dir = dirname(logPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  appendFileSync(logPath, formatAgentCallLine(entry), "utf8");
}

export function runCli(argv: string[] = process.argv.slice(2)): number {
  const repoRoot = process.cwd();
  const inputArg = argv.find((arg) => arg.startsWith("--entry="))?.split("=")[1];

  let entry: AgentCallEntry;
  try {
    const raw = inputArg
      ? readFileSync(inputArg, "utf8")
      : readFileSync(0, "utf8");
    entry = JSON.parse(raw) as AgentCallEntry;
  } catch (error) {
    console.error(
      "write_agent_call requires a JSON entry on stdin or via --entry=<file>.",
    );
    console.error(String(error));
    return 1;
  }

  const shapeErrors = validateAgentCallEntry(entry);
  if (shapeErrors.length > 0) {
    console.error("Agent call entry failed validation:");
    for (const error of shapeErrors) {
      console.error(`  - ${error}`);
    }
    return 1;
  }

  appendAgentCall(entry, join(repoRoot, LOG_PATH));
  return 0;
}

const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  process.exitCode = runCli();
}
