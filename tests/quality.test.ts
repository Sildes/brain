import { describe, it, expect } from 'vitest';
import { computeTopicQuality, computeQualityScore } from '../src/quality.js';
import type { Topic, TopicQuality } from '../src/types.js';

describe('computeTopicQuality', () => {
  it('returns null when enrichedContent is null', () => {
    const topic: Topic = {
      name: 'auth',
      keywords: [],
      files: ['src/Auth.ts'],
      routes: [],
      commands: [],
      status: 'new' as any,
    };
    const result = computeTopicQuality(topic, null);
    expect(result).toBeNull();
  });

  it('returns TopicQuality with zeros for empty content', () => {
    const topic: Topic = {
      name: 'auth',
      keywords: [],
      files: [],
      routes: [],
      commands: [],
      status: 'new' as any,
    };
    const result = computeTopicQuality(topic, '');
    expect(result).not.toBeNull();
    expect(result!.lines).toBe(0);
    expect(result!.flows).toBe(0);
    expect(result!.gotchas).toBe(0);
    expect(result!.routes).toBe(0);
    expect(result!.commands).toBe(0);
    expect(result!.fileCoverage).toBe(0);
    expect(result!.score).toBe(0.1); // 0.2 * 0.5 (base minimum)
  });

  it('computes high score for topic with all sections', () => {
    const topic: Topic = {
      name: 'auth',
      keywords: [],
      files: ['src/Auth.ts', 'src/AuthService.ts', 'src/AuthController.ts'],
      routes: [],
      commands: [],
      status: 'new' as any,
    };
    const content = `
## Authentication

This is about authentication. The src/Auth.ts handles the main logic.

## flows
- User logs in with credentials (src/AuthService.ts)
- User registers with email
- User logs out
- User resets password
- User refreshes token

## gotchas
- Password must be hashed
- Tokens expire after 1 hour

## routes
- POST /api/auth/login
- POST /api/auth/register
- POST /api/auth/logout

## commands
- auth:login
- auth:register
- auth:logout

More details...
`;
    const result = computeTopicQuality(topic, content);
    expect(result).not.toBeNull();
    expect(result!.flows).toBe(5);
    expect(result!.gotchas).toBe(2);
    expect(result!.routes).toBe(3);
    expect(result!.commands).toBe(3);
    expect(result!.score).toBeGreaterThan(0.7);
  });

  it('computes low-medium score for topic with only core files', () => {
    const topic: Topic = {
      name: 'auth',
      keywords: [],
      files: ['src/Auth.ts', 'src/AuthService.ts'],
      routes: [],
      commands: [],
      status: 'new' as any,
    };
    const content = `
## Authentication

The src/Auth.ts file handles authentication logic.
The src/AuthService.ts provides the service layer.

This is the main module.
`;
    const result = computeTopicQuality(topic, content);
    expect(result).not.toBeNull();
    expect(result!.flows).toBe(0);
    expect(result!.gotchas).toBe(0);
    expect(result!.routes).toBe(0);
    expect(result!.commands).toBe(0);
    expect(result!.fileCoverage).toBeGreaterThan(0);
    expect(result!.score).toBeLessThan(0.5);
  });

  it('fileCoverage is 0 when topic.files is empty', () => {
    const topic: Topic = {
      name: 'auth',
      keywords: [],
      files: [],
      routes: [],
      commands: [],
      status: 'new' as any,
    };
    const content = `
## Authentication

This is about src/Auth.ts and other files.
`;
    const result = computeTopicQuality(topic, content);
    expect(result).not.toBeNull();
    expect(result!.fileCoverage).toBe(0);
  });

  it('excludes YAML frontmatter from line count', () => {
    const topic: Topic = {
      name: 'auth',
      keywords: [],
      files: [],
      routes: [],
      commands: [],
      status: 'new' as any,
    };
    const content = `---
title: Authentication
author: Test
date: 2026-04-29
---

## Authentication

This is line 1.
This is line 2.
This is line 3.
`;
    const result = computeTopicQuality(topic, content);
    expect(result).not.toBeNull();
    expect(result!.lines).toBe(4); // Header + 3 lines, not 9 (YAML + rest)
  });

  it('handles singular section names', () => {
    const topic: Topic = {
      name: 'auth',
      keywords: [],
      files: [],
      routes: [],
      commands: [],
      status: 'new' as any,
    };
    const content = `
## flow
- Flow item 1
- Flow item 2

## gotcha
- Gotcha item 1

## route
- Route item 1

## command
- Command item 1
`;
    const result = computeTopicQuality(topic, content);
    expect(result).not.toBeNull();
    expect(result!.flows).toBe(2);
    expect(result!.gotchas).toBe(1);
    expect(result!.routes).toBe(1);
    expect(result!.commands).toBe(1);
  });

  it('handles case-insensitive section names', () => {
    const topic: Topic = {
      name: 'auth',
      keywords: [],
      files: [],
      routes: [],
      commands: [],
      status: 'new' as any,
    };
    const content = `
## FLOWS
- Flow item 1

## GOTCHAS
- Gotcha item 1

## ROUTES
- Route item 1

## COMMANDS
- Command item 1
`;
    const result = computeTopicQuality(topic, content);
    expect(result).not.toBeNull();
    expect(result!.flows).toBe(1);
    expect(result!.gotchas).toBe(1);
    expect(result!.routes).toBe(1);
    expect(result!.commands).toBe(1);
  });

  it('stops counting at next section header', () => {
    const topic: Topic = {
      name: 'auth',
      keywords: [],
      files: [],
      routes: [],
      commands: [],
      status: 'new' as any,
    };
    const content = `
## flows
- Flow item 1
- Flow item 2

## gotchas
- Gotcha item 1
`;
    const result = computeTopicQuality(topic, content);
    expect(result).not.toBeNull();
    expect(result!.flows).toBe(2);
    expect(result!.gotchas).toBe(1);
  });

  it('computes fileCoverage based on mentioned files', () => {
    const topic: Topic = {
      name: 'auth',
      keywords: [],
      files: ['src/Auth.ts', 'src/AuthService.ts', 'src/AuthController.ts'],
      routes: [],
      commands: [],
      status: 'new' as any,
    };
    const content = `
## Authentication

The src/Auth.ts file handles authentication.
We also use src/AuthService.ts.
`;
    const result = computeTopicQuality(topic, content);
    expect(result).not.toBeNull();
    expect(result!.fileCoverage).toBe(2 / 3);
  });
});

