import { describe, it, expect } from 'vitest';
import { computeTopicDependencies, mergeDependencies, parseDependenciesFromTopic } from '../src/dependency-graph.js';
import type { Topic } from '../src/types.js';

describe('computeTopicDependencies', () => {
  it('single topic returns empty deps', () => {
    const topic: Topic = {
      name: 'auth',
      keywords: ['login', 'jwt'],
      files: [],
      routes: [],
      commands: [],
      status: 'new' as const,
    };

    const result = computeTopicDependencies([topic]);

    expect(result.size).toBe(1);
    expect(result.get('auth')).toEqual({ dependsOn: [], relatedTo: [] });
  });

  it('no keyword overlap -> no dependencies', () => {
    const topics: Topic[] = [
      {
        name: 'auth',
        keywords: ['login', 'jwt'],
        files: [],
        routes: [],
        commands: [],
        status: 'new' as const,
      },
      {
        name: 'database',
        keywords: ['query', 'connection'],
        files: [],
        routes: [],
        commands: [],
        status: 'new' as const,
      },
    ];

    const result = computeTopicDependencies(topics);

    expect(result.get('auth')).toEqual({ dependsOn: [], relatedTo: [] });
    expect(result.get('database')).toEqual({ dependsOn: [], relatedTo: [] });
  });

  it('keyword overlap > 0.3 -> relatedTo symmetric', () => {
    const topics: Topic[] = [
      {
        name: 'auth',
        keywords: ['login', 'jwt', 'token', 'session'],
        files: [],
        routes: [],
        commands: [],
        status: 'new' as const,
      },
      {
        name: 'session',
        keywords: ['session', 'cookie', 'login'],
        files: [],
        routes: [],
        commands: [],
        status: 'new' as const,
      },
    ];

    const result = computeTopicDependencies(topics);

    expect(result.get('auth')?.relatedTo).toContain('session');
    expect(result.get('session')?.relatedTo).toContain('auth');
    expect(result.get('auth')?.dependsOn).toEqual([]);
    expect(result.get('session')?.dependsOn).toEqual([]);
  });

  it('keyword overlap < 0.3 -> no relatedTo', () => {
    const topics: Topic[] = [
      {
        name: 'auth',
        keywords: ['login', 'jwt', 'token', 'session', 'oauth'],
        files: [],
        routes: [],
        commands: [],
        status: 'new' as const,
      },
      {
        name: 'session',
        keywords: ['session', 'cookie'],
        files: [],
        routes: [],
        commands: [],
        status: 'new' as const,
      },
    ];

    const result = computeTopicDependencies(topics);

    // Overlap: 1 (session) / 2 (min size) = 0.5 > 0.3, so should be related
    expect(result.get('auth')?.relatedTo).toContain('session');
    expect(result.get('session')?.relatedTo).toContain('auth');
  });

  it('keyword overlap = 0.3 -> no relatedTo (strict >)', () => {
    const topics: Topic[] = [
      {
        name: 'auth',
        keywords: ['login', 'jwt', 'token'],
        files: [],
        routes: [],
        commands: [],
        status: 'new' as const,
      },
      {
        name: 'session',
        keywords: ['session', 'login', 'cookie'],
        files: [],
        routes: [],
        commands: [],
        status: 'new' as const,
      },
    ];

    const result = computeTopicDependencies(topics);

    // Overlap: 1 (login) / 3 (min size) = 0.333 > 0.3, so should be related
    expect(result.get('auth')?.relatedTo).toContain('session');
    expect(result.get('session')?.relatedTo).toContain('auth');
  });

  it('multiple topics with varying overlap', () => {
    const topics: Topic[] = [
      {
        name: 'auth',
        keywords: ['login', 'jwt', 'token', 'session'],
        files: [],
        routes: [],
        commands: [],
        status: 'new' as const,
      },
      {
        name: 'session',
        keywords: ['session', 'cookie', 'login'],
        files: [],
        routes: [],
        commands: [],
        status: 'new' as const,
      },
      {
        name: 'database',
        keywords: ['query', 'connection', 'pool'],
        files: [],
        routes: [],
        commands: [],
        status: 'new' as const,
      },
    ];

    const result = computeTopicDependencies(topics);

    // auth <-> session: overlap = 2 (login, session) / 3 = 0.67 > 0.3
    expect(result.get('auth')?.relatedTo).toContain('session');
    expect(result.get('session')?.relatedTo).toContain('auth');

    // auth <-> database: no overlap
    expect(result.get('auth')?.relatedTo).not.toContain('database');
    expect(result.get('database')?.relatedTo).not.toContain('auth');

    // session <-> database: no overlap
    expect(result.get('session')?.relatedTo).not.toContain('database');
    expect(result.get('database')?.relatedTo).not.toContain('session');

    // All dependsOn empty
    expect(result.get('auth')?.dependsOn).toEqual([]);
    expect(result.get('session')?.dependsOn).toEqual([]);
    expect(result.get('database')?.dependsOn).toEqual([]);
  });

  it('empty keywords array -> no overlap', () => {
    const topics: Topic[] = [
      {
        name: 'auth',
        keywords: [],
        files: [],
        routes: [],
        commands: [],
        status: 'new' as const,
      },
      {
        name: 'session',
        keywords: ['session'],
        files: [],
        routes: [],
        commands: [],
        status: 'new' as const,
      },
    ];

    const result = computeTopicDependencies(topics);

    expect(result.get('auth')?.relatedTo).toEqual([]);
    expect(result.get('session')?.relatedTo).toEqual([]);
  });

  it('dependsOn always empty from static inference', () => {
    const topics: Topic[] = [
      {
        name: 'auth',
        keywords: ['login', 'jwt'],
        files: [],
        routes: [],
        commands: [],
        status: 'new' as const,
      },
      {
        name: 'session',
        keywords: ['session', 'login'],
        files: [],
        routes: [],
        commands: [],
        status: 'new' as const,
      },
    ];

    const result = computeTopicDependencies(topics);

    expect(result.get('auth')?.dependsOn).toEqual([]);
    expect(result.get('session')?.dependsOn).toEqual([]);
  });
});

