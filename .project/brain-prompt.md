# Paste this into your LLM

You are analyzing a codebase to explain its business context.

## Project Structure

- **Framework**: Generic
- **Modules**: Cli.ts, Detect.ts, Output.ts, Scan.ts, Types.ts, Adapters
- **Routes**: 0 HTTP endpoints
- **Commands**: 0 CLI commands

## Key Files

### package.json
```json
{
  "name": "project-brain",
  "version": "0.1.0",
  "description": "Generate project context for LLMs - works with any IDE",
  "type": "module",
  "bin": {
    "brain": "./dist/cli.js"
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/cli.ts",
    "scan": "tsx src/cli.ts scan",
    "prepublishOnly": "npm run build"
  },
  "keywords": [
    "llm",
    "ai",
    "context",
    "cursor",
    "claude",
    "ide",
    "project"
  ],
  "author": "",
  "license": "MIT",
  "dependencies": {
    "commander": "^13.1.0",
    "fast-glob": "^3.3.3"
  },
  "devDependencies": {
    "@types/node": "^22.13.10",
    "tsx": "^4.19.3",
    "typescript": "^5.8.2"
  },
  "engines": {
    "node": ">=18"
  }
}

```

### src/cli.ts
```typescript
#!/usr/bin/env node
import { program } from "commander";
import { scanProject } from "./scan.js";
import { registerAdapter } from "./adapters/index.js";
import { symfonyAdapter } from "./adapters/symfony.js";
import { laravelAdapter } from "./adapters/laravel.js";
import { nextjsAdapter } from "./adapters/nextjs.js";
import { genericAdapter } from "./adapters/generic.js";

// Register all adapters
registerAdapter(symfonyAdapter);
registerAdapter(laravelAdapter);
registerAdapter(nextjsAdapter);
registerAdapter(genericAdapter);

program
  .name("brain")
  .description("Generate project context for LLMs - works with any IDE")
  .version("0.1.0");

program
  .command("scan")
  .description("Scan the project and generate brain files")
  .option("-o, --output <dir>", "Output directory", ".project")
  .option("-a, --adapter <name>", "Force specific adapter")
  .action(async (options) => {
    try {
      const result = await scanProject({
        dir: process.cwd(),
        outputDir: options.output,
        adapter: options.adapter,
      });
      
      console.log("\n✓ Scan complete!");
      console.log(`  Framework: ${result.framework}`);
      console.log(`  Modules: ${result.moduleCount}`);
      console.log(`  Routes: ${result.routeCount}`);
      console.log(`  Commands: ${result.commandCount}`);
      console.log(`  Files: ${result.fileCount}`);
      console.log(`\n  Generated: ${result.brainPath}`);
      console.log(`  Prompt: ${result.promptPath}`);
    } catch (error: any) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

program.parse();

```

### src/detect.ts
```typescript
import { detectFramework, getAdapters } from "./adapters/index.js";

export async function findBestAdapter(dir: string): Promise<{
  adapter: import("./types.ts").Adapter;
  match: import("./types.ts").AdapterMatch;
} | null> {
  const result = await detectFramework(dir);
  if (result) {
    return result;
  }

  // Fallback to generic adapter
  const adapters = getAdapters();
  const generic = adapters.find((a) => a.name === "generic");
  if (generic) {
    const match = await generic.detect(dir);
    return { adapter: generic, match };
  }

  return null;
}

```

