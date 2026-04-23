import { writeFile, readFile, unlink, mkdir } from "node:fs/promises";
import path from "node:path";
import type { FreshnessData, TopicIndex } from "./types.js";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const HOOK_TEMPLATE = `#!/bin/sh
# Brain pre-commit hook — marks dirty topics
# Installed by: brain hook
# Remove with: brain hook --uninstall

brain _hook-check "$@"
`;

export async function installHook(projectDir: string): Promise<string> {
  const hooksDir = path.join(projectDir, '.git', 'hooks');
  await mkdir(hooksDir, { recursive: true });

  const hookPath = path.join(hooksDir, 'pre-commit');
  await writeFile(hookPath, HOOK_TEMPLATE, 'utf8');

  await execFileAsync('chmod', ['+x', hookPath]);

  return hookPath;
}

export async function uninstallHook(projectDir: string): Promise<boolean> {
  const hookPath = path.join(projectDir, '.git', 'hooks', 'pre-commit');
  try {
    const content = await readFile(hookPath, 'utf8');
    if (content.includes('Installed by: brain hook')) {
      await unlink(hookPath);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function isHookInstalled(projectDir: string): Promise<boolean> {
  const hookPath = path.join(projectDir, '.git', 'hooks', 'pre-commit');
  try {
    const content = await readFile(hookPath, 'utf8');
    return content.includes('Installed by: brain hook');
  } catch {
    return false;
  }
}

export async function getStagedFiles(projectDir: string): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync('git', ['diff', '--cached', '--name-only'], {
      cwd: projectDir,
      maxBuffer: 10 * 1024 * 1024,
    });
    return stdout.split('\n').filter(f => f.trim().length > 0);
  } catch {
    return [];
  }
}

export async function runPreCheck(projectDir: string): Promise<FreshnessData> {
  const outputDir = path.join(projectDir, '.projectbrain');
  const stagedFiles = await getStagedFiles(projectDir);

  let freshness: FreshnessData = {
    entries: {},
    brainMdStatus: 'fresh',
    lastUpdated: new Date().toISOString(),
  };

  let topicIndex: TopicIndex = { topics: {} };

  try {
    const { readFreshness } = await import("./freshness.js");
    const existing = await readFreshness(outputDir);
    if (existing) freshness = existing;
  } catch { /* freshness module may not exist yet */ }

  try {
    const { readTopicIndex } = await import("./topic-index.js");
    const existing = await readTopicIndex(outputDir);
    if (existing) topicIndex = existing;
  } catch { /* topic-index module may not exist yet */ }

  try {
    const { updateFreshnessFromDiff } = await import("./freshness.js");
    freshness = updateFreshnessFromDiff(stagedFiles, freshness, topicIndex);
  } catch { /* freshness module may not exist yet */ }

  try {
    const { writeFreshness } = await import("./freshness.js");
    await writeFreshness(outputDir, freshness);
  } catch { /* freshness module may not exist yet */ }

  return freshness;
}

export function formatPreCheckReport(freshness: FreshnessData): string {
  const lines: string[] = [];
  lines.push('Brain freshness check:');

  const dirtyTopics = Object.entries(freshness.entries)
    .filter(([_, e]) => e.status === 'dirty');

  const staleTopics = Object.entries(freshness.entries)
    .filter(([_, e]) => e.status === 'stale');

  if (dirtyTopics.length > 0) {
    lines.push(`  Dirty topics (${dirtyTopics.length}):`);
    for (const [name, entry] of dirtyTopics) {
      const files = entry.changedFiles ? ` (${entry.changedFiles.length} files changed)` : '';
      lines.push(`    - ${name}${files}`);
    }
  }

  if (staleTopics.length > 0) {
    lines.push(`  Stale topics (${staleTopics.length}):`);
    for (const [name] of staleTopics) {
      lines.push(`    - ${name}`);
    }
  }

  if (dirtyTopics.length === 0 && staleTopics.length === 0) {
    lines.push('  All topics fresh ✓');
  }

  if (freshness.brainMdStatus === 'dirty') {
    lines.push('  brain.md needs update');
  }

  return lines.join('\n');
}
