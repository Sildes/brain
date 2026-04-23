import type { Topic, TopicIndex, FreshnessData, FreshnessEntry } from "./types.js";
import { writeFile, readFile, mkdir } from "node:fs/promises";
import path from "node:path";

export function computeFreshness(topics: Topic[]): FreshnessData {
  const entries: Record<string, FreshnessEntry> = {};
  const now = new Date().toISOString();

  for (const topic of topics) {
    let status: FreshnessEntry['status'] = 'fresh';
    if (topic.status === 'stale') status = 'stale';
    else if (topic.status === 'new') status = 'dirty';

    entries[topic.name] = {
      topic: topic.name,
      status,
      lastCheck: now,
    };
  }

  return {
    entries,
    brainMdStatus: 'fresh',
    lastUpdated: now,
  };
}

export function updateFreshnessFromDiff(
  stagedFiles: string[],
  currentFreshness: FreshnessData,
  topicIndex: TopicIndex,
): FreshnessData {
  const updated = { ...currentFreshness };
  updated.entries = { ...currentFreshness.entries };
  updated.lastUpdated = new Date().toISOString();

  let brainMdDirty = false;

  for (const file of stagedFiles) {
    if (file.includes('brain.md') || file.includes('brain-prompt.md')) {
      brainMdDirty = true;
    }

    for (const [topicName, entry] of Object.entries(topicIndex.topics)) {
      const matchesPath = entry.paths.some(p => file.startsWith(p));
      const matchesKeyword = entry.keywords.some(kw =>
        file.toLowerCase().includes(kw.toLowerCase()),
      );

      if (matchesPath || matchesKeyword) {
        if (updated.entries[topicName]) {
          updated.entries[topicName] = {
            ...updated.entries[topicName],
            status: 'dirty',
            lastCheck: updated.lastUpdated,
            changedFiles: [
              ...(updated.entries[topicName].changedFiles || []),
              file,
            ],
          };
        }
      }
    }
  }

  if (brainMdDirty) {
    updated.brainMdStatus = 'dirty';
  }

  return updated;
}

export function formatFreshnessYaml(data: FreshnessData): string {
  const lines: string[] = ['entries:'];
  for (const [name, entry] of Object.entries(data.entries)) {
    lines.push(`  ${name}:`);
    lines.push(`    status: ${entry.status}`);
    lines.push(`    last_check: ${entry.lastCheck}`);
    if (entry.changedFiles && entry.changedFiles.length > 0) {
      lines.push('    changed_files:');
      for (const f of entry.changedFiles) {
        lines.push(`      - ${f}`);
      }
    }
  }
  lines.push(`brain_md_status: ${data.brainMdStatus}`);
  lines.push(`last_updated: ${data.lastUpdated}`);
  return lines.join('\n') + '\n';
}

export function parseFreshnessYaml(content: string): FreshnessData {
  const entries: Record<string, FreshnessEntry> = {};
  const lines = content.split('\n');
  let currentTopic = '';
  let currentField = '';
  let brainMdStatus: FreshnessData['brainMdStatus'] = 'fresh';
  let lastUpdated = '';

  for (const line of lines) {
    if (line.startsWith('entries:')) continue;
    if (line.startsWith('brain_md_status:')) {
      brainMdStatus = line.substring(line.indexOf(':') + 1).trim() as FreshnessData['brainMdStatus'];
      continue;
    }
    if (line.startsWith('last_updated:')) {
      lastUpdated = line.substring(line.indexOf(':') + 1).trim();
      continue;
    }
    if (!line.startsWith('  ')) continue;

    const indent2 = line.substring(2);
    if (!indent2.startsWith(' ') && indent2.includes(':')) {
      currentTopic = indent2.split(':')[0].trim();
      entries[currentTopic] = { topic: currentTopic, status: 'fresh', lastCheck: '' };
      currentField = '';
      continue;
    }

    if (!currentTopic) continue;

    const indent4 = line.startsWith('    ') ? line.substring(4) : null;
    if (indent4 && indent4.includes(':') && !indent4.startsWith(' ')) {
      const [key, ...rest] = indent4.split(':');
      const val = rest.join(':').trim();
      currentField = key.trim();
      if (currentField === 'status') entries[currentTopic].status = val as FreshnessEntry['status'];
      if (currentField === 'last_check') entries[currentTopic].lastCheck = val;
      continue;
    }

    if (line.trim().startsWith('- ') && currentField === 'changed_files') {
      entries[currentTopic].changedFiles = entries[currentTopic].changedFiles || [];
      entries[currentTopic].changedFiles!.push(line.trim().substring(2).trim());
    }
  }

  return { entries, brainMdStatus, lastUpdated };
}

export async function writeFreshness(outputDir: string, data: FreshnessData): Promise<string> {
  await mkdir(outputDir, { recursive: true });
  const filePath = path.join(outputDir, 'freshness.yaml');
  await writeFile(filePath, formatFreshnessYaml(data), 'utf8');
  return filePath;
}

export async function readFreshness(outputDir: string): Promise<FreshnessData | null> {
  try {
    const filePath = path.join(outputDir, 'freshness.yaml');
    const content = await readFile(filePath, 'utf8');
    return parseFreshnessYaml(content);
  } catch {
    return null;
  }
}
