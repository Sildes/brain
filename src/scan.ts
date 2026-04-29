import { findBestAdapter } from "./detect.js";
import { formatBrainMd, formatBrainPromptMd, writeDraftTopics, writeTopicPrompts } from "./output.js";
import { writeFile, mkdir, readdir, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import type { BrainData, Topic, FreshnessEntry, TopicIndex } from "./types.js";
import { discoverTopics, mergeOverlappingTopics } from "./discover.js";
import { loadMeta, detectStaleTopics, saveMeta, hashFile } from "./stale.js";
import { TopicStatus } from "./types.js";
import { generateTopicIndex, writeTopicIndex, readTopicIndex } from "./topic-index.js";
import { computeFreshness, writeFreshness } from "./freshness.js";
import { generateAgentDir } from "./agent-generator.js";
import { computeTopicDependencies, mergeDependencies } from "./dependency-graph.js";
import { computeTopicQuality } from "./quality.js";

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
  freshnessEntries?: FreshnessEntry[];
}

async function ensureDir(dir: string): Promise<void> {
  try {
    await mkdir(dir, { recursive: true });
  } catch (error: any) {
    if (error.code !== "EEXIST") throw error;
  }
}

async function cleanupStalePrompts(outputDir: string, topicsDir: string): Promise<void> {
  const filesToClean: string[] = [];

  try {
    const entries = await readdir(topicsDir);
    for (const entry of entries) {
      if (entry.endsWith('-prompt.md')) {
        filesToClean.push(path.join(topicsDir, entry));
      }
    }
  } catch {}

  const globalPrompt = path.join(outputDir, 'brain-topics-prompt.md');
  try {
    await readFile(globalPrompt);
    filesToClean.push(globalPrompt);
  } catch {}

  const enrichInstruction = path.join(outputDir, 'brain-enrich.md');
  try {
    await readFile(enrichInstruction);
    filesToClean.push(enrichInstruction);
  } catch {}

  for (const f of filesToClean) {
    try {
      await unlink(f);
    } catch {}
  }
}

async function getAllFiles(dir: string): Promise<string[]> {
  try {
    const { execFile } = await import("node:child_process");
    const result = await new Promise<string>((resolve, reject) => {
      execFile(
        "git",
        ["ls-files", "--cached", "--others", "--exclude-standard"],
        { cwd: dir, maxBuffer: 10 * 1024 * 1024 },
        (err, stdout) => {
          if (err) reject(err);
          else resolve(stdout);
        },
      );
    });

    return result
      .split("\n")
      .filter((f) => f.trim().length > 0);
  } catch {
    return fg("**/*", {
      cwd: dir,
      onlyFiles: true,
      dot: false,
      ignore: [
        ".git/**",
        "node_modules/**",
        "vendor/**",
        ".projectbrain/**",
        "dist/**",
        "build/**",
        "coverage/**",
        ".next/**",
        ".nuxt/**",
        ".cache/**",
        "tmp/**",
        "temp/**",
        "**/*.avif",
        "**/*.webp",
        "**/*.png",
        "**/*.jpg",
        "**/*.jpeg",
        "**/*.gif",
        "**/*.svg",
        "**/*.ico",
        "**/*.woff",
        "**/*.woff2",
        "**/*.ttf",
        "**/*.eot",
        "**/*.mp3",
        "**/*.mp4",
        "**/*.mov",
        "**/*.pdf",
        "**/*.zip",
        "**/*.gz",
        "**/*.tar",
      ],
    });
  }
}

export async function scanProject(options: ScanOptions): Promise<ScanResult> {
  const { dir, outputDir = ".projectbrain", adapter: forcedAdapter } = options;

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

  let depMap: Map<string, { dependsOn: string[]; relatedTo: string[] }> = new Map();
  if (topics.length > 0) {
    depMap = computeTopicDependencies(topics);
  }

  const topicsDir = path.join(dir, outputDir, "brain-topics");

  let freshnessEntries: FreshnessEntry[] | undefined;

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

    const topicIndex = generateTopicIndex(topics, data.framework);

    // Step 4a: Static keyword-based relatedTo
    for (const topic of topics) {
      const deps = depMap.get(topic.name);
      if (deps) {
        topicIndex.topics[topic.name].relatedTo = deps.relatedTo;
        topicIndex.topics[topic.name].dependsOn = [];
      }
    }

    // Step 4b: Post-enrichment processing (LLM deps + quality)
    for (const topic of topics) {
      if (topic.status === TopicStatus.UpToDate || topic.status === TopicStatus.Stale) {
        const enrichedPath = path.join(topicsDir, `${topic.name}.md`);
        try {
          const enrichedContent = await readFile(enrichedPath, "utf8");
          if (enrichedContent.trim().length > 0) {
            // Parse LLM-inferred dependencies from enriched topic
            const { parseDependenciesFromTopic } = await import("./dependency-graph.js");
            const llmDeps = parseDependenciesFromTopic(enrichedContent, new Set(topics.map(t => t.name)));
            const merged = mergeDependencies(depMap, new Map([[topic.name, llmDeps]]), new Set(topics.map(t => t.name)));
            const mergedDeps = merged.get(topic.name);
            if (mergedDeps) {
              topicIndex.topics[topic.name].dependsOn = mergedDeps.dependsOn;
              topicIndex.topics[topic.name].relatedTo = [...new Set([
                ...(topicIndex.topics[topic.name].relatedTo || []),
                ...mergedDeps.relatedTo,
              ])];
            }

            // Compute quality score
            const quality = computeTopicQuality(topic, enrichedContent);
            if (quality) {
              metaTopics[topic.name].quality = quality;
            }
          }
        } catch {
          // Enriched file doesn't exist or can't be read — skip post-enrichment
        }
      }
    }

    // Re-write meta with quality scores
    await saveMeta(topicsDir, { topics: metaTopics });

    const topicIndexPath = await writeTopicIndex(topicsDir, topicIndex);
    console.log(`Generated: ${topicIndexPath}`);

    const freshness = computeFreshness(topics);
    const freshnessPath = await writeFreshness(topicsDir, freshness);
    console.log(`Generated: ${freshnessPath}`);
    freshnessEntries = Object.values(freshness.entries);

    const topicsList = topics.map(t => `- ${t.name}`).join('\n');
    const agentFiles = await generateAgentDir({
      projectDir: dir,
      framework: data.framework,
      brainData: data,
      topicsList,
    });
    for (const f of agentFiles) {
      console.log(`Generated: ${f}`);
    }
  }

  const brainMd = formatBrainMd(data, dir, undefined, topics, depMap);
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
    await cleanupStalePrompts(outputPath, topicsDir);
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
    freshnessEntries,
  };
}