import { resolveProjectNameOrPath } from "../lib/project-registry.js";
import { runDoctor, type DoctorReport } from "../lib/doctor.js";

export type DoctorCliIo = {
  log: (message: string) => void;
  error: (message: string) => void;
};

export type DoctorCommandOptions = {
  orchestratorRoot: string;
  nameOrPath: string;
  io: DoctorCliIo;
};

export function runDoctorCommand(options: DoctorCommandOptions): DoctorReport {
  const resolved = resolveProjectNameOrPath(options.orchestratorRoot, options.nameOrPath);
  const report = runDoctor(resolved.targetPath);

  options.io.log("Agentic SDD doctor");
  options.io.log("");
  options.io.log(`Project: ${resolved.name ?? "(not registered - direct path)"}`);
  options.io.log(`Path: ${report.diagnostics.target.targetPath}`);
  options.io.log("");

  for (const check of report.checks) {
    options.io.log(`[${check.status}] ${check.label} - ${check.detail}`);
  }

  options.io.log("");
  options.io.log(`Overall status: ${report.overallStatus}`);
  options.io.log("");
  options.io.log("Recommended next command:");
  options.io.log(`  ${report.nextAction.command ?? "(none - resolve the failure above first)"}`);
  options.io.log(`Why: ${report.nextAction.reason}`);

  return report;
}
