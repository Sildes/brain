import { describe, it, expect } from 'vitest';
import { formatBrainMd } from '../src/output.js';
import type { BrainData } from '../src/types.js';

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
