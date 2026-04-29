import type { Topic } from './types.js';

export interface TopicDependencies {
  dependsOn: string[];
  relatedTo: string[];
}

/**
 * Computes keyword-based topic dependencies.
 * - relatedTo: symmetric, inferred from keyword overlap (> 0.3)
 * - dependsOn: ALWAYS empty (reserved for LLM enrichment)
 */
export function computeTopicDependencies(
  topics: Topic[],
): Map<string, TopicDependencies> {
  const deps = new Map<string, TopicDependencies>();

  for (const topic of topics) {
    deps.set(topic.name, { dependsOn: [], relatedTo: [] });
  }

  for (let i = 0; i < topics.length; i++) {
    for (let j = i + 1; j < topics.length; j++) {
      const topicA = topics[i];
      const topicB = topics[j];

      const overlap = computeKeywordOverlap(topicA.keywords, topicB.keywords);

      if (overlap > 0.3) {
        deps.get(topicA.name)!.relatedTo.push(topicB.name);
        deps.get(topicB.name)!.relatedTo.push(topicA.name);
      }
    }
  }

  return deps;
}

/**
 * Merges LLM-inferred dependencies with static dependencies.
 * - LLM dependsOn: validated against validTopicNames, invalid entries dropped
 * - relatedTo: union of both sources, deduplicated
 * - Returns new map (inputs not mutated)
 */
export function mergeDependencies(
  existing: Map<string, TopicDependencies>,
  llmInferred: Map<string, TopicDependencies>,
  validTopicNames: Set<string>,
): Map<string, TopicDependencies> {
  const merged = new Map<string, TopicDependencies>();

  for (const [name, deps] of existing) {
    merged.set(name, {
      dependsOn: [...deps.dependsOn],
      relatedTo: [...deps.relatedTo],
    });
  }

  for (const [name, llmDeps] of llmInferred) {
    const current = merged.get(name);

    if (!current) {
      const validDependsOn = llmDeps.dependsOn.filter((dep) =>
        validTopicNames.has(dep),
      );
      merged.set(name, {
        dependsOn: validDependsOn,
        relatedTo: [...llmDeps.relatedTo],
      });
      continue;
    }

    const validDependsOn = llmDeps.dependsOn.filter((dep) =>
      validTopicNames.has(dep),
    );

    merged.set(name, {
      dependsOn: [...new Set([...current.dependsOn, ...validDependsOn])],
      relatedTo: [...new Set([...current.relatedTo, ...llmDeps.relatedTo])],
    });
  }

  return merged;
}

function computeKeywordOverlap(keywordsA: string[], keywordsB: string[]): number {
  if (keywordsA.length === 0 || keywordsB.length === 0) {
    return 0;
  }

  const setA = new Set(keywordsA);
  const intersection = keywordsB.filter((k) => setA.has(k)).length;
  const minSize = Math.min(keywordsA.length, keywordsB.length);

  return intersection / minSize;
}

export function parseDependenciesFromTopic(
  content: string,
  validTopicNames: Set<string>,
): TopicDependencies {
  const result: TopicDependencies = { dependsOn: [], relatedTo: [] };
  const lines = content.split('\n');
  let inDepsSection = false;

  for (const line of lines) {
    if (line.match(/^##\s+/)) {
      inDepsSection = /^##\s+dependencies/i.test(line);
      continue;
    }

    if (!inDepsSection) continue;

    const match = line.match(/^(-\s+)?(depends_on|related_to):\s*(.*)/i);
    if (match) {
      const field = match[2].toLowerCase() === 'depends_on' ? 'dependsOn' : 'relatedTo';
      const items = match[3].split(/,\s*|\s*-\s*/).map(s => s.trim()).filter(Boolean);
      for (const item of items) {
        if (validTopicNames.has(item) && !result[field].includes(item)) {
          result[field].push(item);
        }
      }
    }

    if (line.trim().startsWith('- ')) {
      const val = line.trim().substring(2).trim();
      if (validTopicNames.has(val) && !result.dependsOn.includes(val) && !result.relatedTo.includes(val)) {
        if (result.dependsOn.length <= result.relatedTo.length) {
          result.dependsOn.push(val);
        } else {
          result.relatedTo.push(val);
        }
      }
    }
  }

  return result;
}
