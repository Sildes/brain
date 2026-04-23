import { describe, it, expect, vi, beforeEach } from 'vitest';
import { diffOnlySkill } from '../../src/skills/diff-only.js';
import { clearSkills, registerSkill, runSkill } from '../../src/skills/index.js';
import type { SkillContext } from '../../src/skills/types.js';
import type { TopicIndex } from '../../src/types.js';

vi.mock('../../src/topic-index.js', () => ({
  readTopicIndex: vi.fn(),
}));

import { readTopicIndex } from '../../src/topic-index.js';

const mockedReadTopicIndex = vi.mocked(readTopicIndex);

function makeCtx(overrides: Partial<SkillContext> = {}): SkillContext {
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

const MOCK_TOPIC_INDEX: TopicIndex = {
  topics: {
    auth: {
      name: 'auth',
      keywords: ['security', 'login', 'auth'],
      paths: ['src/Security', 'src/Controller/AuthController.php'],
      defaultSkill: 'repo-map',
    },
    billing: {
      name: 'billing',
      keywords: ['payment', 'invoice', 'billing'],
      paths: ['src/Billing', 'src/Service/InvoiceService.php'],
      defaultSkill: 'repo-map',
    },
  },
};

describe('diffOnlySkill', () => {
  beforeEach(() => {
    clearSkills();
    vi.clearAllMocks();
    mockedReadTopicIndex.mockResolvedValue(MOCK_TOPIC_INDEX);
  });

  it('exports a valid SkillDefinition', () => {
    expect(diffOnlySkill.name).toBe('diff-only');
    expect(diffOnlySkill.config.inputType).toBe('diff');
  });

  it('returns error in risks when ctx.diff is missing', async () => {
    const result = await diffOnlySkill.execute(makeCtx());
    expect(result.risks).toEqual(expect.arrayContaining([
      expect.stringContaining('diff'),
    ]));
    expect(result.goal).toBe('Analyze targeted git diff');
  });

  it('returns empty files list for empty diff string', async () => {
    const result = await diffOnlySkill.execute(makeCtx({ diff: '' }));
    expect(result.files).toEqual([]);
    expect(result.actions).toEqual([]);
  });

  it('parses added files from diff', async () => {
    const diff = [
      'diff --git a/src/Security/UserAuth.php b/src/Security/UserAuth.php',
      'new file mode 100644',
      'index 0000000..abc1234',
      '--- /dev/null',
      '+++ b/src/Security/UserAuth.php',
      '@@ -0,0 +1,10 @@',
      '+<?php',
    ].join('\n');

    const result = await diffOnlySkill.execute(makeCtx({ diff }));
    expect(result.files).toContain('src/Security/UserAuth.php');
    expect(result.actions).toEqual(expect.arrayContaining([
      expect.stringContaining('added'),
    ]));
  });

  it('parses deleted files from diff', async () => {
    const diff = [
      'diff --git a/src/Billing/OldInvoice.php b/src/Billing/OldInvoice.php',
      'deleted file mode 100644',
      '--- a/src/Billing/OldInvoice.php',
      '+++ /dev/null',
      '@@ -1,5 +0,0 @@',
      '-<?php',
    ].join('\n');

    const result = await diffOnlySkill.execute(makeCtx({ diff }));
    expect(result.files).toContain('src/Billing/OldInvoice.php');
    expect(result.actions).toEqual(expect.arrayContaining([
      expect.stringContaining('deleted'),
    ]));
  });

  it('parses modified files from diff', async () => {
    const diff = [
      'diff --git a/src/Security/Firewall.php b/src/Security/Firewall.php',
      '--- a/src/Security/Firewall.php',
      '+++ b/src/Security/Firewall.php',
      '@@ -1,3 +1,4 @@',
      ' <?php',
      '-old',
      '+new',
      '+extra',
    ].join('\n');

    const result = await diffOnlySkill.execute(makeCtx({ diff }));
    expect(result.files).toContain('src/Security/Firewall.php');
    expect(result.actions).toEqual(expect.arrayContaining([
      expect.stringContaining('modified'),
    ]));
  });

  it('maps files to topics via readTopicIndex', async () => {
    const diff = [
      'diff --git a/src/Security/LoginService.php b/src/Security/LoginService.php',
      '--- a/src/Security/LoginService.php',
      '+++ b/src/Security/LoginService.php',
      '@@ -1,1 +1,2 @@',
      ' class LoginService {}',
      '+new method',
    ].join('\n');

    const result = await diffOnlySkill.execute(makeCtx({ diff }));
    expect(mockedReadTopicIndex).toHaveBeenCalledWith('/tmp/test-project');
    expect(result.topic).toBe('auth');
  });

  it('detects coupling risk when files span multiple topics', async () => {
    const diff = [
      'diff --git a/src/Security/UserAuth.php b/src/Security/UserAuth.php',
      '--- a/src/Security/UserAuth.php',
      '+++ b/src/Security/UserAuth.php',
      '@@ -1,1 +1,2 @@',
      '+new code',
      'diff --git a/src/Billing/InvoiceService.php b/src/Billing/InvoiceService.php',
      '--- a/src/Billing/InvoiceService.php',
      '+++ b/src/Billing/InvoiceService.php',
      '@@ -1,1 +1,2 @@',
      '+new code',
    ].join('\n');

    const result = await diffOnlySkill.execute(makeCtx({ diff }));
    expect(result.risks).toEqual(expect.arrayContaining([
      expect.stringMatching(/coupling/i),
    ]));
  });

  it('detects large diff risk when diff exceeds 500 lines', async () => {
    const hunks = Array.from({ length: 501 }, (_, i) => `+line ${i}`);
    const diff = [
      'diff --git a/src/Security/big.php b/src/Security/big.php',
      '--- a/src/Security/big.php',
      '+++ b/src/Security/big.php',
      '@@ -1,1 +1,501 @@',
      ...hunks,
    ].join('\n');

    const result = await diffOnlySkill.execute(makeCtx({ diff }));
    expect(result.risks).toEqual(expect.arrayContaining([
      expect.stringMatching(/large/i),
    ]));
  });

  it('returns generic topic when no topic matches', async () => {
    mockedReadTopicIndex.mockResolvedValue(null);
    const diff = [
      'diff --git a/README.md b/README.md',
      '--- a/README.md',
      '+++ b/README.md',
      '@@ -1,1 +1,2 @@',
      '+updated',
    ].join('\n');

    const result = await diffOnlySkill.execute(makeCtx({ diff }));
    expect(result.topic).toBe('general');
  });

  it('next suggests reviewing most impactful file', async () => {
    const diff = [
      'diff --git a/src/Security/LoginService.php b/src/Security/LoginService.php',
      '--- a/src/Security/LoginService.php',
      '+++ b/src/Security/LoginService.php',
      '@@ -1,1 +1,2 @@',
      '+new method',
    ].join('\n');

    const result = await diffOnlySkill.execute(makeCtx({ diff }));
    expect(result.next).toBe('Review the most impactful changed file');
  });

  it('works when registered and run via runSkill', async () => {
    registerSkill(diffOnlySkill);
    const diff = [
      'diff --git a/src/Security/Auth.php b/src/Security/Auth.php',
      '--- a/src/Security/Auth.php',
      '+++ b/src/Security/Auth.php',
      '@@ -1,1 +1,2 @@',
      '+new code',
    ].join('\n');

    const result = await runSkill('diff-only', makeCtx({ diff }));
    expect(result.goal).toBe('Analyze targeted git diff');
    expect(result.files).toContain('src/Security/Auth.php');
    expect(result.topic).toBe('auth');
  });

  it('handles multiple files in single diff', async () => {
    const diff = [
      'diff --git a/src/Security/Auth.php b/src/Security/Auth.php',
      '--- a/src/Security/Auth.php',
      '+++ b/src/Security/Auth.php',
      '@@ -1,1 +1,2 @@',
      '+added',
      'diff --git a/src/Billing/Payment.php b/src/Billing/Payment.php',
      '--- a/src/Billing/Payment.php',
      '+++ b/src/Billing/Payment.php',
      'deleted file mode 100644',
      '--- a/src/Billing/Payment.php',
      '+++ /dev/null',
    ].join('\n');

    const result = await diffOnlySkill.execute(makeCtx({ diff }));
    expect(result.files).toHaveLength(2);
    expect(result.files).toContain('src/Security/Auth.php');
    expect(result.files).toContain('src/Billing/Payment.php');
  });
});
