import { describe, it, expect, beforeEach } from 'vitest';
import { formatBrainMd, formatTopicPromptMd, formatSingleTopicPromptMd, formatTopicsSection } from '../src/output.js';
import type { BrainData, Topic } from '../src/types.js';
import { TopicStatus } from '../src/types.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

function makeBrainData(overrides: Partial<BrainData> = {}): BrainData {
  return {
    framework: 'TestFramework',
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

describe('formatBrainMd', () => {
  it('includes modules section', () => {
    const data = makeBrainData({
      modules: [
        { name: 'Booking', path: 'src/Booking', dependsOn: [], confidence: 0.9 },
        { name: 'Payment', path: 'src/Payment', dependsOn: ['Booking'], confidence: 0.8 },
      ],
      fileCount: 42,
    });
    const output = formatBrainMd(data, '/tmp');

    expect(output).toContain('Booking');
    expect(output).toContain('Payment');
    expect(output).toContain('src/Booking');
    expect(output).toContain('src/Payment');
    expect(output).toContain('## Modules');
  });

  it('includes routes section', () => {
    const data = makeBrainData({
      routes: [
        { name: 'api_users_list', path: '/api/users', methods: ['GET'], controller: 'UserController' },
        { name: 'api_users_create', path: '/api/users', methods: ['POST'], controller: 'UserController' },
      ],
      fileCount: 10,
    });
    const output = formatBrainMd(data, '/tmp');

    expect(output).toContain('/api/users');
    expect(output).toContain('api_users_list');
    expect(output).toContain('## Routes');
  });

  it('handles empty data gracefully', () => {
    const data = makeBrainData({ fileCount: 0 });
    const output = formatBrainMd(data, '/tmp');

    expect(output).toContain('# 🧠 Project Brain');
    expect(output).toContain('TestFramework');
    expect(output).toContain('## Meta');
    expect(output).toContain('## Quick Find');
  });

  it('includes conventions when present', () => {
    const data = makeBrainData({
      conventions: {
        standards: ['PSR-12'],
        notes: ['Keep controllers thin'],
        navigation: [
          { description: 'List routes', command: 'php bin/console debug:router' },
        ],
      },
      fileCount: 5,
    });
    const output = formatBrainMd(data, '/tmp');

    expect(output).toContain('PSR-12');
    expect(output).toContain('Keep controllers thin');
    expect(output).toContain('php bin/console debug:router');
  });

  it('includes quick find mappings', () => {
    const data = makeBrainData({
      quickFind: [
        { task: 'Add an API endpoint', location: 'src/Controller/' },
        { task: 'Find tests', location: 'tests/' },
      ],
      fileCount: 5,
    });
    const output = formatBrainMd(data, '/tmp');

    expect(output).toContain('Add an API endpoint');
    expect(output).toContain('src/Controller/');
    expect(output).toContain('Find tests');
    expect(output).toContain('tests/');
  });
});

describe('formatTopicPromptMd', () => {
  let tempDir: string;
  let testTopics: Topic[];
  let testData: BrainData;

  beforeEach(async () => {
    tempDir = path.join(tmpdir(), `brain-test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });

    testTopics = [
      {
        name: 'user',
        keywords: ['user', 'auth'],
        files: ['src/User.ts', 'src/Auth.ts'],
        routes: [],
        commands: [],
        status: TopicStatus.New,
      },
      {
        name: 'payment',
        keywords: ['payment', 'checkout'],
        files: ['src/Payment.ts', 'src/Checkout.ts'],
        routes: [],
        commands: [],
        status: TopicStatus.New,
      },
    ];

    testData = makeBrainData({
      fileCount: 42,
    });
  });

  it('includes dependencies section in output format', async () => {
    const output = await formatTopicPromptMd(testTopics, tempDir, testData);

    expect(output).toContain('## dependencies');
    expect(output).toContain('depends_on: topic-a, topic-b');
    expect(output).toContain('related_to: topic-c, topic-d');
  });

  it('includes available topics list', async () => {
    const output = await formatTopicPromptMd(testTopics, tempDir, testData);

    expect(output).toContain('## Available topics (for dependencies)');
    expect(output).toContain('user, payment');
  });
});

describe('formatSingleTopicPromptMd', () => {
  let tempDir: string;
  let testTopic: Topic;
  let testData: BrainData;

  beforeEach(async () => {
    tempDir = path.join(tmpdir(), `brain-test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });

    testTopic = {
      name: 'user',
      keywords: ['user', 'auth'],
      files: ['src/User.ts', 'src/Auth.ts'],
      routes: [],
      commands: [],
      status: TopicStatus.New,
    };

    testData = makeBrainData({
      fileCount: 42,
    });
  });

  it('includes dependencies section in output format', async () => {
    const output = await formatSingleTopicPromptMd(testTopic, tempDir, testData);

    expect(output).toContain('## dependencies');
    expect(output).toContain('depends_on: topic-a, topic-b');
    expect(output).toContain('related_to: topic-c, topic-d');
  });

  it('includes available topics list', async () => {
    const allTopicNames = ['user', 'payment', 'checkout'];
    const output = await formatSingleTopicPromptMd(testTopic, tempDir, testData, allTopicNames);

    expect(output).toContain('## Available topics (for dependencies)');
    expect(output).toContain('payment, checkout');
    expect(output).not.toContain('user, payment, checkout'); // Should filter out the current topic
  });
});

describe('formatTopicsSection', () => {
  it('includes needs: when dependsOn present', () => {
    const topics: Topic[] = [
      {
        name: 'payment',
        keywords: ['payment'],
        files: ['src/Payment.ts'],
        routes: [],
        commands: [],
        status: TopicStatus.New,
      },
    ];

    const depMap = new Map([
      ['payment', { dependsOn: ['user', 'checkout'], relatedTo: [] }],
    ]);

    const output = formatTopicsSection(topics, depMap);

    expect(output).toContain('needs: user, checkout');
  });

  it('includes related: when relatedTo present', () => {
    const topics: Topic[] = [
      {
        name: 'user',
        keywords: ['user'],
        files: ['src/User.ts'],
        routes: [],
        commands: [],
        status: TopicStatus.UpToDate,
      },
    ];

    const depMap = new Map([
      ['user', { dependsOn: [], relatedTo: ['auth', 'profile'] }],
    ]);

    const output = formatTopicsSection(topics, depMap);

    expect(output).toContain('related: auth, profile');
  });

  it('works without depMap (backward compat)', () => {
    const topics: Topic[] = [
      {
        name: 'user',
        keywords: ['user'],
        files: ['src/User.ts'],
        routes: [],
        commands: [],
        status: TopicStatus.New,
      },
    ];

    const output = formatTopicsSection(topics);

    expect(output).toContain('**user**');
    expect(output).toContain('[+]');
    expect(output).toContain('1 files');
    expect(output).not.toContain('needs:');
    expect(output).not.toContain('related:');
  });

  it('omits dep info when arrays are empty', () => {
    const topics: Topic[] = [
      {
        name: 'user',
        keywords: ['user'],
        files: ['src/User.ts'],
        routes: [],
        commands: [],
        status: TopicStatus.New,
      },
    ];

    const depMap = new Map([
      ['user', { dependsOn: [], relatedTo: [] }],
    ]);

    const output = formatTopicsSection(topics, depMap);

    expect(output).toContain('**user**');
    expect(output).not.toContain('needs:');
    expect(output).not.toContain('related:');
  });

  it('shows both needs and related when both present', () => {
    const topics: Topic[] = [
      {
        name: 'checkout',
        keywords: ['checkout'],
        files: ['src/Checkout.ts'],
        routes: [],
        commands: [],
        status: TopicStatus.Stale,
      },
    ];

    const depMap = new Map([
      ['checkout', { dependsOn: ['cart', 'payment'], relatedTo: ['user', 'order'] }],
    ]);

    const output = formatTopicsSection(topics, depMap);

    expect(output).toContain('needs: cart, payment');
    expect(output).toContain('related: user, order');
  });
});
