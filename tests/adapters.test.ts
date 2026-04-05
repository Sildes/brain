import { describe, it, expect, beforeEach } from 'vitest';
import { findBestAdapter } from '../src/detect.js';
import { registerAdapter, clearAdapters } from '../src/adapters/index.js';
import { symfonyAdapter } from '../src/adapters/symfony.js';
import { laravelAdapter } from '../src/adapters/laravel.js';
import { nextjsAdapter } from '../src/adapters/nextjs.js';
import { genericAdapter } from '../src/adapters/generic.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, 'fixtures');

describe('findBestAdapter', () => {
  beforeEach(() => {
    clearAdapters();
    registerAdapter(symfonyAdapter);
    registerAdapter(laravelAdapter);
    registerAdapter(nextjsAdapter);
    registerAdapter(genericAdapter);
  });

  it('detects symfony from composer.json', async () => {
    const result = await findBestAdapter(path.join(fixturesDir, 'symfony'));

    expect(result).not.toBeNull();
    expect(result!.adapter.name).toBe('symfony');
    expect(result!.match.supported).toBe(true);
    expect(result!.match.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('detects laravel from artisan + composer.json', async () => {
    const result = await findBestAdapter(path.join(fixturesDir, 'laravel'));

    expect(result).not.toBeNull();
    expect(result!.adapter.name).toBe('laravel');
    expect(result!.match.supported).toBe(true);
    expect(result!.match.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('detects nextjs from package.json', async () => {
    const result = await findBestAdapter(path.join(fixturesDir, 'nextjs'));

    expect(result).not.toBeNull();
    expect(result!.adapter.name).toBe('nextjs');
    expect(result!.match.supported).toBe(true);
    expect(result!.match.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('falls back to generic adapter', async () => {
    const result = await findBestAdapter(path.join(fixturesDir, 'generic'));

    expect(result).not.toBeNull();
    expect(result!.adapter.name).toBe('generic');
    expect(result!.match.supported).toBe(true);
  });
});
