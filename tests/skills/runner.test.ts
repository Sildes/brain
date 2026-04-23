import { describe, it, expect, beforeEach } from 'vitest';
import { registerSkill, getSkill, listSkills, runSkill, createSkillContext, clearSkills } from '../../src/skills/index.js';
import type { SkillDefinition, SkillContext } from '../../src/skills/types.js';
import type { SkillResult } from '../../src/types.js';

function makeMockSkill(name: string): SkillDefinition {
  return {
    name,
    description: `Mock skill: ${name}`,
    config: {
      name,
      description: `Mock skill: ${name}`,
      inputType: 'query',
      requiredTopics: [],
    },
    execute: async (ctx: SkillContext): Promise<SkillResult> => ({
      goal: `Execute ${name} on ${ctx.framework}`,
      topic: ctx.topic?.name || 'unknown',
      files: [],
      actions: [`ran ${name}`],
      risks: [],
      next: 'done',
    }),
  };
}

describe('registerSkill + getSkill', () => {
  beforeEach(() => clearSkills());

  it('registers and retrieves a skill', () => {
    const skill = makeMockSkill('test-skill');
    registerSkill(skill);
    expect(getSkill('test-skill')).toBe(skill);
  });

  it('returns undefined for unknown skill', () => {
    expect(getSkill('nope')).toBeUndefined();
  });

  it('overwrites skill with same name', () => {
    const v1 = makeMockSkill('dup');
    const v2 = makeMockSkill('dup');
    registerSkill(v1);
    registerSkill(v2);
    expect(getSkill('dup')).toBe(v2);
  });
});

describe('listSkills', () => {
  beforeEach(() => clearSkills());

  it('returns empty array when no skills registered', () => {
    expect(listSkills()).toEqual([]);
  });

  it('returns all registered skill configs', () => {
    registerSkill(makeMockSkill('a'));
    registerSkill(makeMockSkill('b'));
    const configs = listSkills();
    expect(configs).toHaveLength(2);
    expect(configs.map(c => c.name).sort()).toEqual(['a', 'b']);
  });
});

describe('clearSkills', () => {
  it('removes all registered skills', () => {
    registerSkill(makeMockSkill('x'));
    registerSkill(makeMockSkill('y'));
    clearSkills();
    expect(listSkills()).toEqual([]);
    expect(getSkill('x')).toBeUndefined();
  });
});

describe('runSkill', () => {
  beforeEach(() => clearSkills());

  it('executes a registered skill and returns SkillResult', async () => {
    const skill = makeMockSkill('runner');
    registerSkill(skill);

    const ctx: SkillContext = {
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
    };

    const result = await runSkill('runner', ctx);
    expect(result.goal).toContain('runner');
    expect(result.actions).toContain('ran runner');
    expect(result.topic).toBe('unknown');
  });

  it('throws for non-existent skill', async () => {
    const ctx: SkillContext = {
      projectDir: '/tmp/test',
      framework: 'generic',
      brainData: {
        framework: 'generic',
        modules: [],
        routes: [],
        commands: [],
        conventions: { standards: [], notes: [], navigation: [] },
        keyFiles: [],
        quickFind: [],
        fileCount: 0,
      },
    };

    await expect(runSkill('xyz', ctx)).rejects.toThrow("Skill 'xyz' not found. Available: none");
  });

  it('lists available skills in error message', async () => {
    registerSkill(makeMockSkill('alpha'));
    registerSkill(makeMockSkill('beta'));

    const ctx: SkillContext = {
      projectDir: '/tmp/test',
      framework: 'generic',
      brainData: {
        framework: 'generic',
        modules: [],
        routes: [],
        commands: [],
        conventions: { standards: [], notes: [], navigation: [] },
        keyFiles: [],
        quickFind: [],
        fileCount: 0,
      },
    };

    await expect(runSkill('missing', ctx)).rejects.toThrow(/Available:.*alpha.*beta/);
  });
});

describe('createSkillContext', () => {
  it('returns valid context with framework detection', async () => {
    const ctx = await createSkillContext({
      projectDir: '/tmp/nonexistent',
    });

    expect(ctx.projectDir).toBe('/tmp/nonexistent');
    expect(ctx.framework).toBe('generic');
    expect(ctx.brainData).toBeDefined();
    expect(ctx.brainData.framework).toBe('generic');
  });

  it('passes through optional fields', async () => {
    const ctx = await createSkillContext({
      projectDir: '/tmp/test',
      diff: '--- a\n+++ b',
      query: 'how does auth work?',
    });

    expect(ctx.diff).toBe('--- a\n+++ b');
    expect(ctx.query).toBe('how does auth work?');
    expect(ctx.topic).toBeUndefined();
  });
});
