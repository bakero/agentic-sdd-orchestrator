export interface ParsedDocument {
  frontmatter: Record<string, string | number | boolean | null>;
  body: string;
}

const FRONTMATTER_DELIMITER = "---";

export function parseFrontmatter(content: string): ParsedDocument {
  const normalized = content.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");

  if (lines[0]?.trim() !== FRONTMATTER_DELIMITER) {
    return { frontmatter: {}, body: normalized };
  }

  let endIndex = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i]?.trim() === FRONTMATTER_DELIMITER) {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    return { frontmatter: {}, body: normalized };
  }

  const frontmatter: Record<string, string | number | boolean | null> = {};
  for (const line of lines.slice(1, endIndex)) {
    const match = /^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/.exec(line);
    if (!match) continue;
    const key = match[1];
    frontmatter[key] = coerceScalar(match[2].trim());
  }

  const body = lines.slice(endIndex + 1).join("\n");
  return { frontmatter, body };
}

function coerceScalar(raw: string): string | number | boolean | null {
  const unquoted = raw.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
  if (unquoted === "") return null;
  if (unquoted === "true") return true;
  if (unquoted === "false") return false;
  if (unquoted === "null" || unquoted === "~") return null;
  if (/^-?\d+$/.test(unquoted)) return Number.parseInt(unquoted, 10);
  return unquoted;
}

export interface SectionMap {
  [heading: string]: {
    content: string;
    subsections: { [subheading: string]: string };
  };
}

export function parseSections(body: string): SectionMap {
  const normalized = body.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");

  const sections: SectionMap = {};
  let currentHeading: string | null = null;
  let currentLines: string[] = [];

  const flush = () => {
    if (currentHeading === null) return;
    const content = currentLines.join("\n");
    sections[currentHeading] = {
      content,
      subsections: parseSubsections(content),
    };
  };

  for (const line of lines) {
    const h2 = /^##\s+(.+?)\s*$/.exec(line);
    if (h2) {
      flush();
      currentHeading = h2[1].trim();
      currentLines = [];
      continue;
    }
    if (currentHeading !== null) {
      currentLines.push(line);
    }
  }
  flush();

  return sections;
}

function parseSubsections(content: string): { [subheading: string]: string } {
  const lines = content.split("\n");
  const subsections: { [subheading: string]: string } = {};
  let currentHeading: string | null = null;
  let currentLines: string[] = [];

  const flush = () => {
    if (currentHeading === null) return;
    subsections[currentHeading] = currentLines.join("\n").trim();
  };

  for (const line of lines) {
    const h3 = /^###\s+(.+?)\s*$/.exec(line);
    if (h3) {
      flush();
      currentHeading = h3[1].trim();
      currentLines = [];
      continue;
    }
    if (currentHeading !== null) {
      currentLines.push(line);
    }
  }
  flush();

  return subsections;
}

const PLACEHOLDER_VALUES = new Set(["", "pending", "pending.", "tbd", "tbd."]);

export function isPlaceholder(value: string | undefined | null): boolean {
  if (value === undefined || value === null) return true;
  return PLACEHOLDER_VALUES.has(value.trim().toLowerCase());
}

export function parseBullets(text: string | undefined): string[] {
  if (!text) return [];
  const trimmed = text.trim();
  if (trimmed.toLowerCase() === "none.") return ["None."];

  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim())
    .filter((line) => line.length > 0);
}

/**
 * Extracts a normalized repo-relative file path from a single Context Pack
 * bullet, stripping Markdown code-span backticks and any trailing
 * parenthetical/prose annotation (e.g. "`path/file.md` (DEC-010
 * especially)" -> "path/file.md"). Returns null when the bullet has no
 * path-shaped token, so callers can drop pure-prose bullets instead of
 * writing commentary into a machine-readable file list.
 */
export function extractPathFromBullet(bullet: string): string | null {
  const backticked = /`([^`]+)`/.exec(bullet);
  const candidate = (backticked ? backticked[1] : bullet).trim();
  const withoutParenthetical = candidate.replace(/\s*\([^)]*\)\s*$/, "").trim();
  const pathLike = /^[\w./-]+$/;
  if (!withoutParenthetical || !pathLike.test(withoutParenthetical)) {
    return null;
  }
  return withoutParenthetical;
}

/**
 * Parses a Context Pack bullet list into normalized repo-relative paths
 * only, one per entry, dropping non-path explanatory bullets entirely
 * rather than passing prose/labels through to machine-readable output.
 */
export function parsePathBullets(text: string | undefined): string[] {
  return parseBullets(text)
    .map((bullet) => extractPathFromBullet(bullet))
    .filter((path): path is string => path !== null);
}

export function isNoneBullet(bullets: string[]): boolean {
  return bullets.length === 1 && bullets[0].trim().toLowerCase() === "none.";
}

export function parseKeyValueLines(
  text: string | undefined,
): Record<string, string> {
  if (!text) return {};
  const result: Record<string, string> = {};
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = /^([A-Za-z][A-Za-z /_-]*?):\s*(.*)$/.exec(line);
    if (!match) continue;
    result[match[1].trim()] = match[2].trim().replace(/\s{2,}$/, "");
  }
  return result;
}

export interface ParsedTable {
  headers: string[];
  rows: string[][];
}

export function parseTable(text: string | undefined): ParsedTable | null {
  if (!text) return null;
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|"));

  if (lines.length < 2) return null;

  const splitRow = (line: string) =>
    line
      .slice(1, line.endsWith("|") ? -1 : undefined)
      .split("|")
      .map((cell) => cell.trim());

  const headers = splitRow(lines[0]);
  const rows = lines.slice(2).map(splitRow);

  return { headers, rows };
}
