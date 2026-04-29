import { describe, it, expect } from 'vitest';
import type {
  TopicQuality,
  TopicIndexEntry,
  TopicIndex,
  FreshnessStatus,
  FreshnessEntry,
  FreshnessData,
  SkillConfig,
  SkillResult,
  RouterEntry,
} from '../src/types.js';
import { TopicStatus } from '../src/types.js';
import type { SkillContext, SkillDefinition } from '../src/skills/types.js';

describe('Type construction tests', () => {
  it('constructs TopicIndexEntry', () => {
    const entry: TopicIndexEntry = {
      name: 'auth',
      keywords: ['login', 'jwt'],
      paths: ['src/Auth.ts'],
      defaultSkill: 'explain',
      dependsOn: ['topic-a'],
      relatedTo: ['topic-b'],
    };
    expect(entry.name).toBe('auth');
    expect(entry.keywords).toHaveLength(2);
    expect(entry.paths).toHaveLength(1);
    expect(entry.defaultSkill).toBe('explain');
    expect(entry.dependsOn).toEqual(['topic-a']);
    expect(entry.relatedTo).toEqual(['topic-b']);
  });

  it('constructs TopicIndex', () => {
    const index: TopicIndex = {
      topics: {
        auth: {
          name: 'auth',
          keywords: ['login'],
          paths: ['src/Auth.ts'],
          defaultSkill: 'explain',
          dependsOn: [],
          relatedTo: [],
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

  it('constructs TopicQuality with all fields', () => {
    const quality: TopicQuality = {
      lines: 50,
      flows: 2,
      gotchas: 1,
      routes: 3,
      commands: 4,
      fileCoverage: 0.8,
      score: 0.75,
    };
    expect(quality.lines).toBe(50);
    expect(quality.flows).toBe(2);
    expect(quality.gotchas).toBe(1);
    expect(quality.routes).toBe(3);
    expect(quality.commands).toBe(4);
    expect(quality.fileCoverage).toBe(0.8);
    expect(quality.score).toBe(0.75);
  });

  it('constructs TopicMeta with quality', () => {
    const meta = {
      draft_generated: '2026-04-29',
      enriched_at: '2026-04-29T10:00:00Z',
      enriched_files: ['src/Auth.ts'],
      file_hashes: { 'src/Auth.ts': 'abc123' },
      status: TopicStatus.UpToDate,
      quality: {
        lines: 50,
        flows: 2,
        gotchas: 1,
        routes: 3,
        commands: 4,
        fileCoverage: 0.8,
        score: 0.75,
      },
    };
    expect(meta.status).toBe(TopicStatus.UpToDate);
    expect(meta.quality?.score).toBe(0.75);
    expect(meta.quality?.fileCoverage).toBe(0.8);
  });

  it('constructs TopicMeta without quality', () => {
    const meta = {
      draft_generated: '2026-04-29',
      enriched_at: null,
      enriched_files: [],
      file_hashes: {},
      status: TopicStatus.New,
    };
    expect(meta.status).toBe(TopicStatus.New);
    expect(meta.quality).toBeUndefined();
  });
});
