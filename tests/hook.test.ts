import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  installHook,
  uninstallHook,
  isHookInstalled,
  getStagedFiles,
  formatPreCheckReport,
  runPreCheck,
} from '../src/hook.js';
import type { FreshnessData } from '../src/types.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `brain-hook-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(path.join(tmpDir, '.git', 'hooks'), { recursive: true });
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

function makeFreshness(overrides: Partial<FreshnessData> = {}): FreshnessData {
  return {
    entries: {},
    brainMdStatus: 'fresh',
    lastUpdated: new Date().toISOString(),
    ...overrides,
  };
}

describe('installHook', () => {
  it('creates .git/hooks/pre-commit with correct content', async () => {
    const hookPath = await installHook(tmpDir);

    expect(hookPath).toBe(path.join(tmpDir, '.git', 'hooks', 'pre-commit'));
    const content = await readFile(hookPath, 'utf8');
    expect(content).toContain('brain _hook-check "$@"');
    expect(content).toContain('Installed by: brain hook');
  });
});

describe('isHookInstalled', () => {
  it('returns true after install', async () => {
    await installHook(tmpDir);
    expect(await isHookInstalled(tmpDir)).toBe(true);
  });

  it('returns false when no hook exists', async () => {
    expect(await isHookInstalled(tmpDir)).toBe(false);
  });

  it('returns false for unmanaged hook', async () => {
    await writeFile(path.join(tmpDir, '.git', 'hooks', 'pre-commit'), '#!/bin/sh\necho custom\n', 'utf8');
    expect(await isHookInstalled(tmpDir)).toBe(false);
  });
});

describe('uninstallHook', () => {
  it('removes managed hook', async () => {
    await installHook(tmpDir);
    const result = await uninstallHook(tmpDir);
    expect(result).toBe(true);
    expect(await isHookInstalled(tmpDir)).toBe(false);
  });

  it('does NOT remove unmanaged hook', async () => {
    const hookPath = path.join(tmpDir, '.git', 'hooks', 'pre-commit');
    await writeFile(hookPath, '#!/bin/sh\necho custom\n', 'utf8');
    const result = await uninstallHook(tmpDir);
    expect(result).toBe(false);
    const content = await readFile(hookPath, 'utf8');
    expect(content).toContain('custom');
  });

  it('returns false when no hook exists', async () => {
    expect(await uninstallHook(tmpDir)).toBe(false);
  });
});

describe('getStagedFiles', () => {
  it('returns empty array outside git repo', async () => {
    const nonGitDir = path.join(tmpDir, 'not-a-repo');
    await mkdir(nonGitDir);
    const files = await getStagedFiles(nonGitDir);
    expect(files).toEqual([]);
  });
});

describe('formatPreCheckReport', () => {
  it('shows dirty topics with file counts', () => {
    const freshness = makeFreshness({
      entries: {
        auth: {
          topic: 'auth',
          status: 'dirty',
          lastCheck: new Date().toISOString(),
          changedFiles: ['src/auth.ts', 'src/login.ts'],
        },
      },
    });

    const report = formatPreCheckReport(freshness);
    expect(report).toContain('Dirty topics (1)');
    expect(report).toContain('- auth');
    expect(report).toContain('2 files changed');
  });

  it('shows "All topics fresh" when clean', () => {
    const freshness = makeFreshness({
      entries: {
        auth: {
          topic: 'auth',
          status: 'fresh',
          lastCheck: new Date().toISOString(),
        },
      },
    });

    const report = formatPreCheckReport(freshness);
    expect(report).toContain('All topics fresh ✓');
  });

  it('includes brain.md dirty message', () => {
    const freshness = makeFreshness({
      brainMdStatus: 'dirty',
      entries: {
        auth: {
          topic: 'auth',
          status: 'fresh',
          lastCheck: new Date().toISOString(),
        },
      },
    });

    const report = formatPreCheckReport(freshness);
    expect(report).toContain('brain.md needs update');
  });

  it('shows stale topics', () => {
    const freshness = makeFreshness({
      entries: {
        payments: {
          topic: 'payments',
          status: 'stale',
          lastCheck: new Date().toISOString(),
        },
      },
    });

    const report = formatPreCheckReport(freshness);
    expect(report).toContain('Stale topics (1)');
    expect(report).toContain('- payments');
  });

  it('handles empty entries', () => {
    const freshness = makeFreshness({ entries: {} });
    const report = formatPreCheckReport(freshness);
    expect(report).toContain('All topics fresh ✓');
  });
});

describe('runPreCheck', () => {
  it('returns default freshness when no modules exist', async () => {
    const freshness = await runPreCheck(tmpDir);
    expect(freshness.entries).toEqual({});
    expect(freshness.brainMdStatus).toBe('fresh');
    expect(freshness.lastUpdated).toBeDefined();
  });
});
