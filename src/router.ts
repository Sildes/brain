import type { TopicIndex, RouterEntry } from "./types.js";

// Lightweight term extraction (mirrors discover.ts splitTerms + normalizeTerm)
function extractKeywords(input: string): string[] {
  return input
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_\-./\\::{}()\[\]]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2)
    .map(t => t.toLowerCase());
}

// Framework-specific keyword→skill mapping
const FRAMEWORK_KEYWORDS: Record<string, Record<string, { topic: string; skill: string }>> = {
  symfony: {
    admin: { topic: 'admin', skill: 'symfony-review' },
    sonata: { topic: 'admin', skill: 'symfony-review' },
    role_admin: { topic: 'admin', skill: 'symfony-review' },
    user: { topic: 'user', skill: 'symfony-review' },
    activity: { topic: 'activity', skill: 'symfony-review' },
    audit: { topic: 'activity', skill: 'symfony-review' },
    logger: { topic: 'activity', skill: 'symfony-review' },
    subscriber: { topic: 'activity', skill: 'symfony-review' },
    twig: { topic: 'asset', skill: 'twig-inline-css' },
    css: { topic: 'asset', skill: 'twig-inline-css' },
    inline_style: { topic: 'asset', skill: 'twig-inline-css' },
    template: { topic: 'asset', skill: 'twig-inline-css' },
    route: { topic: 'routing', skill: 'route-debug' },
    controller: { topic: 'routing', skill: 'route-debug' },
    '404': { topic: 'routing', skill: 'route-debug' },
  },
  laravel: {
    controller: { topic: 'routing', skill: 'symfony-review' },
    route: { topic: 'routing', skill: 'route-debug' },
    migration: { topic: 'database', skill: 'repo-map' },
  },
  nextjs: {
    page: { topic: 'pages', skill: 'repo-map' },
    api: { topic: 'api', skill: 'repo-map' },
    component: { topic: 'components', skill: 'repo-map' },
  },
  generic: {},
};

interface Hit {
  topic: string;
  skill: string;
  score: number;
  keywords: string[];
  paths: string[];
}

export function routeTask(
  input: string,
  topicIndex: TopicIndex,
  framework: string,
): RouterEntry | null {
  const inputKeywords = extractKeywords(input);
  const keywordMap = FRAMEWORK_KEYWORDS[framework] || FRAMEWORK_KEYWORDS.generic;

  // Phase 1: Match against built-in keyword map
  const builtInHits: Hit[] = [];
  for (const inputKw of inputKeywords) {
    for (const [mapKw, mapping] of Object.entries(keywordMap)) {
      if (inputKw.includes(mapKw) || mapKw.includes(inputKw)) {
        builtInHits.push({ ...mapping, score: 0.9, keywords: [], paths: [] });
      }
    }
  }

  // Phase 2: Match against topic index
  const topicHits: Hit[] = [];
  for (const [name, entry] of Object.entries(topicIndex.topics)) {
    let keywordScore = 0;
    let pathScore = 0;
    const matchedKeywords: string[] = [];

    for (const kw of inputKeywords) {
      if (entry.keywords.some(ekw => ekw === kw || ekw.includes(kw) || kw.includes(ekw))) {
        keywordScore += 0.4;
        matchedKeywords.push(kw);
      }
    }

    for (const p of entry.paths) {
      if (inputKeywords.some(ikw => p.toLowerCase().includes(ikw))) {
        pathScore += 0.6;
      }
    }

    const totalScore = keywordScore + pathScore;
    if (totalScore > 0) {
      topicHits.push({
        topic: name,
        skill: entry.defaultSkill,
        score: totalScore,
        keywords: matchedKeywords,
        paths: entry.paths,
      });
    }
  }

  // Phase 3: Diff boost
  const hasDiffMention = inputKeywords.some(kw => ['diff', 'git'].includes(kw));

  // Merge and find best
  const allHits: Hit[] = [...builtInHits, ...topicHits];

  if (allHits.length === 0) return null;

  // Deduplicate by topic, keep highest score
  const bestByTopic = new Map<string, Hit>();
  for (const hit of allHits) {
    const existing = bestByTopic.get(hit.topic);
    if (!existing || hit.score > existing.score) {
      bestByTopic.set(hit.topic, hit);
    }
  }

  // Return highest scoring
  const sorted = [...bestByTopic.values()].sort((a, b) => b.score - a.score);
  const best = sorted[0];

  if (best.score < 0.4) return null; // threshold

  let finalSkill = best.skill;
  if (hasDiffMention && best.skill !== 'diff-only') {
    finalSkill = 'diff-only';
  }

  return {
    keywords: best.keywords,
    paths: best.paths,
    topic: best.topic,
    skill: finalSkill,
    score: best.score,
  };
}
