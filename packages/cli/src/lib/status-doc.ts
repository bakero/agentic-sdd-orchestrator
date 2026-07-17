import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export type StatusFrontmatter = {
  currentState: string | null;
  currentAgent: string | null;
  nextAgent: string | null;
};

const FRONTMATTER_DELIMITER = "---";

/**
 * Minimal frontmatter reader for a feature's status.md. Deliberately
 * separate from packages/runtime-kit/templates/scripts/agent/lib/markdown.ts
 * (that file is a versioned template copied into target repos, not a
 * dependency of the orchestrator CLI itself - see tsconfig.json's
 * exclude list). Only reads the handful of fields a handoff needs.
 */
export function readStatusFrontmatter(statusMarkdownPath: string): StatusFrontmatter {
  if (!existsSync(statusMarkdownPath)) {
    return { currentState: null, currentAgent: null, nextAgent: null };
  }

  const content = readFileSync(statusMarkdownPath, "utf8").replace(/\r\n/g, "\n");
  const lines = content.split("\n");

  if (lines[0]?.trim() !== FRONTMATTER_DELIMITER) {
    return { currentState: null, currentAgent: null, nextAgent: null };
  }

  let endIndex = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i]?.trim() === FRONTMATTER_DELIMITER) {
      endIndex = i;
      break;
    }
  }
  if (endIndex === -1) {
    return { currentState: null, currentAgent: null, nextAgent: null };
  }

  const fields: Record<string, string> = {};
  for (const line of lines.slice(1, endIndex)) {
    const match = /^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/.exec(line);
    if (!match) continue;
    fields[match[1]] = match[2].trim();
  }

  return {
    currentState: fields.current_state || null,
    currentAgent: fields.current_agent || null,
    nextAgent: fields.next_agent || null,
  };
}

export function statusMarkdownPath(featureFolderPath: string): string {
  return path.join(featureFolderPath, "status.md");
}
