import path from "node:path";
import { diagnoseTargetRepo, type FeatureFolderReport } from "./diagnostics.js";
import { readStatusFrontmatter, statusMarkdownPath } from "./status-doc.js";

export type ResolvedFeature = {
  id: string;
  slug: string;
  path: string;
  currentState: string | null;
  currentAgent: string | null;
  nextAgent: string | null;
};

export type ResolveFeatureError = {
  ok: false;
  reason: "no_feature" | "multiple_features";
  message: string;
  candidates: FeatureFolderReport[];
};

export type ResolveFeatureSuccess = {
  ok: true;
  feature: ResolvedFeature;
};

/**
 * Resolves which feature folder a handoff should target, reusing the same
 * feature-folder detection diagnostics already used by doctor/next/project
 * inspect so this stays consistent with the rest of the CLI instead of
 * re-implementing folder scanning.
 */
export function resolveFeature(
  targetPath: string,
  requestedFeatureId: string | undefined
): ResolveFeatureError | ResolveFeatureSuccess {
  const diagnostics = diagnoseTargetRepo(targetPath);
  const featureFolders = diagnostics.featureFolders;

  if (featureFolders.length === 0) {
    return {
      ok: false,
      reason: "no_feature",
      message: `No feature folders found under docs/features/ in ${targetPath}.`,
      candidates: [],
    };
  }

  let selected: FeatureFolderReport | undefined;

  if (requestedFeatureId) {
    selected = featureFolders.find((feature) => feature.featureId === requestedFeatureId);
    if (!selected) {
      return {
        ok: false,
        reason: "no_feature",
        message: `Feature "${requestedFeatureId}" was not found under docs/features/ in ${targetPath}.`,
        candidates: featureFolders,
      };
    }
  } else if (featureFolders.length === 1) {
    selected = featureFolders[0];
  } else {
    return {
      ok: false,
      reason: "multiple_features",
      message: `Multiple feature folders found under docs/features/ in ${targetPath}. Pass --feature <id> to choose one.`,
      candidates: featureFolders,
    };
  }

  const featureFolderPath = path.join(targetPath, "docs", "features", selected.featureId);
  const frontmatter = selected.hasStatusMarkdown
    ? readStatusFrontmatter(statusMarkdownPath(featureFolderPath))
    : { currentState: null, currentAgent: null, nextAgent: null };

  const [id, ...slugParts] = selected.featureId.split("-");

  return {
    ok: true,
    feature: {
      id: selected.featureId,
      slug: slugParts.join("-"),
      path: featureFolderPath,
      currentState: frontmatter.currentState,
      currentAgent: frontmatter.currentAgent,
      nextAgent: frontmatter.nextAgent,
    },
  };
}

export { type FeatureFolderReport } from "./diagnostics.js";
