import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { installIde } from '../src/install.js';
import { mkdir, rm, writeFile, readFile, access, stat } from 'node:fs/promises';
import path from 'node:path';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';

vi.mock('../src/agent-generator.js', () => ({
  generateAgentDir: vi.fn().mockResolvedValue([
    '/tmp/test/.agent/prompts/system-base.md',
  ]),
}));

vi.mock('../src/hook.js', () => ({
  installHook: vi.fn().mockResolvedValue('/tmp/test/.git/hooks/pre-commit'),
}));

vi.mock('node:readline/promises', () => ({
  createInterface: vi.fn().mockReturnValue({
    question: vi.fn().mockResolvedValue('n'),
    close: vi.fn(),
  }),
}));

describe('installIde', () => {
  let tmpDir: string;
  let projectDir: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    tmpDir = await mkdtemp(path.join(tmpdir(), 'brain-install-'));
    projectDir = path.join(tmpDir, 'project');
    await mkdir(projectDir, { recursive: true });
    await mkdir(path.join(projectDir, '.projectbrain'), { recursive: true });
    await writeFile(
      path.join(projectDir, '.projectbrain', 'brain.md'),
      `# Project Brain
> Generated: 2026-04-23T18:41:08Z · Symfony · 4 files

## Navigation (CLI)
\`\`\`bash
# List routes
php bin/console debug:router
\`\`\`
`,
      'utf8'
    );
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('creates IDE config file', async () => {
    await installIde({
      dir: projectDir,
      ide: 'claude',
      brainPath: '.projectbrain/brain.md',
      promptPath: '.projectbrain/brain-prompt.md',
    });

    await expect(access(path.join(projectDir, 'CLAUDE.md'))).resolves.toBeUndefined();
  });

  it('generates .agent/ directory after IDE install', async () => {
    const { generateAgentDir } = await import('../src/agent-generator.js');

    await installIde({
      dir: projectDir,
      ide: 'claude',
      brainPath: '.projectbrain/brain.md',
      promptPath: '.projectbrain/brain-prompt.md',
    });

    expect(generateAgentDir).toHaveBeenCalledOnce();
    const callArgs = (generateAgentDir as any).mock.calls[0][0];
    expect(callArgs.projectDir).toBe(projectDir);
    expect(callArgs.framework).toBe('Symfony');
    expect(callArgs.brainData.framework).toBe('Symfony');
    expect(callArgs.brainData.fileCount).toBe(4);
  });

  it('withHook=true calls installHook without prompting', async () => {
    const { installHook } = await import('../src/hook.js');

    await installIde({
      dir: projectDir,
      ide: 'claude',
      brainPath: '.projectbrain/brain.md',
      promptPath: '.projectbrain/brain-prompt.md',
      withHook: true,
    });

    expect(installHook).toHaveBeenCalledWith(projectDir);
  });

  it('withHook=false skips hook install', async () => {
    const { installHook } = await import('../src/hook.js');

    await installIde({
      dir: projectDir,
      ide: 'claude',
      brainPath: '.projectbrain/brain.md',
      promptPath: '.projectbrain/brain-prompt.md',
      withHook: false,
    });

    expect(installHook).not.toHaveBeenCalled();
  });

  it('throws if brain.md missing', async () => {
    const emptyDir = path.join(tmpDir, 'empty');
    await mkdir(emptyDir, { recursive: true });

    await expect(
      installIde({
        dir: emptyDir,
        ide: 'claude',
        brainPath: '.projectbrain/brain.md',
        promptPath: '.projectbrain/brain-prompt.md',
      })
    ).rejects.toThrow('Brain file not found');
  });

  it('uses Generic framework when brain.md has no framework', async () => {
    await writeFile(
      path.join(projectDir, '.projectbrain', 'brain.md'),
      `# Project Brain
> Generated: 2026-04-23T18:41:08Z
`,
      'utf8'
    );

    const { generateAgentDir } = await import('../src/agent-generator.js');

    await installIde({
      dir: projectDir,
      ide: 'claude',
      brainPath: '.projectbrain/brain.md',
      promptPath: '.projectbrain/brain-prompt.md',
      withHook: false,
    });

    const callArgs = (generateAgentDir as any).mock.calls[0][0];
    expect(callArgs.framework).toBe('Generic');
  });

  it('works with --dir option pointing to existing project', async () => {
    await installIde({
      dir: projectDir,
      ide: 'claude',
      brainPath: '.projectbrain/brain.md',
      promptPath: '.projectbrain/brain-prompt.md',
      withHook: false,
    });

    const claudeMd = await readFile(path.join(projectDir, 'CLAUDE.md'), 'utf8');
    expect(claudeMd).toContain('.projectbrain/brain.md');
  });
});