### src/output.ts
```typescript
import type { BrainData, Module, Route, Command } from "./types.js";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const MAX_FILES = 10;
const MAX_TOKENS = 20000;

function estimateTokens(content: string): number {
  return Math.ceil(content.length / 4);
}

function formatDate(date: Date): string {
  return date.toISOString().split(".")[0] + "Z";
}

export function formatBrainMd(data: BrainData, dir: string): string {
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
      const modRoutes = data.routes.filter((r) => r.module === mod.name.toLowerCase());
      if (modRoutes.length > 0) {
        lines.push(`- **Routes**: ${modRoutes.slice(0, 5).map((r) => `\`${r.methods?.[0] || "GET"} ${r.path}\``).join(", ")}${modRoutes.length > 5 ? ` (+${modRoutes.length - 5} more)` : ""}`);
      }
      lines.push("");
    }
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

  lines.push("# Paste this into your LLM");
  lines.push("");
  lines.push("You are analyzing a codebase to explain its business context.");
  lines.push("");
  lines.push("## Project Structure");
  lines.push("");
  lines.push(`- **Framework**: ${data.framework}`);
  lines.push(`- **Modules**: ${data.modules.map((m) => m.name).join(", ") || "none detected"}`);
  lines.push(`- **Routes**: ${data.routes.length} HTTP endpoints`);
  lines.push(`- **Commands**: ${data.commands.length} CLI commands`);
  lines.push("");

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
  lines.push("Based on this code, provide:");
  lines.push("1. **What this system does** (1-2 sentences)");
  lines.push("2. **Key business flows** (step by step, which services/classes)");
  lines.push("3. **Core concepts** (define domain terms)");
  lines.push("4. **Gotchas** (things that could surprise a developer)");
  lines.push("5. **Architecture decisions** (why things are done this way)");
  lines.push("");
  lines.push("Format your response as markdown that can be pasted into brain.md.");

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

```

### src/scan.ts
```typescript
import { findBestAdapter } from "./detect.js";
import { formatBrainMd, formatBrainPromptMd } from "./output.js";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { BrainData } from "./types.js";

export interface ScanOptions {
  dir: string;
  outputDir?: string;
  adapter?: string;
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
}

async function ensureDir(dir: string): Promise<void> {
  try {
    await mkdir(dir, { recursive: true });
  } catch (error: any) {
    if (error.code !== "EEXIST") throw error;
  }
}

export async function scanProject(options: ScanOptions): Promise<ScanResult> {
  const { dir, outputDir = ".project", adapter: forcedAdapter } = options;

  // Find best adapter
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

  // Extract project data
  console.log(`Scanning project with ${adapter.name} adapter...`);
  const data: BrainData = await adapter.extract(dir);

  // Generate output
  const brainMd = formatBrainMd(data, dir);
  const brainPromptMd = await formatBrainPromptMd(data, dir);

  // Ensure output directory exists
  const outputPath = path.join(dir, outputDir);
  await ensureDir(outputPath);

  // Write files
  const brainPath = path.join(outputPath, "brain.md");
  const promptPath = path.join(outputPath, "brain-prompt.md");

  await writeFile(brainPath, brainMd, "utf8");
  await writeFile(promptPath, brainPromptMd, "utf8");

  console.log(`Generated: ${brainPath}`);
  console.log(`Generated: ${promptPath}`);

  return {
    framework: data.framework,
    confidence: match.confidence,
    fileCount: data.fileCount,
    moduleCount: data.modules.length,
    routeCount: data.routes.length,
    commandCount: data.commands.length,
    brainPath,
    promptPath,
  };
}

```

### src/types.ts
```typescript
// Core types for Brain

export interface Module {
  name: string;
  path: string;
  dependsOn: string[];
  confidence?: number;
}

export interface Route {
  name: string;
  path: string;
  methods?: string[];
  controller?: string;
  module?: string;
  file?: string;
}

export interface Command {
  name: string;
  class?: string;
  description?: string;
  safe: boolean;
}

export interface KeyFile {
  path: string;
  role: string;
  language?: string;
}

export interface NavigationCommand {
  description: string;
  command: string;
}

export interface Conventions {
  standards: string[];
  notes: string[];
  navigation: NavigationCommand[];
}

export interface QuickFindMapping {
  task: string;
  location: string;
}

export interface BrainData {
  framework: string;
  modules: Module[];
  routes: Route[];
  commands: Command[];
  conventions: Conventions;
  keyFiles: KeyFile[];
  quickFind: QuickFindMapping[];
  fileCount: number;
}

export interface AdapterMatch {
  supported: boolean;
  framework: string;
  confidence: number;
  reasons: string[];
}

export interface Adapter {
  name: string;
  priority: number;
  detect(dir: string): Promise<AdapterMatch>;
  extract(dir: string): Promise<BrainData>;
}

```

---

Based on this code, provide:
1. **What this system does** (1-2 sentences)
2. **Key business flows** (step by step, which services/classes)
3. **Core concepts** (define domain terms)
4. **Gotchas** (things that could surprise a developer)
5. **Architecture decisions** (why things are done this way)

Format your response as markdown that can be pasted into brain.md.