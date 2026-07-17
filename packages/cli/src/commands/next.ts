import { resolveProjectNameOrPath } from "../lib/project-registry.js";
import { runDoctor, type DoctorReport } from "../lib/doctor.js";

export type NextCliIo = {
  log: (message: string) => void;
  error: (message: string) => void;
};

export type NextCommandOptions = {
  orchestratorRoot: string;
  nameOrPath: string;
  io: NextCliIo;
};

/**
 * Reads-only recommendation of the single most important next safe action
 * for a target repository. Reuses the same diagnostic logic as `doctor`
 * (via runDoctor) so the two commands never disagree; this command never
 * executes the recommended action, calls an AI model, or modifies files.
 */
export function runNextCommand(options: NextCommandOptions): DoctorReport {
  const resolved = resolveProjectNameOrPath(options.orchestratorRoot, options.nameOrPath);
  const report = runDoctor(resolved.targetPath);

  options.io.log("Agentic SDD next action");
  options.io.log("");
  options.io.log(`Project: ${resolved.name ?? "(not registered - direct path)"}`);
  options.io.log(`Next action: ${report.nextAction.summary}`);
  if (report.nextAction.command) {
    options.io.log(`Run: ${report.nextAction.command}`);
  }
  options.io.log(`Why: ${report.nextAction.reason}`);

  if (report.overallStatus === "READY" || report.overallStatus === "CHECK_WARNINGS") {
    options.io.log("");
    options.io.log("Also available: generate a full Cowork handoff for this project (v0.5).");
    options.io.log(`  npm run agentic-sdd -- handoff generate ${options.nameOrPath}`);
  }

  return report;
}
