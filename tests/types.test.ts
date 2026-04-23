import { describe, it, expect } from 'vitest';
import type {
  TopicIndexEntry,
  TopicIndex,
  FreshnessStatus,
  FreshnessEntry,
  FreshnessData,
  SkillConfig,
  SkillResult,
  RouterEntry,
} from '../src/types.js';
import type { SkillContext, SkillDefinition } from '../src/skills/types.js';

describe('Type construction tests', () => {
  it('constructs TopicIndexEntry', () => {
    const entry: TopicIndexEntry = {
      name: 'auth',
      keywords: ['login', 'jwt'],
      paths: ['src/Auth.ts'],
      defaultSkill: 'explain',
    };
    expect(entry.name).toBe('auth');
    expect(entry.keywords).toHaveLength(2);
    expect(entry.paths).toHaveLength(1);
    expect(entry.defaultSkill).toBe('explain');
  });

  it('constructs TopicIndex', () => {
    const index: TopicIndex = {
      topics: {
        auth: {
          name: 'auth',
          keywords: ['login'],
          paths: ['src/Auth.ts'],
          defaultSkill: 'explain',
        },
      },
    };
    expect(Object.keys(index.topics)).toHaveLength(1);
    expect(index.topics.auth.name).toBe('auth');
  });

  it('constructs FreshnessData with entries', () => {
    const data: FreshnessData = {
      entries: {
        auth: {
          topic: 'auth',
          status: 'stale',
          lastCheck: '2026-04-23T10:00:00Z',
          changedFiles: ['src/Auth.ts'],
        },
      },
      brainMdStatus: 'dirty',
      lastUpdated: '2026-04-23T10:00:00Z',
    };
    expect(data.entries.auth.status).toBe('stale');
    expect(data.brainMdStatus).toBe('dirty');
    expect(data.entries.auth.changedFiles).toContain('src/Auth.ts');
  });

  it('constructs SkillResult', () => {
    const result: SkillResult = {
      goal: 'Explain auth module',
      topic: 'auth',
      files: ['src/Auth.ts'],
      actions: ['Read files'],
      risks: ['Large file'],
      next: 'Enrich topic',
    };
    expect(result.goal).toBe('Explain auth module');
    expect(result.files).toHaveLength(1);
    expect(result.risks).toHaveLength(1);
  });

  it('constructs RouterEntry', () => {
    const entry: RouterEntry = {
      keywords: ['login'],
      paths: ['src/Auth.ts'],
      topic: 'auth',
      skill: 'explain',
      score: 0.95,
    };
    expect(entry.score).toBe(0.95);
    expect(entry.topic).toBe('auth');
  });

  it('constructs SkillContext', () => {
    const ctx: SkillContext = {
      projectDir: '/tmp/project',
      framework: 'symfony',
      brainData: {
        framework: 'symfony',
        modules: [],
        routes: [],
        commands: [],
        conventions: { standards: [], notes: [], navigation: [] },
        keyFiles: [],
        quickFind: [],
        fileCount: 10,
      },
    };
    expect(ctx.projectDir).toBe('/tmp/project');
    expect(ctx.brainData.framework).toBe('symfony');
  });

  it('constructs SkillDefinition with execute', () => {
    const def: SkillDefinition = {
      name: 'test-skill',
      description: 'A test skill',
      config: {
        name: 'test-skill',
        description: 'A test skill',
        inputType: 'topic',
        requiredTopics: ['auth'],
      },
      execute: async () => ({
        goal: 'test',
        topic: 'auth',
        files: [],
        actions: [],
        risks: [],
        next: 'done',
      }),
    };
    expect(def.name).toBe('test-skill');
    expect(def.config.inputType).toBe('topic');
  });

  it('accepts all FreshnessStatus values', () => {
    const statuses: FreshnessStatus[] = ['fresh', 'stale', 'dirty'];
    expect(statuses).toHaveLength(3);
  });

  it('constructs FreshnessEntry without optional changedFiles', () => {
    const entry: FreshnessEntry = {
      topic: 'auth',
      status: 'fresh',
      lastCheck: '2026-04-23T10:00:00Z',
    };
    expect(entry.changedFiles).toBeUndefined();
  });

  it('constructs SkillConfig with all inputType variants', () => {
    const types = ['topic', 'diff', 'error', 'query'] as const;
    for (const inputType of types) {
      const config: SkillConfig = {
        name: `skill-${inputType}`,
        description: `Skill for ${inputType}`,
        inputType,
        requiredTopics: [],
      };
      expect(config.inputType).toBe(inputType);
    }
  });
});
