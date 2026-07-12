import {
  isNoneBullet,
  isPlaceholder,
  parseBullets,
  parseFrontmatter,
  parseKeyValueLines,
  parsePathBullets,
  parseSections,
  parseTable,
} from "./markdown";

export interface CostRecommendation {
  recommendedAgent: string;
  recommendedModelMode: string;
  reasoningLevel: string;
  opusplan: string;
  contextBudget: string;
  rationale: string;
}

export interface ContextPack {
  nextAgent: string;
  requiredReading: string[];
  optionalReading: string[];
  doNotReadByDefault: string[];
  relevantCodeAreas: string[];
  relevantTests: string[];
  knownConstraints: string[];
  openQuestions: string[];
  reasonForSelectedContext: string;
}

export interface AgentCostLogRow {
  cells: Record<string, string>;
}

export interface ParsedStatusDoc {
  frontmatter: Record<string, string | number | boolean | null>;
  hasCurrentSummary: boolean;
  hasChecklist: boolean;
  hasBlockingIssues: boolean;
  costRecommendation: CostRecommendation | null;
  contextPack: ContextPack | null;
  agentCostLog: { headers: string[]; rows: AgentCostLogRow[] } | null;
}

const COST_RECOMMENDATION_HEADING = "Next Agent Cost Recommendation";
const CONTEXT_PACK_HEADING = "Context Pack for Next Agent";
const AGENT_COST_LOG_HEADING = "Agent Cost Log";

export function parseStatusDoc(content: string): ParsedStatusDoc {
  const { frontmatter, body } = parseFrontmatter(content);
  const sections = parseSections(body);

  const costSection = sections[COST_RECOMMENDATION_HEADING];
  const costRecommendation = costSection
    ? parseCostRecommendation(costSection.content)
    : null;

  const contextPackSection = sections[CONTEXT_PACK_HEADING];
  const contextPack = contextPackSection
    ? parseContextPack(contextPackSection.subsections)
    : null;

  const costLogSection = sections[AGENT_COST_LOG_HEADING];
  const table = costLogSection ? parseTable(costLogSection.content) : null;
  const agentCostLog = table
    ? {
        headers: table.headers,
        rows: table.rows.map((cells) => ({
          cells: Object.fromEntries(
            table.headers.map((header, index) => [header, cells[index] ?? ""]),
          ),
        })),
      }
    : null;

  return {
    frontmatter,
    hasCurrentSummary: Boolean(sections["Current summary"]),
    hasChecklist: Boolean(sections.Checklist),
    hasBlockingIssues: Boolean(sections["Blocking issues"]),
    costRecommendation,
    contextPack,
    agentCostLog,
  };
}

function parseCostRecommendation(text: string): CostRecommendation {
  const kv = parseKeyValueLines(text);
  return {
    recommendedAgent: kv["Recommended agent"] ?? "",
    recommendedModelMode: kv["Recommended model/mode"] ?? "",
    reasoningLevel: kv["Reasoning level"] ?? "",
    opusplan: kv.Opusplan ?? "",
    contextBudget: kv["Context budget"] ?? "",
    rationale: kv.Rationale ?? "",
  };
}

function parseContextPack(
  subsections: Record<string, string>,
): ContextPack {
  return {
    nextAgent: (subsections["Next agent"] ?? "").trim(),
    requiredReading: parsePathBullets(subsections["Required reading"]),
    optionalReading: parsePathBullets(subsections["Optional reading"]),
    doNotReadByDefault: parseBullets(subsections["Do not read by default"]),
    relevantCodeAreas: parseBullets(
      subsections["Relevant code areas to inspect"],
    ),
    relevantTests: parseBullets(
      subsections["Relevant tests to inspect or run"],
    ),
    knownConstraints: parseBullets(subsections["Known constraints"]),
    openQuestions: parseBullets(subsections["Open questions"]),
    reasonForSelectedContext: (
      subsections["Reason for selected context"] ?? ""
    ).trim(),
  };
}

export function isBulletListValid(bullets: string[]): boolean {
  if (bullets.length === 0) return false;
  if (isNoneBullet(bullets)) return true;
  return bullets.every((bullet) => !isPlaceholder(bullet));
}
