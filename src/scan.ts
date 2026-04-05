import { findBestAdapter } from "./detect.js";
import { formatBrainMd, formatBrainPromptMd, writeDraftTopics, writeTopicPrompts } from "./output.js";
import { writeFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import type { BrainData, Topic } from "./types.js";
import { discoverTopics, mergeOverlappingTopics } from "./discover.js";
import { loadMeta, detectStaleTopics, saveMeta, hashFile } from "./stale.js";
import { TopicStatus } from "./types.js";

export interface ScanOptions {
  dir: string;
  outputDir?: string;
  adapter?: string;
}

export interface TopicSummary {
  name: string;
  status: string;
  fileCount: number;
  routeCount: number;
  commandCount: number;
  staleReason?: string;
  staleDetails?: {
    added?: string[];
    removed?: string[];
    modified?: string[];
  };
}

export interface ScanResult {
  framework: string;
  confidence: number;
  fileCount: number;
  moduleCount: number;
  routeCount: number;
  commandCount: number;
  brainPath: string;
  promptPath: string;
  topics: TopicSummary[];
  promptFiles: string[];
}

async function ensureDir(dir: string): Promise<void> {
  try {
    await mkdir(dir, { recursive: true });
  } catch (error: any) {
    if (error.code !== "EEXIST") throw error;
  }
}

async function getAllFiles(dir: string): Promise<string[]> {
  try {
    const { execFile } = await import("node:child_process");
    const result = await new Promise<string>((resolve, reject) => {
      execFile("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: dir, maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
        if (err) reject(err);
        else resolve(stdout);
      });
    });
    const files = result
      .split("\n")
      .filter((f) => f.trim().length > 0);
    return files;
  } catch {
    return [];
  }
}

export async function scanProject(options: ScanOptions): Promise<ScanResult> {
  const { dir, outputDir = ".project", adapter: forcedAdapter } = options;

  const result = await findBestAdapter(dir);

  if (!result) {
    throw new Error("No suitable adapter found for this project");
  }

  const { adapter, match } = result;

  if (forcedAdapter && adapter.name !== forcedAdapter) {
    throw new Error(`Forced adapter "${forcedAdapter}" does not match detected framework "${adapter.name}"`);
  }

  console.log(`Detected: ${match.framework} (confidence: ${(match.confidence * 100).toFixed(0)}%)`);
  console.log(`Reasons: ${match.reasons.join(", ")}`);

  console.log(`Scanning project with ${adapter.name} adapter...`);
  const data: BrainData = await adapter.extract(dir);

  const allFiles = await getAllFiles(dir);

  const topicFiles = allFiles.filter((f) => {
    if (/^\.|\/\./.test(f)) return false;
    if (/\.(avif|webp|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot|mp[34]|pdf|zip|gz|tar|mp4|mov)$/i.test(f)) return false;
    if (f.startsWith('vendor/') || f.startsWith('node_modules/')) return false;
    return true;
  });

  let topics: Topic[] = [];
  try {
    topics = discoverTopics(data, topicFiles);
    topics = mergeOverlappingTopics(topics);
  } catch (e: any) {
    console.log("Topic discovery skipped:", e.message);
  }

  const topicsDir = path.join(dir, outputDir, "brain-topics");

  if (topics.length > 0) {
    const meta = await loadMeta(topicsDir);
    topics = await detectStaleTopics(topics, meta, dir);

    await writeDraftTopics(topicsDir, topics);

    const now = new Date().toISOString();
    const { hashContent } = await import("./stale.js");
    const metaTopics: Record<string, any> = {};
    for (const topic of topics) {
      const fileHashes: Record<string, string> = {};
      for (const file of topic.files.slice(0, 20)) {
        try {
          fileHashes[file] = await hashFile(path.join(dir, file));
        } catch {
          continue;
        }
      }
      metaTopics[topic.name] = {
        draft_generated: now,
        enriched_at: meta?.topics[topic.name]?.enriched_at || null,
        enriched_files: meta?.topics[topic.name]?.enriched_files || [],
        file_hashes: fileHashes,
        status: topic.status,
        status_reason: topic.staleReason,
        status_details: topic.staleDetails,
      };
    }
    await saveMeta(topicsDir, { topics: metaTopics });
  }

  const brainMd = formatBrainMd(data, dir, undefined, topics);
  const brainPromptMd = await formatBrainPromptMd(data, dir);

  const outputPath = path.join(dir, outputDir);
  await ensureDir(outputPath);
  await ensureDir(topicsDir);

  const brainPath = path.join(outputPath, "brain.md");
  const promptPath = path.join(outputPath, "brain-prompt.md");

  await writeFile(brainPath, brainMd, "utf8");
  await writeFile(promptPath, brainPromptMd, "utf8");

  console.log(`Generated: ${brainPath}`);
  console.log(`Generated: ${promptPath}`);

  let promptFiles: string[] = [];
  if (topics.length > 0) {
    promptFiles = await writeTopicPrompts(outputPath, topicsDir, topics, dir, data);
  }

  const topicSummaries: TopicSummary[] = topics.map((t) => ({
    name: t.name,
    status: t.status,
    fileCount: t.files.length,
    routeCount: t.routes.length,
    commandCount: t.commands.length,
    staleReason: t.staleReason,
    staleDetails: t.staleDetails,
  }));

  return {
    framework: data.framework,
    confidence: match.confidence,
    fileCount: data.fileCount,
    moduleCount: data.modules.length,
    routeCount: data.routes.length,
    commandCount: data.commands.length,
    brainPath,
    promptPath,
    topics: topicSummaries,
    promptFiles,
  };
}