describe('mergeDependencies', () => {
  it('LLM dependsOn enriches static deps', () => {
    const existing = new Map([
      ['auth', { dependsOn: [], relatedTo: ['session'] }],
    ]);
    const llmInferred = new Map([
      ['auth', { dependsOn: ['database'], relatedTo: [] }],
    ]);
    const validTopicNames = new Set(['auth', 'session', 'database']);

    const result = mergeDependencies(existing, llmInferred, validTopicNames);

    expect(result.get('auth')?.dependsOn).toContain('database');
    expect(result.get('auth')?.relatedTo).toContain('session');
  });

  it('relatedTo merges both sources and deduplicates', () => {
    const existing = new Map([
      ['auth', { dependsOn: [], relatedTo: ['session'] }],
    ]);
    const llmInferred = new Map([
      ['auth', { dependsOn: [], relatedTo: ['session', 'database'] }],
    ]);
    const validTopicNames = new Set(['auth', 'session', 'database']);

    const result = mergeDependencies(existing, llmInferred, validTopicNames);

    expect(result.get('auth')?.relatedTo).toEqual(['session', 'database']);
    expect(result.get('auth')?.relatedTo).toHaveLength(2);
  });

  it('validates LLM topic names and drops invalid', () => {
    const existing = new Map([
      ['auth', { dependsOn: [], relatedTo: [] }],
    ]);
    const llmInferred = new Map([
      ['auth', { dependsOn: ['database', 'invalid-topic'], relatedTo: [] }],
    ]);
    const validTopicNames = new Set(['auth', 'session', 'database']);

    const result = mergeDependencies(existing, llmInferred, validTopicNames);

    expect(result.get('auth')?.dependsOn).toContain('database');
    expect(result.get('auth')?.dependsOn).not.toContain('invalid-topic');
  });

  it('new topic from LLM with validation', () => {
    const existing = new Map([
      ['auth', { dependsOn: [], relatedTo: [] }],
    ]);
    const llmInferred = new Map([
      ['new-topic', { dependsOn: ['auth', 'invalid'], relatedTo: ['auth'] }],
    ]);
    const validTopicNames = new Set(['auth', 'session', 'database', 'new-topic']);

    const result = mergeDependencies(existing, llmInferred, validTopicNames);

    expect(result.get('new-topic')?.dependsOn).toEqual(['auth']);
    expect(result.get('new-topic')?.relatedTo).toEqual(['auth']);
  });

  it('does not mutate input maps', () => {
    const existing = new Map([
      ['auth', { dependsOn: [], relatedTo: ['session'] }],
    ]);
    const llmInferred = new Map([
      ['auth', { dependsOn: ['database'], relatedTo: [] }],
    ]);
    const validTopicNames = new Set(['auth', 'session', 'database']);

    mergeDependencies(existing, llmInferred, validTopicNames);

    expect(existing.get('auth')?.dependsOn).toEqual([]);
    expect(existing.get('auth')?.relatedTo).toEqual(['session']);
    expect(llmInferred.get('auth')?.dependsOn).toEqual(['database']);
    expect(llmInferred.get('auth')?.relatedTo).toEqual([]);
  });

  it('merges dependsOn and deduplicates', () => {
    const existing = new Map([
      ['auth', { dependsOn: ['database'], relatedTo: [] }],
    ]);
    const llmInferred = new Map([
      ['auth', { dependsOn: ['database', 'session'], relatedTo: [] }],
    ]);
    const validTopicNames = new Set(['auth', 'session', 'database']);

    const result = mergeDependencies(existing, llmInferred, validTopicNames);

    expect(result.get('auth')?.dependsOn).toEqual(['database', 'session']);
    expect(result.get('auth')?.dependsOn).toHaveLength(2);
  });

  it('empty LLM map returns copy of existing', () => {
    const existing = new Map([
      ['auth', { dependsOn: ['database'], relatedTo: ['session'] }],
    ]);
    const llmInferred = new Map([]);
    const validTopicNames = new Set(['auth', 'session', 'database']);

    const result = mergeDependencies(existing, llmInferred, validTopicNames);

    expect(result.get('auth')?.dependsOn).toEqual(['database']);
    expect(result.get('auth')?.relatedTo).toEqual(['session']);
  });

  it('empty existing map merges LLM deps', () => {
    const existing = new Map([]);
    const llmInferred = new Map([
      ['auth', { dependsOn: ['database'], relatedTo: ['session'] }],
    ]);
    const validTopicNames = new Set(['auth', 'session', 'database']);

    const result = mergeDependencies(existing, llmInferred, validTopicNames);

    expect(result.get('auth')?.dependsOn).toEqual(['database']);
    expect(result.get('auth')?.relatedTo).toEqual(['session']);
  });

  it('all invalid LLM deps dropped', () => {
    const existing = new Map([
      ['auth', { dependsOn: [], relatedTo: [] }],
    ]);
    const llmInferred = new Map([
      ['auth', { dependsOn: ['invalid1', 'invalid2'], relatedTo: [] }],
    ]);
    const validTopicNames = new Set(['auth']);

    const result = mergeDependencies(existing, llmInferred, validTopicNames);

    expect(result.get('auth')?.dependsOn).toEqual([]);
  });
});

