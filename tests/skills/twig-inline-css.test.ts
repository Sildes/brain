import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { registerSkill, getSkill, runSkill, clearSkills } from '../../src/skills/index.js';
import { twigInlineCssSkill } from '../../src/skills/twig-inline-css.js';
import type { SkillContext } from '../../src/skills/types.js';
import type { Topic } from '../../src/types.js';

const NEW_TOPIC: Topic = {
  name: 'twig-templates',
  keywords: ['twig', 'template'],
  files: [],
  routes: [],
  commands: [],
  status: 'new' as TopicStatus,
};

function makeCtx(overrides: Partial<SkillContext> = {}): SkillContext {
  return {
    projectDir: '/tmp/test',
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

function createTempDir(): string {
  return mkdtempSync(join(tmpdir(), 'twig-inline-css-'));
}

describe('twig-inline-css skill registration', () => {
  beforeEach(() => {
    clearSkills();
    registerSkill(twigInlineCssSkill);
  });

  it('is registered with correct config', () => {
    const skill = getSkill('twig-inline-css');
    expect(skill).toBeDefined();
    expect(skill!.name).toBe('twig-inline-css');
    expect(skill!.description).toBe('Extract and refactor inline CSS from Twig templates');
    expect(skill!.config.inputType).toBe('topic');
    expect(skill!.config.requiredTopics).toEqual([]);
  });
});

describe('twig-inline-css analyze mode', () => {
  let tmpDir: string;

  beforeEach(() => {
    clearSkills();
    registerSkill(twigInlineCssSkill);
    tmpDir = createTempDir();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('detects inline styles in twig files', async () => {
    const twigContent = '<div style="color: red;">Hello</div><span style="font-size: 14px;">World</span>';
    writeFileSync(join(tmpDir, 'template.html.twig'), twigContent);

    const topic: Topic = { ...NEW_TOPIC, files: ['template.html.twig'] };
    const ctx = makeCtx({ projectDir: tmpDir, topic });

    const result = await runSkill('twig-inline-css', ctx);

    expect(result.goal).toBe('Analyze inline CSS in Twig templates');
    expect(result.topic).toBe('twig-templates');
    expect(result.files).toEqual(['template.html.twig']);
    expect(result.actions).toEqual(['template.html.twig: 2 inline style(s)']);
    expect(result.next).toBe('Run generate-css mode to extract styles');
  });

  it('ignores non-twig files', async () => {
    writeFileSync(join(tmpDir, 'style.css'), 'body { color: red; }');
    writeFileSync(join(tmpDir, 'page.twig'), '<div style="margin: 0;">Hi</div>');

    const topic: Topic = { ...NEW_TOPIC, files: ['style.css', 'page.twig'] };
    const ctx = makeCtx({ projectDir: tmpDir, topic });

    const result = await runSkill('twig-inline-css', ctx);

    expect(result.files).toEqual(['page.twig']);
    expect(result.actions).toEqual(['page.twig: 1 inline style(s)']);
  });

  it('returns empty when no inline styles found', async () => {
    writeFileSync(join(tmpDir, 'clean.html.twig'), '<div class="clean">No inline styles</div>');

    const topic: Topic = { ...NEW_TOPIC, files: ['clean.html.twig'] };
    const ctx = makeCtx({ projectDir: tmpDir, topic });

    const result = await runSkill('twig-inline-css', ctx);

    expect(result.files).toEqual([]);
    expect(result.actions).toEqual([]);
    expect(result.risks).toEqual([]);
  });

  it('flags templates with many inline styles as risks', async () => {
    const heavy = Array(4).fill('<div style="color: red;">X</div>').join('');
    writeFileSync(join(tmpDir, 'heavy.html.twig'), heavy);

    const topic: Topic = { ...NEW_TOPIC, files: ['heavy.html.twig'] };
    const ctx = makeCtx({ projectDir: tmpDir, topic });

    const result = await runSkill('twig-inline-css', ctx);

    expect(result.risks.length).toBeGreaterThan(0);
    expect(result.risks[0]).toContain('heavy.html.twig');
    expect(result.risks[0]).toContain('4 inline styles');
  });

  it('handles missing files gracefully', async () => {
    const topic: Topic = { ...NEW_TOPIC, files: ['nonexistent.html.twig'] };
    const ctx = makeCtx({ projectDir: tmpDir, topic });

    const result = await runSkill('twig-inline-css', ctx);

    expect(result.files).toEqual([]);
    expect(result.actions).toEqual([]);
  });

  it('works with no topic files', async () => {
    const topic: Topic = { ...NEW_TOPIC, files: [] };
    const ctx = makeCtx({ projectDir: tmpDir, topic });

    const result = await runSkill('twig-inline-css', ctx);

    expect(result.files).toEqual([]);
    expect(result.actions).toEqual([]);
  });

  it('uses "analyze" as default mode when no query provided', async () => {
    writeFileSync(join(tmpDir, 'test.twig'), '<p style="padding: 10px;">text</p>');

    const topic: Topic = { ...NEW_TOPIC, files: ['test.twig'] };
    const ctx = makeCtx({ projectDir: tmpDir, topic, query: undefined });

    const result = await runSkill('twig-inline-css', ctx);

    expect(result.goal).toBe('Analyze inline CSS in Twig templates');
  });
});

describe('twig-inline-css generate-css mode', () => {
  let tmpDir: string;

  beforeEach(() => {
    clearSkills();
    registerSkill(twigInlineCssSkill);
    tmpDir = createTempDir();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('proposes CSS classes for inline styles', async () => {
    writeFileSync(join(tmpDir, 'card.html.twig'), '<div style="color: blue;">Card</div>');

    const topic: Topic = { ...NEW_TOPIC, files: ['card.html.twig'] };
    const ctx = makeCtx({ projectDir: tmpDir, topic, query: 'generate-css' });

    const result = await runSkill('twig-inline-css', ctx);

    expect(result.goal).toBe('Generate CSS classes from inline styles');
    expect(result.actions[0]).toContain('propose class');
    expect(result.next).toContain('apply');
  });

  it('flags complex selectors as risks', async () => {
    const longStyle = 'display: flex; justify-content: center; align-items: center; padding: 10px 20px; margin: 5px;';
    writeFileSync(join(tmpDir, 'complex.twig'), `<div style="${longStyle}">Complex</div>`);

    const topic: Topic = { ...NEW_TOPIC, files: ['complex.twig'] };
    const ctx = makeCtx({ projectDir: tmpDir, topic, query: 'generate-css' });

    const result = await runSkill('twig-inline-css', ctx);

    expect(result.risks.length).toBeGreaterThan(0);
    expect(result.risks[0]).toContain('Complex selector');
  });
});

describe('twig-inline-css apply mode', () => {
  let tmpDir: string;

  beforeEach(() => {
    clearSkills();
    registerSkill(twigInlineCssSkill);
    tmpDir = createTempDir();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('shows replacement suggestions', async () => {
    writeFileSync(join(tmpDir, 'btn.twig'), '<button style="background: green;">OK</button>');

    const topic: Topic = { ...NEW_TOPIC, files: ['btn.twig'] };
    const ctx = makeCtx({ projectDir: tmpDir, topic, query: 'apply' });

    const result = await runSkill('twig-inline-css', ctx);

    expect(result.goal).toBe('Generate replacement suggestions for inline CSS');
    expect(result.actions[0]).toContain('replace');
    expect(result.risks[0]).toContain('manual review');
    expect(result.next).toContain('dry-run');
  });
});

describe('twig-inline-css dry-run mode', () => {
  let tmpDir: string;

  beforeEach(() => {
    clearSkills();
    registerSkill(twigInlineCssSkill);
    tmpDir = createTempDir();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('shows preview without modifying files', async () => {
    writeFileSync(join(tmpDir, 'nav.twig'), '<nav style="height: 50px;">Nav</nav>');

    const topic: Topic = { ...NEW_TOPIC, files: ['nav.twig'] };
    const ctx = makeCtx({ projectDir: tmpDir, topic, query: 'dry-run' });

    const result = await runSkill('twig-inline-css', ctx);

    expect(result.goal).toContain('dry-run');
    expect(result.actions[0]).toContain('[dry-run]');
    expect(result.risks).toEqual([]);
  });
});

describe('twig-inline-css unknown mode', () => {
  beforeEach(() => {
    clearSkills();
    registerSkill(twigInlineCssSkill);
  });

  it('returns guidance for unknown mode', async () => {
    const topic: Topic = { ...NEW_TOPIC, files: [] };
    const ctx = makeCtx({ topic, query: 'unknown-mode' });

    const result = await runSkill('twig-inline-css', ctx);

    expect(result.actions[0]).toContain('Unknown mode');
    expect(result.next).toContain('analyze');
  });
});