describe('computeQualityScore', () => {
  it('matches formula exactly for base case', () => {
    const quality: TopicQuality = {
      lines: 0,
      flows: 0,
      gotchas: 0,
      routes: 0,
      commands: 0,
      fileCoverage: 0,
      score: 0,
    };
    const result = computeQualityScore(quality);
    // 0.3 * 0 + 0.3 * 0 + 0.2 * 0 + 0.2 * 0.5 = 0.1
    expect(result).toBe(0.1);
  });

  it('matches formula exactly for maximum score', () => {
    const quality: TopicQuality = {
      lines: 100,
      flows: 3,
      gotchas: 2,
      routes: 2,
      commands: 2,
      fileCoverage: 1,
      score: 0,
    };
    const result = computeQualityScore(quality);
    // 0.3 * 1 + 0.3 * 1 + 0.2 * 1 + 0.2 * 1 = 1.0
    expect(result).toBe(1);
  });

  it('clamps score to [0, 1]', () => {
    const low: TopicQuality = {
      lines: 0,
      flows: 0,
      gotchas: 0,
      routes: 0,
      commands: 0,
      fileCoverage: 0,
      score: 0,
    };
    expect(computeQualityScore(low)).toBeGreaterThanOrEqual(0);

    const high: TopicQuality = {
      lines: 100,
      flows: 10,
      gotchas: 10,
      routes: 10,
      commands: 10,
      fileCoverage: 1,
      score: 0,
    };
    expect(computeQualityScore(high)).toBeLessThanOrEqual(1);
  });

  it('computes correct intermediate score', () => {
    const quality: TopicQuality = {
      lines: 50,
      flows: 2,
      gotchas: 1,
      routes: 1,
      commands: 0,
      fileCoverage: 0.5,
      score: 0,
    };
    const result = computeQualityScore(quality);
    // 0.3 * 0.5 + 0.3 * 3/5 + 0.2 * 50/100 + 0.2 * 1
    // = 0.15 + 0.18 + 0.1 + 0.2 = 0.63
    expect(result).toBeCloseTo(0.63, 2);
  });

  it('gives bonus for routes and commands', () => {
    const withRoutes: TopicQuality = {
      lines: 10,
      flows: 0,
      gotchas: 0,
      routes: 1,
      commands: 0,
      fileCoverage: 0,
      score: 0,
    };
    const withoutRoutes: TopicQuality = {
      lines: 10,
      flows: 0,
      gotchas: 0,
      routes: 0,
      commands: 0,
      fileCoverage: 0,
      score: 0,
    };

    const scoreWith = computeQualityScore(withRoutes);
    const scoreWithout = computeQualityScore(withoutRoutes);
    expect(scoreWith).toBeGreaterThan(scoreWithout);
  });
});