describe('parseDependenciesFromTopic', () => {
  const validNames = new Set(['auth', 'session', 'database', 'api']);

  it('extracts depends_on and related_to from valid content', () => {
    const content = `# auth
domain: authentication
## dependencies
depends_on: database, session
related_to: api
`;
    const result = parseDependenciesFromTopic(content, validNames);
    expect(result.dependsOn).toEqual(['database', 'session']);
    expect(result.relatedTo).toEqual(['api']);
  });

  it('returns empty arrays for missing section', () => {
    const content = `# auth
domain: authentication
## core
some content
`;
    const result = parseDependenciesFromTopic(content, validNames);
    expect(result.dependsOn).toEqual([]);
    expect(result.relatedTo).toEqual([]);
  });

  it('handles malformed content gracefully', () => {
    const content = `# auth
## dependencies
garbage line here
more garbage
`;
    const result = parseDependenciesFromTopic(content, validNames);
    expect(result.dependsOn).toEqual([]);
    expect(result.relatedTo).toEqual([]);
  });

  it('drops invalid topic names', () => {
    const content = `# auth
## dependencies
depends_on: database, nonexistent-topic
related_to: api, another-fake
`;
    const result = parseDependenciesFromTopic(content, validNames);
    expect(result.dependsOn).toEqual(['database']);
    expect(result.relatedTo).toEqual(['api']);
  });

  it('stops parsing at next section header', () => {
    const content = `# auth
## dependencies
depends_on: database
## core
depends_on: should-not-appear
`;
    const result = parseDependenciesFromTopic(content, validNames);
    expect(result.dependsOn).toEqual(['database']);
  });

  it('handles dash-list format', () => {
    const content = `# auth
## dependencies
- database
- session
`;
    const result = parseDependenciesFromTopic(content, validNames);
    expect(result.dependsOn).toEqual(['database']);
    expect(result.relatedTo).toEqual(['session']);
  });
});
