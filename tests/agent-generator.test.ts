import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { generateAgentDir } from '../src/agent-generator.js';
import type { BrainData } from '../src/types.js';
import { readFile, rm, access } from 'node:fs/promises';
import path from 'node:path';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';

function makeBrainData(overrides: Partial<BrainData> = {}): BrainData {
  return {
    framework: 'Symfony',
    modules: [],
    routes: [],
    commands: [],
    conventions: { standards: [], notes: [], navigation: [] },
    keyFiles: [],
    quickFind: [],
    fileCount: 0,
    ...overrides,
  };
}

describe('generateAgentDir', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(tmpdir(), 'brain-agent-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('creates 6 files (4 prompts + 2 cache)', async () => {
    const files = await generateAgentDir({
      projectDir: tmpDir,
      framework: 'Symfony',
      brainData: makeBrainData(),
      topicsList: '- authentication\n- booking',
    });

    expect(files).toHaveLength(6);
    for (const f of files) {
      await expect(access(f)).resolves.toBeUndefined();
    }
  });

  it('system-base.md contains .projectbrain/brain.md reference', async () => {
    await generateAgentDir({
      projectDir: tmpDir,
      framework: 'Symfony',
      brainData: makeBrainData(),
      topicsList: '- auth',
    });

    const content = await readFile(path.join(tmpDir, '.agent', 'prompts', 'system-base.md'), 'utf8');
    expect(content).toContain('.projectbrain/brain.md');
  });

  it('system-base.md contains framework name', async () => {
    await generateAgentDir({
      projectDir: tmpDir,
      framework: 'Laravel',
      brainData: makeBrainData(),
      topicsList: '- users',
    });

    const content = await readFile(path.join(tmpDir, '.agent', 'prompts', 'system-base.md'), 'utf8');
    expect(content).toContain('Laravel');
  });

  it('system-base.md includes navigation commands', async () => {
    const brainData = makeBrainData({
      conventions: {
        standards: [],
        notes: [],
        navigation: [
          { command: 'php bin/console debug:router', description: 'List routes' },
          { command: 'php bin/console debug:container', description: 'List services' },
        ],
      },
    });

    await generateAgentDir({
      projectDir: tmpDir,
      framework: 'Symfony',
      brainData,
      topicsList: '- auth',
    });

    const content = await readFile(path.join(tmpDir, '.agent', 'prompts', 'system-base.md'), 'utf8');
    expect(content).toContain('php bin/console debug:router');
    expect(content).toContain('List routes');
    expect(content).toContain('php bin/console debug:container');
    expect(content).toContain('List services');
  });

  it('system-base.md shows "None detected" when no navigation commands', async () => {
    await generateAgentDir({
      projectDir: tmpDir,
      framework: 'Next.js',
      brainData: makeBrainData(),
      topicsList: '- pages',
    });

    const content = await readFile(path.join(tmpDir, '.agent', 'prompts', 'system-base.md'), 'utf8');
    expect(content).toContain('None detected');
  });

  it('context-policy.md contains budget constraints', async () => {
    await generateAgentDir({
      projectDir: tmpDir,
      framework: 'Symfony',
      brainData: makeBrainData(),
      topicsList: '- auth',
    });

    const content = await readFile(path.join(tmpDir, '.agent', 'prompts', 'context-policy.md'), 'utf8');
    expect(content).toContain('1 topic');
    expect(content).toContain('2 only if ambiguous');
  });

  it('output-format.md contains all required fields', async () => {
    await generateAgentDir({
      projectDir: tmpDir,
      framework: 'Symfony',
      brainData: makeBrainData(),
      topicsList: '- auth',
    });

    const content = await readFile(path.join(tmpDir, '.agent', 'prompts', 'output-format.md'), 'utf8');
    expect(content).toContain('goal');
    expect(content).toContain('topic');
    expect(content).toContain('files');
    expect(content).toContain('actions');
    expect(content).toContain('risks');
    expect(content).toContain('next');
  });

  it('task-router.md contains skill references', async () => {
    await generateAgentDir({
      projectDir: tmpDir,
      framework: 'Symfony',
      brainData: makeBrainData(),
      topicsList: '- auth',
    });

    const content = await readFile(path.join(tmpDir, '.agent', 'prompts', 'task-router.md'), 'utf8');
    expect(content).toContain('repo-map');
    expect(content).toContain('diff-only');
    expect(content).toContain('symfony-review');
  });

  it('cache directory exists with empty files', async () => {
    await generateAgentDir({
      projectDir: tmpDir,
      framework: 'Symfony',
      brainData: makeBrainData(),
      topicsList: '- auth',
    });

    const lastTopic = await readFile(path.join(tmpDir, '.agent', 'cache', 'last-topic.txt'), 'utf8');
    const recentContext = await readFile(path.join(tmpDir, '.agent', 'cache', 'recent-context.md'), 'utf8');
    expect(lastTopic).toBe('');
    expect(recentContext).toBe('');
  });

  it('returns absolute file paths', async () => {
    const files = await generateAgentDir({
      projectDir: tmpDir,
      framework: 'Symfony',
      brainData: makeBrainData(),
      topicsList: '- auth',
    });

    for (const f of files) {
      expect(path.isAbsolute(f)).toBe(true);
    }
  });
});
