import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { formatSingleTopicPromptMd } from "./output.js";
import { discoverTopics, mergeOverlappingTopics } from "./discover.js";
import { loadMeta, detectStaleTopics } from "./stale.js";
import { execFile } from "node:child_process";
import type { BrainData, Topic } from "./types.js";
import { TopicStatus } from "./types.js";
import { installIde } from "./install.js";

export interface EnrichOptions {
  dir: string;
  outputDir?: string;
  topic?: string;
  ide?: string;
  stdout?: boolean;
}

interface TopicPromptInfo {
  name: string;
  promptPath: string;
  outputPath: string;
  status: string;
}

async function getTopicsForEnrichment(
  dir: string,
  outputDir: string,
  data: BrainData,
  topicFilter?: string,
): Promise<{ topics: Topic[]; filtered: Topic[] }> {
  const allFiles = await new Promise<string[]>((resolve) => {
    execFile(
      "git",
      ["ls-files", "--cached", "--others", "--exclude-standard"],
      { cwd: dir, maxBuffer: 10 * 1024 * 1024 },
      (err, stdout) => {
        if (err) { resolve([]); return; }
        resolve(stdout.split("\n").filter((f) => f.trim().length > 0));
      },
    );
  });

  const topicFiles = allFiles.filter((f) => {
    if (/^\.|\/\./.test(f)) return false;
    if (/\.(avif|webp|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot|mp[34]|pdf|zip|gz|tar)$/i.test(f)) return false;
    return true;
  });

  let topics = discoverTopics(data, topicFiles);
  topics = mergeOverlappingTopics(topics);

  const topicsDir = path.join(dir, outputDir, "brain-topics");
  const meta = await loadMeta(topicsDir);
  topics = await detectStaleTopics(topics, meta, dir);

  const pending = topics.filter(
    (t) => t.status === TopicStatus.New || t.status === TopicStatus.Stale,
  );

  let filtered: Topic[];
  if (topicFilter && topicFilter.toLowerCase() !== "all") {
    filtered = pending.filter((t) => t.name === topicFilter);
    if (filtered.length === 0) {
      const allNames = topics.map((t) => t.name).join(", ");
      throw new Error(`Topic "${topicFilter}" not found or already enriched. Available: ${allNames}`);
    }
  } else {
    filtered = pending;
  }

  return { topics, filtered };
}

function formatEnrichInstruction(
  topicInfos: TopicPromptInfo[],
  topicsDir: string,
  outputDir: string,
  projectDir: string,
): string {
  const lines: string[] = [];

  lines.push("# Brain Topic Enrichment");
  lines.push("");
  lines.push("Process each topic prompt below. For each topic:");
  lines.push("1. Read the prompt file listed under `Prompt`");
  lines.push("2. Analyze all referenced files in the project");
  lines.push("3. Write the enriched content to the `Output` file");
  lines.push("");
  lines.push("Rules:");
  lines.push("- Process ALL topics — do not skip any");
  lines.push("- Each output file MUST follow the format specified in its prompt");
  lines.push("- Keep the output concise and LLM-optimized (keywords > sentences, bullets > paragraphs)");
  lines.push("- Reference actual file paths and route names from the project");
  lines.push("- Do NOT invent or guess information — only use what you find in the codebase");
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const info of topicInfos) {
    const relPrompt = path.relative(projectDir, info.promptPath);
    const relOutput = path.relative(projectDir, info.outputPath);
    lines.push(`## ${info.name}`);
    lines.push(`- Prompt: \`${relPrompt}\``);
    lines.push(`- Output: \`${relOutput}\``);
    lines.push(`- Status: ${info.status}`);
    lines.push("");
  }

  lines.push("---");
  lines.push("Begin processing now. Read each prompt file and write each output file.");

  return lines.join("\n");
}

export async function enrichTopics(options: EnrichOptions): Promise<void> {
  const { dir, outputDir = ".projectbrain", topic, ide, stdout: printStdout } = options;

  const { findBestAdapter } = await import("./detect.js");
  const result = await findBestAdapter(dir);
  if (!result) {
    throw new Error("No suitable adapter found. Run 'brain scan' first.");
  }

  const { adapter } = result;
  const data = await adapter.extract(dir);
  const { filtered } = await getTopicsForEnrichment(dir, outputDir, data, topic);

  if (filtered.length === 0) {
    console.log("All topics are up to date. Nothing to enrich.");
    return;
  }

  const topicsDir = path.join(dir, outputDir, "brain-topics");
  await mkdir(topicsDir, { recursive: true });

  const topicInfos: TopicPromptInfo[] = [];
  for (const t of filtered) {
    const promptPath = path.join(topicsDir, `${t.name}-prompt.md`);
    const outputPath = path.join(topicsDir, `${t.name}.md`);

    let promptContent: string | null = null;
    try {
      promptContent = await readFile(promptPath, "utf8");
    } catch {
      // prompt file doesn't exist yet — generate it
    }

    if (!promptContent) {
      promptContent = await formatSingleTopicPromptMd(t, dir, data);
      await writeFile(promptPath, promptContent, "utf8");
    }

    topicInfos.push({
      name: t.name,
      promptPath,
      outputPath,
      status: t.status,
    });
  }

  const instruction = formatEnrichInstruction(topicInfos, topicsDir, outputDir, dir);

  if (printStdout) {
    console.log(instruction);
    return;
  }

  const instructionPath = path.join(dir, outputDir, "brain-enrich.md");
  await writeFile(instructionPath, instruction, "utf8");

  console.log(`\n✓ Enrichment instruction generated`);
  console.log(`  Topics to process: ${filtered.length}`);
  for (const info of topicInfos) {
    console.log(`    - ${info.name} (${info.status})`);
  }
  console.log(`\n  Instruction: ${instructionPath}`);
  console.log(`\n  Usage:`);
  console.log(`    1. Open your LLM chat`);
  console.log(`    2. Paste the content of ${path.relative(dir, instructionPath)}`);
  console.log(`    3. The LLM will read each prompt and write enriched topic files`);

  if (ide) {
    console.log(`\n  Installing as IDE rule...`);
    await installIde({
      dir,
      ide,
      brainPath: path.join(outputDir, "brain.md"),
      promptPath: path.join(outputDir, "brain-enrich.md"),
    });
  }
}
