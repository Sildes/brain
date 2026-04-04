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
