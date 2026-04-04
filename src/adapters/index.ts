import type { Adapter, AdapterMatch } from "../types.js";

const adapters: Adapter[] = [];

export function registerAdapter(adapter: Adapter): void {
  adapters.push(adapter);
  adapters.sort((a, b) => b.priority - a.priority);
}

export function getAdapters(): Adapter[] {
  return [...adapters];
}

export async function detectFramework(dir: string): Promise<{ adapter: Adapter; match: AdapterMatch } | null> {
  for (const adapter of adapters) {
    const match = await adapter.detect(dir);
    if (match.supported) {
      return { adapter, match };
    }
  }
  return null;
}

export function clearAdapters(): void {
  adapters.length = 0;
}
