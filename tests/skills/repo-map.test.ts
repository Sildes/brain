import { describe, it, expect, beforeEach, vi } from 'vitest';
import { repoMapSkill, parseBrainMd, setReadFileFn, resetReadFileFn } from '../../src/skills/repo-map.js';
import { clearSkills, runSkill, registerSkill } from '../../src/skills/runner.js';
import type { SkillContext } from '../../src/skills/types.js';

const BRAIN_MD_FULL = `# 🧠 Project Brain
> Generated: 2026-04-23T10:00:00Z · symfony · 150 files

## At a Glance
- **Modules**: User, Order, Payment
- **Routes**: 45 HTTP endpoints
- **Commands**: 12 CLI commands
- **Key Files**: 8 identified

## Modules

### User
- **Path**: \`src/Module/User/\`
- **Depends on**: \`Auth\`

### Order
- **Path**: \`src/Module/Order/\`
- **Depends on**: \`User\`, \`Payment\`

### Payment
- **Path**: \`src/Module/Payment/\`

## Routes

Total: 45 (40 business, 5 technical)

### User
| Route | Method | Path |
|-------|--------|------|
| user_list | GET | \`/api/users\` |
| user_create | POST | \`/api/users\` |

CLI: \`php bin/console debug:router\` for full list

## Navigation (CLI)
\`\`\`bash
# List routes
php bin/console debug:router
\`\`\`

## Quick Find

| I need to... | Look in... |
|-------------|------------|
| Add a user endpoint | \`src/Module/User/Controller/\` |
| Process payment | \`src/Module/Payment/Service/\` |

## Topics

### auth
- **Keywords**: login, logout, jwt, session
- **Files**: src/Auth/Service.php, src/Auth/Middleware.php

### orders
- **Keywords**: cart, checkout, order
- **Files**: src/Module/Order/Service.php

## Meta

| Property | Value |
|----------|-------|
| Framework | symfony |
| Files scanned | 150 |
| Generated | 2026-04-23T10:00:00Z |
`;

const BRAIN_MD_MINIMAL = `# 🧠 Project Brain
> Generated: 2026-04-23T10:00:00Z · generic · 10 files

## At a Glance
- **Modules**: none detected
- **Routes**: 0 HTTP endpoints
- **Commands**: 0 CLI commands
- **Key Files**: 0 identified

## Quick Find

| I need to... | Look in... |
|-------------|------------|

## Meta

| Property | Value |
|----------|-------|
| Framework | generic |
| Files scanned | 10 |
| Generated | 2026-04-23T10:00:00Z |
`;

const BRAIN_MD_NO_TOPICS = `# 🧠 Project Brain
> Generated: 2026-04-23T10:00:00Z · nextjs · 80 files

## At a Glance
- **Modules**: Api, Frontend
- **Routes**: 20 HTTP endpoints
- **Commands**: 0 CLI commands
- **Key Files**: 3 identified

## Modules

### Api
- **Path**: \`src/api/\`

### Frontend
- **Path**: \`src/app/\`

## Quick Find

| I need to... | Look in... |
|-------------|------------|
| Add API route | \`src/api/routes/\` |

## Meta

| Property | Value |
|----------|-------|
| Framework | nextjs |
| Files scanned | 80 |
`;

function makeCtx(overrides?: Partial<SkillContext>): SkillContext {
  return {
    projectDir: '/tmp/test-project',
    framework: 'symfony',
    brainData: {
      framework: 'symfony',
      modules: [],
      routes: [],
      commands: [],
      conventions: { standards: [], notes: [], navigation: [] },
      keyFiles: [],
      quickFind: [],
      fileCount: 0,
    },
    ...overrides,
  };
}

