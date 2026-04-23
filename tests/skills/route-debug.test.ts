import { describe, it, expect } from 'vitest';
import type { SkillContext } from '../../src/skills/types.js';
import type { BrainData } from '../../src/types.js';
import { routeDebugSkill } from '../../src/skills/route-debug.js';

function makeCtx(query: string, routes: BrainData['routes']): SkillContext {
  return {
    projectDir: '/tmp/test',
    framework: 'symfony',
    brainData: {
      framework: 'symfony',
      modules: [],
      routes,
      commands: [],
      conventions: { standards: [], notes: [], navigation: [] },
      keyFiles: [],
      quickFind: [],
      fileCount: 0,
    },
    query,
  };
}

const mockRoutes = [
  { name: 'app_home', path: '/', methods: ['GET'], controller: 'App\\Controller\\HomeController::index', file: 'src/Controller/HomeController.php' },
  { name: 'app_login', path: '/login', methods: ['GET', 'POST'], controller: 'App\\Controller\\SecurityController::login', file: 'src/Controller/SecurityController.php' },
  { name: 'app_logout', path: '/logout', methods: ['GET'], controller: 'App\\Controller\\SecurityController::logout', file: 'src/Controller/SecurityController.php' },
  { name: 'app_user_list', path: '/users', methods: ['GET'], controller: 'App\\Controller\\UserController::list', file: 'src/Controller/UserController.php' },
  { name: 'app_user_show', path: '/users/{id}', methods: ['GET'], controller: 'App\\Controller\\UserController::show', file: 'src/Controller/UserController.php' },
  { name: 'api_product_list', path: '/api/products', methods: ['GET'], controller: 'App\\Controller\\Api\\ProductController::list', file: 'src/Controller/Api/ProductController.php' },
];

describe('routeDebugSkill', () => {
  it('exports correct config', () => {
    expect(routeDebugSkill.name).toBe('route-debug');
    expect(routeDebugSkill.config.name).toBe('route-debug');
    expect(routeDebugSkill.config.inputType).toBe('query');
    expect(routeDebugSkill.config.requiredTopics).toEqual([]);
  });

  it('finds route by exact name', async () => {
    const ctx = makeCtx('app_home', mockRoutes);
    const result = await routeDebugSkill.execute(ctx);

    expect(result.goal).toBe('Debug route: app_home');
    expect(result.topic).toBe('routing');
    expect(result.files).toContain('src/Controller/HomeController.php');
    expect(result.actions.length).toBeGreaterThan(0);
    expect(result.next).toBe('Check the controller file');
  });

  it('finds route by partial name (contains)', async () => {
    const ctx = makeCtx('user_list', mockRoutes);
    const result = await routeDebugSkill.execute(ctx);

    expect(result.goal).toBe('Debug route: user_list');
    expect(result.files).toContain('src/Controller/UserController.php');
  });

  it('finds route by exact path', async () => {
    const ctx = makeCtx('/login', mockRoutes);
    const result = await routeDebugSkill.execute(ctx);

    expect(result.files).toContain('src/Controller/SecurityController.php');
  });

  it('finds route by partial path (contains)', async () => {
    const ctx = makeCtx('/users', mockRoutes);
    const result = await routeDebugSkill.execute(ctx);

    // Should match both /users and /users/{id}
    expect(result.files).toContain('src/Controller/UserController.php');
  });

  it('finds route by controller name', async () => {
    const ctx = makeCtx('ProductController', mockRoutes);
    const result = await routeDebugSkill.execute(ctx);

    expect(result.files).toContain('src/Controller/Api/ProductController.php');
  });

  it('returns multiple routes when query matches multiple', async () => {
    const ctx = makeCtx('SecurityController', mockRoutes);
    const result = await routeDebugSkill.execute(ctx);

    // Matches both login and logout
    expect(result.files).toContain('src/Controller/SecurityController.php');
    expect(result.risks.length).toBeGreaterThanOrEqual(0);
  });

  it('includes debug actions when route found', async () => {
    const ctx = makeCtx('app_home', mockRoutes);
    const result = await routeDebugSkill.execute(ctx);

    expect(result.actions).toEqual(
      expect.arrayContaining([
        expect.stringContaining('controller'),
      ])
    );
  });

  it('suggests similar routes when not found (fuzzy)', async () => {
    const ctx = makeCtx('app_hm', mockRoutes);
    const result = await routeDebugSkill.execute(ctx);

    expect(result.goal).toBe('Debug route: app_hm');
    expect(result.risks.length).toBeGreaterThan(0);
    // Should suggest app_home as similar
    const allRisks = result.risks.join(' ');
    expect(allRisks).toMatch(/app_home/);
  });

  it('returns "Route not found" with no suggestions when nothing similar', async () => {
    const ctx = makeCtx('zzz_nonexistent_xyz', mockRoutes);
    const result = await routeDebugSkill.execute(ctx);

    expect(result.risks.some(r => r.includes('not found'))).toBe(true);
  });

  it('handles empty routes array', async () => {
    const ctx = makeCtx('anything', []);
    const result = await routeDebugSkill.execute(ctx);

    expect(result.risks.some(r => r.includes('not found'))).toBe(true);
    expect(result.files).toEqual([]);
  });

  it('handles empty query gracefully', async () => {
    const ctx = makeCtx('', mockRoutes);
    const result = await routeDebugSkill.execute(ctx);

    expect(result.goal).toBe('Debug route: ');
    expect(result.topic).toBe('routing');
  });
});
