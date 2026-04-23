import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerSkill, getSkill, runSkill, clearSkills } from '../../src/skills/index.js';
import { symfonyReviewSkill } from '../../src/skills/symfony-review.js';
import type { SkillContext } from '../../src/skills/types.js';
import type { Topic, BrainData } from '../../src/types.js';

// Mock fs/promises readFile
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));

import { readFile } from 'fs/promises';
const mockReadFile = vi.mocked(readFile);

function makeBrainData(framework: string): BrainData {
  return {
    framework,
    modules: [],
    routes: [],
    commands: [],
    conventions: { standards: [], notes: [], navigation: [] },
    keyFiles: [],
    quickFind: [],
    fileCount: 0,
  };
}

function makeContext(overrides: Partial<SkillContext> = {}): SkillContext {
  return {
    projectDir: '/tmp/project',
    framework: 'symfony',
    brainData: makeBrainData('symfony'),
    ...overrides,
  };
}

function makeTopic(overrides: Partial<Topic> = {}): Topic {
  return {
    name: 'authentication',
    keywords: ['auth', 'login'],
    files: ['src/Service/AuthService.php', 'src/Controller/AuthController.php'],
    routes: [],
    commands: [],
    status: 'up_to_date' as any,
    ...overrides,
  };
}

describe('symfonyReviewSkill', () => {
  beforeEach(() => {
    clearSkills();
    vi.clearAllMocks();
  });

  it('exports correct config', () => {
    expect(symfonyReviewSkill.name).toBe('symfony-review');
    expect(symfonyReviewSkill.config.name).toBe('symfony-review');
    expect(symfonyReviewSkill.config.inputType).toBe('topic');
    expect(symfonyReviewSkill.config.requiredTopics).toEqual([]);
    expect(symfonyReviewSkill.config.description).toContain('Symfony');
  });

  it('returns not-applicable risk for non-symfony/laravel framework', async () => {
    const ctx = makeContext({
      framework: 'nextjs',
      brainData: makeBrainData('nextjs'),
      topic: makeTopic(),
    });

    const result = await symfonyReviewSkill.execute(ctx);
    expect(result.risks).toContain('Not applicable for nextjs');
  });

  it('returns not-applicable risk for generic framework', async () => {
    const ctx = makeContext({
      framework: 'generic',
      brainData: makeBrainData('generic'),
      topic: makeTopic(),
    });

    const result = await symfonyReviewSkill.execute(ctx);
    expect(result.risks).toContain('Not applicable for generic');
  });

  it('works for symfony framework', async () => {
    mockReadFile.mockResolvedValue(`<?php
class AuthService {
    public function authenticate() {}
}
`);

    const ctx = makeContext({
      topic: makeTopic({ files: ['src/Service/AuthService.php'] }),
    });

    const result = await symfonyReviewSkill.execute(ctx);
    expect(result.goal).toContain('authentication');
    expect(result.goal).toContain('Symfony');
    expect(result.topic).toBe('authentication');
    expect(result.next).toBe('Check the service configuration');
  });

  it('works for laravel framework', async () => {
    mockReadFile.mockResolvedValue(`<?php
class UserController {
    public function index() {}
}
`);

    const ctx = makeContext({
      framework: 'laravel',
      brainData: makeBrainData('laravel'),
      topic: makeTopic({ files: ['src/Controller/UserController.php'] }),
    });

    const result = await symfonyReviewSkill.execute(ctx);
    expect(result.risks).not.toContain('Not applicable for laravel');
    expect(result.goal).toContain('Symfony');
  });

  it('detects service classes', async () => {
    mockReadFile.mockResolvedValue(`<?php
class AuthService {
    public function authenticate() {}
}
`);

    const ctx = makeContext({
      topic: makeTopic({ files: ['src/Service/AuthService.php'] }),
    });

    const result = await symfonyReviewSkill.execute(ctx);
    expect(result.actions).toContain('Service: AuthService');
  });

  it('detects AsService attribute', async () => {
    mockReadFile.mockResolvedValue(`<?php
use Symfony\Component\DependencyInjection\Attribute\AsService;

#[AsService]
class MyHandler {
}
`);

    const ctx = makeContext({
      topic: makeTopic({ files: ['src/Handler/MyHandler.php'] }),
    });

    const result = await symfonyReviewSkill.execute(ctx);
    expect(result.actions).toContain('Service: MyHandler');
  });

  it('detects form types extending AbstractType', async () => {
    mockReadFile.mockResolvedValue(`<?php
use Symfony\Component\Form\AbstractType;

class UserType extends AbstractType {
    public function buildForm() {}
}
`);

    const ctx = makeContext({
      topic: makeTopic({ files: ['src/Form/UserType.php'] }),
    });

    const result = await symfonyReviewSkill.execute(ctx);
    expect(result.actions).toContain('FormType: UserType');
  });

  it('detects repository classes', async () => {
    mockReadFile.mockResolvedValue(`<?php
class UserRepository {
    public function findAll() {}
}
`);

    const ctx = makeContext({
      topic: makeTopic({ files: ['src/Repository/UserRepository.php'] }),
    });

    const result = await symfonyReviewSkill.execute(ctx);
    expect(result.actions).toContain('Repository: UserRepository');
  });

  it('detects controller classes', async () => {
    mockReadFile.mockResolvedValue(`<?php
class AuthController {
    public function login() {}
}
`);

    const ctx = makeContext({
      topic: makeTopic({ files: ['src/Controller/AuthController.php'] }),
    });

    const result = await symfonyReviewSkill.execute(ctx);
    expect(result.actions).toContain('Controller: AuthController');
  });

  it('detects form not extending AbstractType as risk', async () => {
    mockReadFile.mockResolvedValue(`<?php
class UserType {
    public function buildForm() {}
}
`);

    const ctx = makeContext({
      topic: makeTopic({ files: ['src/Form/UserType.php'] }),
    });

    const result = await symfonyReviewSkill.execute(ctx);
    expect(result.risks).toContain('Form UserType does not extend AbstractType');
  });

  it('returns files analyzed in result', async () => {
    mockReadFile.mockResolvedValue(`<?php class FooService {}`);

    const files = ['src/Service/FooService.php', 'src/Service/BarService.php'];
    const ctx = makeContext({
      topic: makeTopic({ files }),
    });

    const result = await symfonyReviewSkill.execute(ctx);
    expect(result.files).toEqual(files);
  });

  it('handles readFile failure gracefully', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));

    const ctx = makeContext({
      topic: makeTopic({ files: ['src/Missing.php'] }),
    });

    const result = await symfonyReviewSkill.execute(ctx);
    expect(result.risks).toContain('Could not read file: src/Missing.php');
  });

  it('handles topic with no PHP files', async () => {
    const ctx = makeContext({
      topic: makeTopic({ files: ['src/style.css', 'README.md'] }),
    });

    const result = await symfonyReviewSkill.execute(ctx);
    expect(result.files).toEqual([]);
    expect(result.actions).toEqual([]);
  });

  it('handles missing topic gracefully', async () => {
    const ctx = makeContext({ topic: undefined });

    const result = await symfonyReviewSkill.execute(ctx);
    expect(result.topic).toBe('unknown');
    expect(result.files).toEqual([]);
    expect(result.actions).toEqual([]);
  });

  it('can be registered and run via runSkill', async () => {
    registerSkill(symfonyReviewSkill);
    mockReadFile.mockResolvedValue(`<?php class FooController {}`);

    const ctx = makeContext({
      topic: makeTopic({ files: ['src/Controller/FooController.php'] }),
    });

    const result = await runSkill('symfony-review', ctx);
    expect(result.goal).toContain('authentication');
    expect(result.actions).toContain('Controller: FooController');
  });

  it('filters only PHP files from topic.files', async () => {
    mockReadFile.mockResolvedValue(`<?php class FooService {}`);

    const files = ['src/FooService.php', 'src/config.yaml', 'src/twig.html.twig'];
    const ctx = makeContext({
      topic: makeTopic({ files }),
    });

    const result = await symfonyReviewSkill.execute(ctx);
    expect(result.files).toEqual(['src/FooService.php']);
  });

  it('detects multiple class types in one file', async () => {
    mockReadFile.mockResolvedValue(`<?php
class UserService {
}
class UserRepository {
}
`);

    const ctx = makeContext({
      topic: makeTopic({ files: ['src/UserBundle.php'] }),
    });

    const result = await symfonyReviewSkill.execute(ctx);
    expect(result.actions).toContain('Service: UserService');
    expect(result.actions).toContain('Repository: UserRepository');
  });
});