describe('parseBrainMd', () => {
  it('parses At a Glance modules', () => {
    const result = parseBrainMd(BRAIN_MD_FULL);
    expect(result.modules).toEqual(['User', 'Order', 'Payment']);
  });

  it('parses modules with paths and dependencies', () => {
    const result = parseBrainMd(BRAIN_MD_FULL);
    expect(result.moduleDetails).toHaveLength(3);
    expect(result.moduleDetails[0]).toEqual({ name: 'User', path: 'src/Module/User/', dependsOn: ['Auth'] });
    expect(result.moduleDetails[2]).toEqual({ name: 'Payment', path: 'src/Module/Payment/', dependsOn: [] });
  });

  it('parses Quick Find entries', () => {
    const result = parseBrainMd(BRAIN_MD_FULL);
    expect(result.quickFind).toHaveLength(2);
    expect(result.quickFind[0]).toEqual({ task: 'Add a user endpoint', location: 'src/Module/User/Controller/' });
  });

  it('parses Topics section with files', () => {
    const result = parseBrainMd(BRAIN_MD_FULL);
    expect(result.topics).toHaveLength(2);
    expect(result.topics[0]).toEqual({ name: 'auth', files: ['src/Auth/Service.php', 'src/Auth/Middleware.php'] });
    expect(result.topics[1]).toEqual({ name: 'orders', files: ['src/Module/Order/Service.php'] });
  });

  it('handles minimal brain.md', () => {
    const result = parseBrainMd(BRAIN_MD_MINIMAL);
    expect(result.modules).toEqual([]);
    expect(result.moduleDetails).toEqual([]);
    expect(result.quickFind).toEqual([]);
    expect(result.topics).toEqual([]);
  });

  it('handles missing Topics section', () => {
    const result = parseBrainMd(BRAIN_MD_NO_TOPICS);
    expect(result.topics).toEqual([]);
    expect(result.modules).toEqual(['Api', 'Frontend']);
  });

  it('handles empty string', () => {
    const result = parseBrainMd('');
    expect(result.modules).toEqual([]);
    expect(result.moduleDetails).toEqual([]);
    expect(result.quickFind).toEqual([]);
    expect(result.topics).toEqual([]);
  });
});

describe('repoMapSkill', () => {
  beforeEach(() => {
    clearSkills();
    resetReadFileFn();
  });

  it('has correct name and description', () => {
    expect(repoMapSkill.name).toBe('repo-map');
    expect(repoMapSkill.description).toContain('brain.md');
  });

  it('config specifies query inputType with no required topics', () => {
    expect(repoMapSkill.config.inputType).toBe('query');
    expect(repoMapSkill.config.requiredTopics).toEqual([]);
  });

  it('reads brain.md and returns SkillResult', async () => {
    setReadFileFn(vi.fn().mockResolvedValue(BRAIN_MD_FULL));

    const result = await repoMapSkill.execute(makeCtx());

    expect(result.goal).toBe('Localize repo zones from brain.md');
    expect(result.topic).toBe('global');
    expect(result.files.length).toBeGreaterThan(0);
    expect(result.actions).toContain('Read brain.md');
    expect(result.next).toContain('topic');
  });

  it('uses topic from context when available', async () => {
    setReadFileFn(vi.fn().mockResolvedValue(BRAIN_MD_FULL));

    const ctx = makeCtx({ topic: { name: 'auth', keywords: [], files: [], routes: [], commands: [], status: 0 } });
    const result = await repoMapSkill.execute(ctx);

    expect(result.topic).toBe('auth');
  });

  it('returns key file paths from modules and quick find', async () => {
    setReadFileFn(vi.fn().mockResolvedValue(BRAIN_MD_FULL));

    const result = await repoMapSkill.execute(makeCtx());

    const allFiles = result.files.join(' ');
    expect(allFiles).toContain('src/Module/User/');
    expect(allFiles).toContain('src/Module/Order/');
    expect(allFiles).toContain('src/Module/Payment/');
    expect(allFiles).toContain('src/Module/User/Controller/');
    expect(allFiles).toContain('src/Module/Payment/Service/');
  });

  it('detects risk: modules without routes', async () => {
    setReadFileFn(vi.fn().mockResolvedValue(BRAIN_MD_FULL));

    const result = await repoMapSkill.execute(makeCtx());

    expect(result.risks.some(r => r.includes('Payment'))).toBe(true);
  });

  it('handles missing brain.md gracefully', async () => {
    setReadFileFn(vi.fn().mockRejectedValue(new Error('ENOENT')));

    const result = await repoMapSkill.execute(makeCtx());

    expect(result.goal).toBe('Localize repo zones from brain.md');
    expect(result.risks.some(r => r.includes('brain.md') || r.includes('not found'))).toBe(true);
  });

  it('includes topic files when topic matches a parsed topic', async () => {
    setReadFileFn(vi.fn().mockResolvedValue(BRAIN_MD_FULL));

    const ctx = makeCtx({ topic: { name: 'auth', keywords: [], files: [], routes: [], commands: [], status: 0 } });
    const result = await repoMapSkill.execute(ctx);

    const allFiles = result.files.join(' ');
    expect(allFiles).toContain('src/Auth/Service.php');
    expect(allFiles).toContain('src/Auth/Middleware.php');
  });

  it('is registered and runnable via runSkill', async () => {
    setReadFileFn(vi.fn().mockResolvedValue(BRAIN_MD_FULL));
    registerSkill(repoMapSkill);

    const result = await runSkill('repo-map', makeCtx());
    expect(result.goal).toBe('Localize repo zones from brain.md');
  });
});
