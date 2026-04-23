import type { SkillDefinition, SkillContext } from './types.js';
import type { SkillResult, Route } from '../types.js';
import { registerSkill } from './runner.js';

function matchRoute(route: Route, query: string): boolean {
  const q = query.toLowerCase();
  return (
    route.name.toLowerCase() === q ||
    route.name.toLowerCase().includes(q) ||
    route.path.toLowerCase() === q ||
    route.path.toLowerCase().includes(q) ||
    (route.controller?.toLowerCase().includes(q) ?? false)
  );
}

function similarity(a: string, b: string): number {
  const al = a.toLowerCase();
  const bl = b.toLowerCase();
  if (al === bl) return 1;
  if (al.includes(bl) || bl.includes(al)) return 0.6;
  let matches = 0;
  const shorter = al.length < bl.length ? al : bl;
  const longer = al.length < bl.length ? bl : al;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }
  return matches / longer.length;
}

function findSimilarRoutes(routes: Route[], query: string, threshold = 0.4): Route[] {
  return routes
    .map(r => ({ route: r, score: Math.max(similarity(r.name, query), similarity(r.path, query)) }))
    .filter(x => x.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .map(x => x.route);
}

export const routeDebugSkill: SkillDefinition = {
  name: 'route-debug',
  description: 'Debug routes, controllers, and access issues',
  config: {
    name: 'route-debug',
    description: 'Debug routes, controllers, and access issues',
    inputType: 'query',
    requiredTopics: [],
  },

  async execute(ctx: SkillContext): Promise<SkillResult> {
    const query = ctx.query ?? '';
    const routes = ctx.brainData.routes;
    const matched = routes.filter(r => matchRoute(r, query));

    if (matched.length > 0) {
      const files = [...new Set(matched.map(r => r.file ?? r.controller?.split('::')[0]).filter(Boolean) as string[])];
      const actions: string[] = [];
      actions.push(`Verify controller exists for: ${matched.map(r => r.name).join(', ')}`);
      actions.push(...matched.map(r => `Check security config for ${r.name} (${r.path})`));
      actions.push(...files.map(f => `Check template for ${f}`));

      const risks: string[] = [];
      matched.forEach(r => {
        if (!r.methods || r.methods.length === 0) risks.push(`Route ${r.name} has no HTTP methods defined`);
        if (!r.controller) risks.push(`Route ${r.name} has no controller`);
      });

      return {
        goal: `Debug route: ${query}`,
        topic: 'routing',
        files,
        actions,
        risks,
        next: 'Check the controller file',
      };
    }

    const similar = findSimilarRoutes(routes, query);
    const risks: string[] = [
      `Route not found: ${query}`,
    ];
    if (similar.length > 0) {
      risks.push(`Did you mean: ${similar.slice(0, 3).map(r => r.name).join(', ')}?`);
    }

    return {
      goal: `Debug route: ${query}`,
      topic: 'routing',
      files: [],
      actions: [],
      risks,
      next: 'Check the controller file',
    };
  },
};

registerSkill(routeDebugSkill);
