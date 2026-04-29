import type { BrainData, Module, Route, Command, Topic, TopicMetadata, TopicMeta } from "./types.js";
import { TopicStatus } from "./types.js";
import { readFile, stat, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { hashFile } from "./stale.js";

const MAX_FILES = 10;
const MAX_TOKENS = 20000;

function estimateTokens(content: string): number {
  return Math.ceil(content.length / 4);
}

function formatDate(date: Date): string {
  return date.toISOString().split(".")[0] + "Z";
}

export function formatBrainMd(
  data: BrainData,
  dir: string,
  businessContext?: string,
  topics?: Topic[],
  depMap?: Map<string, { dependsOn: string[]; relatedTo: string[] }>,
): string {
  const lines: string[] = [];

  // Header
  lines.push(`# 🧠 Project Brain`);
  lines.push(`> Generated: ${formatDate(new Date())} · ${data.framework} · ${data.fileCount} files`);
  lines.push("");

  // At a Glance
  lines.push("## At a Glance");
  lines.push(`- **Modules**: ${data.modules.map((m) => m.name).join(", ") || "none detected"}`);
  lines.push(`- **Routes**: ${data.routes.length} HTTP endpoints`);
  lines.push(`- **Commands**: ${data.commands.length} CLI commands`);
  lines.push(`- **Key Files**: ${data.keyFiles.length} identified`);
  lines.push("");

  // Modules
  if (data.modules.length > 0) {
    lines.push("## Modules");
    lines.push("");
    for (const mod of data.modules) {
      lines.push(`### ${mod.name}`);
      lines.push(`- **Path**: \`${mod.path}\``);
      if (mod.dependsOn.length > 0) {
        lines.push(`- **Depends on**: ${mod.dependsOn.map((d) => `\`${d}\``).join(", ")}`);
      }
      lines.push("");
    }
  }

  // Routes (filtered, grouped by module)
  const businessRoutes = data.routes.filter((r) => !r.name.startsWith("_") && !r.name.startsWith("_wdt") && !r.name.startsWith("_profiler"));
  const technicalRoutes = data.routes.length - businessRoutes.length;
  
  if (businessRoutes.length > 0) {
    lines.push("## Routes");
    lines.push("");
    lines.push(`Total: ${data.routes.length} (${businessRoutes.length} business, ${technicalRoutes} technical)`);
    lines.push("");
    
    // Group by module
    const routesByModule = new Map<string, typeof businessRoutes>();
    const routesNoModule: typeof businessRoutes = [];
    
    for (const route of businessRoutes) {
      if (route.module) {
        if (!routesByModule.has(route.module)) {
          routesByModule.set(route.module, []);
        }
        routesByModule.get(route.module)!.push(route);
      } else {
        routesNoModule.push(route);
      }
    }
    
    // Output routes by module
    for (const [mod, routes] of routesByModule) {
      const modName = mod.charAt(0).toUpperCase() + mod.slice(1);
      lines.push(`### ${modName}`);
      lines.push("");
      lines.push("| Route | Method | Path |");
      lines.push("|-------|--------|------|");
      for (const r of routes.slice(0, 20)) {
        const method = r.methods?.[0] || "GET";
        const shortName = r.name.length > 30 ? r.name.substring(0, 27) + "..." : r.name;
        lines.push(`| ${shortName} | ${method} | \`${r.path}\` |`);
      }
      if (routes.length > 20) {
        lines.push(`| ... | ... | _+${routes.length - 20} more_ |`);
      }
      lines.push("");
    }
    
    // Routes without module
    if (routesNoModule.length > 0 && routesNoModule.length <= 30) {
      lines.push(`### Other`);
      lines.push("");
      lines.push("| Route | Method | Path |");
      lines.push("|-------|--------|------|");
      for (const r of routesNoModule.slice(0, 20)) {
        const method = r.methods?.[0] || "GET";
        lines.push(`| ${r.name} | ${method} | \`${r.path}\` |`);
      }
      if (routesNoModule.length > 20) {
        lines.push(`| ... | ... | _+${routesNoModule.length - 20} more_ |`);
      }
      lines.push("");
    }
    
    lines.push(`CLI: \`php bin/console debug:router\` for full list`);
    lines.push("");
  }

  // Navigation
  lines.push("## Navigation (CLI)");
  lines.push("```bash");
  for (const nav of data.conventions.navigation || []) {
    lines.push(`# ${nav.description}`);
    lines.push(nav.command);
    lines.push("");
  }
  lines.push("```");
  lines.push("");

  // Conventions
  if (data.conventions.standards.length > 0 || data.conventions.notes.length > 0) {
    lines.push("## Conventions");
    if (data.conventions.standards.length > 0) {
      lines.push(`- **Standards**: ${data.conventions.standards.join(", ")}`);
    }
    for (const note of data.conventions.notes) {
      lines.push(`- ${note}`);
    }
    lines.push("");
  }

  // Quick Find
  lines.push("## Quick Find");
  lines.push("");
  lines.push("| I need to... | Look in... |");
  lines.push("|-------------|------------|");
  for (const mapping of data.quickFind) {
    lines.push(`| ${mapping.task} | \`${mapping.location}\` |`);
  }
  lines.push("");

  // Business Context (if provided - preserved from update)
  if (businessContext) {
    lines.push(businessContext);
    lines.push("");
  }

  // Topics
  if (topics && topics.length > 0) {
    const topicsSection = formatTopicsSection(topics, depMap);
    if (topicsSection) {
      lines.push(topicsSection);
    }
  }

  // Meta
  lines.push("## Meta");
  lines.push("");
  lines.push("| Property | Value |");
  lines.push("|----------|-------|");
  lines.push(`| Framework | ${data.framework} |`);
  lines.push(`| Files scanned | ${data.fileCount} |`);
  lines.push(`| Generated | ${formatDate(new Date())} |`);
  lines.push("");
  lines.push("### When to Refresh");
  lines.push("- **Re-run `brain scan`** when: adding/removing modules, major refactoring");
  lines.push("- **Re-run `brain prompt`** when: business logic changes significantly");

  return lines.join("\n");
}

export async function formatBrainPromptMd(data: BrainData, dir: string): Promise<string> {
  const lines: string[] = [];

  lines.push("# LLM Context Prompt");
  lines.push("");
  lines.push("TASK: analyze codebase → explain business context");
  lines.push("");
  lines.push("## Project");
  lines.push("");
  lines.push(`| Property | Value |`);
  lines.push(`|----------|-------|`);
  lines.push(`| Framework | ${data.framework} |`);
  lines.push(`| Modules | ${data.modules.length} |`);
  lines.push(`| Routes | ${data.routes.length} |`);
  lines.push(`| Commands | ${data.commands.length} |`);
  lines.push("");

  if (data.modules.length > 0) {
    lines.push("### Modules");
    for (const mod of data.modules.slice(0, 10)) {
      lines.push(`- ${mod.name}: \`${mod.path}\``);
    }
    lines.push("");
  }

  // Select key files for prompt
  const selectedFiles = await selectKeyFiles(data, dir);

  if (selectedFiles.length > 0) {
    lines.push("## Key Files");
    lines.push("");

    for (const file of selectedFiles) {
      lines.push(`### ${file.relativePath}`);
      lines.push("```" + inferLanguage(file.relativePath));
      lines.push(file.content);
      lines.push("```");
      lines.push("");
    }
  }

  lines.push("---");
  lines.push("");
  lines.push("## Instructions");
  lines.push("");
  lines.push("OUTPUT: markdown section for brain.md");
  lines.push("");
  lines.push("PROVIDE:");
  lines.push("```md");
  lines.push("## Business Context");
  lines.push("");
  lines.push("### Purpose");
  lines.push("<1-2 sentences: what system does>");
  lines.push("");
  lines.push("### Flows");
  lines.push("<key business flows: step → class/service>");
  lines.push("");
  lines.push("### Concepts");
  lines.push("<domain terms: term = definition>");
  lines.push("");
  lines.push("### Gotchas");
  lines.push("<surprising behaviors, edge cases>");
  lines.push("");
  lines.push("### Decisions");
  lines.push("<architecture choices: why X>");
  lines.push("```");
  lines.push("");
  lines.push("STYLE:");
  lines.push("- keywords > sentences");
  lines.push("- bullet points > paragraphs");
  lines.push("- code references: `ClassName::method`");
  lines.push("- be concise, token-efficient");

  return lines.join("\n");
}

async function selectKeyFiles(
  data: BrainData,
  dir: string
): Promise<Array<{ relativePath: string; content: string }>> {
  const files: Array<{ relativePath: string; content: string; priority: number }> = [];
  let totalTokens = 0;

  // Prioritize: controllers, services, domain models
  const priorityPatterns = [
    { pattern: /Controller/, priority: 10 },
    { pattern: /Service/, priority: 9 },
    { pattern: /Repository/, priority: 8 },
    { pattern: /Entity/, priority: 7 },
    { pattern: /Model/, priority: 6 },
  ];

  for (const keyFile of data.keyFiles.slice(0, MAX_FILES * 2)) {
    if (files.length >= MAX_FILES) break;

    const filePath = path.join(dir, keyFile.path);
    try {
      await stat(filePath);
      const content = await readFile(filePath, "utf8");
      const tokens = estimateTokens(content);

      if (totalTokens + tokens > MAX_TOKENS) continue;

      // Calculate priority
      let priority = 5;
      for (const { pattern, priority: p } of priorityPatterns) {
        if (pattern.test(keyFile.path) || pattern.test(keyFile.role)) {
          priority = p;
          break;
        }
      }

      files.push({ relativePath: keyFile.path, content, priority });
      totalTokens += tokens;
    } catch {
      // File doesn't exist or can't be read
    }
  }

  // Sort by priority and return
  return files
    .sort((a, b) => b.priority - a.priority)
    .slice(0, MAX_FILES);
}

function inferLanguage(filePath: string): string {
  const ext = path.extname(filePath);
  const langMap: Record<string, string> = {
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".php": "php",
    ".py": "python",
    ".rb": "ruby",
    ".go": "go",
    ".rs": "rust",
    ".java": "java",
    ".json": "json",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".md": "markdown",
  };
  return langMap[ext] || "";
}

export function formatDraftTopicMd(topic: Topic): string {
  const lines: string[] = [];
  lines.push(`# ${topic.name}`);
  lines.push(`> DRAFT — Auto-generated, may be incomplete`);
  lines.push("");

  lines.push("## Keywords");
  lines.push(topic.keywords.map((k) => `\`${k}\``).join(", "));
  lines.push("");

  lines.push(`## Files (${topic.files.length})`);
  for (const f of topic.files) {
    lines.push(`- \`${f}\``);
  }
  lines.push("");

  if (topic.routes.length > 0) {
    lines.push(`## Routes (${topic.routes.length})`);
    lines.push("| Method | Path | Name |");
    lines.push("|--------|------|------|");
    for (const r of topic.routes) {
      const method = r.methods?.[0] || "GET";
      lines.push(`| ${method} | ${r.path} | ${r.name} |`);
    }
    lines.push("");
  }

  if (topic.commands.length > 0) {
    lines.push(`## Commands (${topic.commands.length})`);
    for (const cmd of topic.commands) {
      const desc = cmd.description ? ` — ${cmd.description}` : "";
      lines.push(`- \`${cmd.name}\`${desc}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

async function ensureDir(dir: string): Promise<void> {
  try {
    await mkdir(dir, { recursive: true });
  } catch (error: any) {
    if (error.code !== "EEXIST") throw error;
  }
}

export async function writeDraftTopics(topicsDir: string, topics: Topic[]): Promise<void> {
  const draftDir = path.join(topicsDir, ".draft");
  await ensureDir(draftDir);

  for (const topic of topics) {
    const filePath = path.join(draftDir, `${topic.name}.md`);
    const content = formatDraftTopicMd(topic);
    await writeFile(filePath, content, "utf8");
  }
}

function getFilePriority(p: string): number {
  if (/Controller/.test(p)) return 10;
  if (/Service/.test(p)) return 9;
  if (/(Entity|Model)/.test(p)) return 8;
  if (/Repository/.test(p)) return 7;
  if (/config/i.test(p)) return 6;
  if (/test/i.test(p)) return 3;
  return 5;
}

interface KeyFileContent {
  relativePath: string;
  content: string;
}

async function selectKeyFilesForTopic(
  topic: Topic,
  projectDir: string,
  maxTokens: number,
): Promise<KeyFileContent[]> {
  const candidates = topic.files
    .map((f) => ({
      path: f,
      priority: getFilePriority(f),
    }))
    .sort((a, b) => b.priority - a.priority);

  const selected: KeyFileContent[] = [];
  let tokens = 0;

  for (const candidate of candidates.slice(0, 10)) {
    const fullPath = path.join(projectDir, candidate.path);
    try {
      const content = await readFile(fullPath, "utf8");
      const fileTokens = estimateTokens(content);
      if (tokens + fileTokens > maxTokens) continue;
      selected.push({ relativePath: candidate.path, content });
      tokens += fileTokens;
    } catch {
      continue;
    }
  }

  return selected;
}

export async function formatTopicPromptMd(
  topics: Topic[],
  projectDir: string,
  data: BrainData,
): Promise<string> {
  const lines: string[] = [];

  lines.push("# Brain Topic Enrichment");
  lines.push("");
  lines.push(`Framework: ${data.framework} · ${data.fileCount} files · ${data.routes.length} routes`);
  lines.push("");
  lines.push("GOAL: enrich each topic draft below into a compact LLM-optimized file.");
  lines.push("CRITICAL: YAML-like format. No prose. No markdown tables. `ClassName::method` > descriptions. Max 200 lines/topic.");
  lines.push("");

  const staleNew = topics.filter(
    (t) => t.status === TopicStatus.New || t.status === TopicStatus.Stale,
  );

  lines.push("## Steps");
  lines.push("");
  lines.push("For each topic below:");
  lines.push("1. READ the listed files to understand the domain");
  lines.push("2. VALIDATE — remove irrelevant files, add missing ones (check imports, deps)");
  lines.push("3. WRITE enriched file to `.projectbrain/brain-topics/[name].md` using the format below");
  lines.push("");

  lines.push(`## Topics (${staleNew.length})`);
  lines.push("");

  for (let i = 0; i < staleNew.length; i++) {
    const topic = staleNew[i];
    lines.push(`### ${i + 1}/${staleNew.length}: ${topic.name}`);
    lines.push(`keywords: ${topic.keywords.join(", ")}`);
    lines.push(`output: .projectbrain/brain-topics/${topic.name}.md`);
    lines.push("");

    if (topic.routes.length > 0) {
      lines.push("routes:");
      for (const r of topic.routes) {
        lines.push(`  ${r.methods?.[0] || "GET"} ${r.path}: ${r.name}`);
      }
      lines.push("");
    }

    if (topic.commands.length > 0) {
      lines.push("commands:");
      for (const cmd of topic.commands) {
        const desc = cmd.description ? ` — ${cmd.description}` : "";
        lines.push(`  ${cmd.name}${desc}`);
      }
      lines.push("");
    }

    lines.push("read these files:");
    const keyFiles = await selectKeyFilesForTopic(topic, projectDir, 5000);
    for (const kf of keyFiles) {
      lines.push(`  ${kf.relativePath}`);
    }
    for (const f of topic.files) {
      if (!keyFiles.some((kf) => kf.relativePath === f)) {
        lines.push(`  ${f}`);
      }
    }
    lines.push("");
  }

  const allTopicNames = staleNew.map(t => t.name);
  lines.push("## Available topics (for dependencies)");
  lines.push(allTopicNames.join(", "));
  lines.push("");

  lines.push("## Dependencies — REQUIRED");
  lines.push("- List other topics whose context is needed to understand this topic");
  lines.push("- depends_on = cannot understand this topic without those topics");
  lines.push("- related_to = often used together, complementary knowledge");
  lines.push("- Use topic names exactly as they appear in the topic list above");
  lines.push("");

  lines.push("## Output Format");
  lines.push("");
  lines.push("```");
  lines.push("# [topic-name]");
  lines.push("domain: <1-5 words>");
  lines.push("purpose: <1 line max 15 words>");
  lines.push("");
  lines.push("## core");
  lines.push("path/File.php: ClassName — role");
  lines.push("");
  lines.push("## related");
  lines.push("path/X.php: XName — role");
  lines.push("");
  lines.push("## flows");
  lines.push("name: A::b → C::d → E::f");
  lines.push("");
  lines.push("## routes");
  lines.push("GET /path: route_name");
  lines.push("");
  lines.push("## commands");
  lines.push("command:name — 3 word desc");
  lines.push("");
  lines.push("## gotchas");
  lines.push("- X does Y instead of Z — path/file.php");
  lines.push("");
  lines.push("## dependencies");
  lines.push("depends_on: topic-a, topic-b");
  lines.push("related_to: topic-c, topic-d");
  lines.push("```");
  lines.push("");

  lines.push("## Cleanup");
  lines.push("");
  lines.push("After writing all enriched topic files:");
  lines.push("1. DELETE `.projectbrain/brain-topics/*-prompt.md` files — they are single-use prompts, not needed after enrichment");
  lines.push("2. DELETE `.projectbrain/brain-topics/.draft/` directory — drafts are replaced by enriched files");
  lines.push("3. DELETE any enriched topic file that is empty, redundant, or too vague to be useful — bad topics pollute context more than no topics");

  return lines.join("\n");
}

export async function formatSingleTopicPromptMd(
  topic: Topic,
  projectDir: string,
  data: BrainData,
  allTopicNames: string[] = [],
): Promise<string> {
  const lines: string[] = [];

  lines.push(`You are enriching an auto-generated topic file for a ${data.framework} codebase.`);
  lines.push(`Topic: **${topic.name}** — help future LLM sessions find relevant files quickly.`);
  lines.push("");

  lines.push("## Context");
  lines.push(`- Keywords: ${topic.keywords.join(", ")}`);
  lines.push(`- Files detected: ${topic.files.length}`);
  lines.push(`- Routes: ${topic.routes.length} | Commands: ${topic.commands.length}`);
  lines.push("");

  if (topic.files.length > 0) {
    lines.push("## Files detected");
    for (const f of topic.files.slice(0, 80)) {
      lines.push(`- \`${f}\``);
    }
    if (topic.files.length > 80) {
      lines.push(`- ... and ${topic.files.length - 80} more`);
    }
    lines.push("");
  }

  if (topic.routes.length > 0) {
    lines.push("## Routes detected");
    for (const r of topic.routes.slice(0, 30)) {
      const method = r.methods?.[0] || "GET";
      lines.push(`- ${method} ${r.path}: ${r.name}`);
    }
    if (topic.routes.length > 30) {
      lines.push(`- ... and ${topic.routes.length - 30} more`);
    }
    lines.push("");
  }

  const keyFiles = await selectKeyFilesForTopic(topic, projectDir, 5000);
  if (keyFiles.length > 0) {
    lines.push("## Read these files first");
    lines.push("");
    for (const kf of keyFiles) {
      lines.push(`- ${kf.relativePath}`);
    }
    lines.push("");
  }

  lines.push("## Available topics (for dependencies)");
  lines.push(allTopicNames.filter(n => n !== topic.name).join(", "));
  lines.push("");

  lines.push("## Task");
  lines.push("");
  lines.push("Produce a TOPIC FILE optimized for LLM consumption (not human readable).");
  lines.push("Goal: minimize tokens while maximizing information density for future LLM sessions.");
  lines.push("");
  lines.push("## Rules (CRITICAL)");
  lines.push("- YAML-like compact format — NO markdown tables, NO prose paragraphs");
  lines.push("- Every line must be useful to an LLM. No filler. No summaries. No explanations.");
  lines.push("- `ClassName::method` references > descriptions");
  lines.push("- One file per line with its role as tags, not sentences");
  lines.push("- Flows = ordered list of `Class::method → Class::method` chains");
  lines.push("- Gotchas = single-line bullets with file reference");
  lines.push("- MAX 200 lines total. Cut before padding.");
  lines.push("");
  lines.push("## Output Format");
  lines.push("");
  lines.push("```");
  lines.push(`# ${topic.name}`);
  lines.push("domain: <1-5 word domain label>");
  lines.push("purpose: <1 line, max 15 words>");
  lines.push("");
  lines.push("## core");
  lines.push("path/to/File.php: ClassName — <3 word role>");
  lines.push("path/to/Other.php: OtherName — <3 word role>");
  lines.push("");
  lines.push("## related");
  lines.push("path/X.php: XName — role");
  lines.push("");
  lines.push("## flows");
  lines.push("flow-name: Controller::action → Service::method → Repository::method");
  lines.push("other-flow: A::b → C::d");
  lines.push("");
  lines.push("## routes");
  lines.push("GET /path: route_name");
  lines.push("POST /path: route_name");
  lines.push("");
  lines.push("## gotchas");
  lines.push("- ClassName::method does X instead of Y — path/to/file.php");
  lines.push("- edge case: Z fails when W — path/to/file.php");
  lines.push("");
  lines.push("## dependencies");
  lines.push("depends_on: topic-a, topic-b");
  lines.push("related_to: topic-c, topic-d");
  lines.push("```");

  return lines.join("\n");
}

export async function writeTopicPrompts(
  outputDir: string,
  topicsDir: string,
  topics: Topic[],
  projectDir: string,
  data: BrainData,
): Promise<string[]> {
  const staleNew = topics.filter(
    (t) => t.status === TopicStatus.New || t.status === TopicStatus.Stale,
  );

  const written: string[] = [];

  if (staleNew.length === 0) return written;

  const globalPrompt = await formatTopicPromptMd(staleNew, projectDir, data);
  const globalPromptPath = path.join(outputDir, "brain-topics-prompt.md");
  await writeFile(globalPromptPath, globalPrompt, "utf8");
  written.push(globalPromptPath);

  await ensureDir(topicsDir);
  const allTopicNames = staleNew.map(t => t.name);
  for (const topic of staleNew) {
    const singlePrompt = await formatSingleTopicPromptMd(topic, projectDir, data, allTopicNames);
    const promptPath = path.join(topicsDir, `${topic.name}-prompt.md`);
    await writeFile(promptPath, singlePrompt, "utf8");
    written.push(promptPath);
  }

  return written;
}

export function formatTopicsSection(
  topics: Topic[],
  depMap?: Map<string, { dependsOn: string[]; relatedTo: string[] }>,
): string {
  if (topics.length === 0) return "";

  const lines: string[] = [];
  lines.push("## Topics");
  lines.push("");

  for (const topic of topics) {
    const statusIcon =
      topic.status === TopicStatus.UpToDate ? "OK" :
      topic.status === TopicStatus.New ? "+" :
      topic.status === TopicStatus.Stale ? "!" :
      "?";
    const deps = depMap?.get(topic.name);
    const depStr = deps?.dependsOn.length ? ` | needs: ${deps.dependsOn.join(', ')}` : '';
    const relStr = deps?.relatedTo.length ? ` | related: ${deps.relatedTo.join(', ')}` : '';
    lines.push(`- **${topic.name}** [${statusIcon}] — ${topic.files.length} files, ${topic.routes.length} routes${depStr}${relStr}`);
  }

  lines.push("");
  lines.push("See `.projectbrain/brain-topics/` for topic details.");
  lines.push("");

  return lines.join("\n");
}
