# Paste this into your LLM

You are enriching auto-generated "topic" files for a codebase.
These topics help future LLM sessions quickly find relevant files.

## Project: Generic

| Property | Value |
|----------|-------|
| Framework | Generic |
| Files | 24 |
| Routes | 0 |

## Instructions

For each topic draft below:

1. **Validate** — Remove files that aren't actually relevant
2. **Complete** — Add missing files (check imports, dependencies)
3. **Organize** — Split into "Core Files" (essential) and "Related Files"
4. **Summarize** — Add a brief overview of how this domain works
5. **Flow** — Document key flows if applicable (login, payment, etc.)
6. **Gotchas** — Note any non-obvious details

## Topic 1/1: general

### Draft
| Property | Value |
|----------|-------|
| Keywords |  |
| Files | 19 |
| Routes | 0 |
| Commands | 0 |

**Files detected:**
- `LICENSE`
- `README.md`
- `package-lock.json`
- `package.json`
- `tsconfig.json`
- `src/cli.ts`
- `src/detect.ts`
- `src/discover.ts`
- `src/install.ts`
- `src/output.ts`
- `src/scan.ts`
- `src/stale.ts`
- `src/types.ts`
- `src/update.ts`
- `src/adapters/generic.ts`
- `src/adapters/index.ts`
- `src/adapters/laravel.ts`
- `src/adapters/nextjs.ts`
- `src/adapters/symfony.ts`

### Key Files Content

#### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}

```

#### LICENSE
```
MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

```

#### package.json
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

#### src/cli.ts
```typescript
#!/usr/bin/env node
import { program } from "commander";
import { scanProject } from "./scan.js";
import { updateProject } from "./update.js";
import { installIde } from "./install.js";
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

      if (result.topics.length > 0) {
        console.log("\n  Topics:");
        const byStatus = new Map<string, typeof result.topics>();
        for (const t of result.topics) {
          const group = t.status;
          if (!byStatus.has(group)) byStatus.set(group, []);
          byStatus.get(group)!.push(t);
        }

        const statusOrder = ['new', 'stale', 'up_to_date', 'orphaned'];
        for (const status of statusOrder) {
          const group = byStatus.get(status);
          if (!group) continue;
          for (const t of group) {
            const icon =
              t.status === 'up_to_date' ? '  OK' :
              t.status === 'new' ? '   +' :
              t.status === 'stale' ? '   !' :
              '   ?';

            let detail = `${t.fileCount} files, ${t.routeCount} routes`;
            if (t.staleReason === 'files_changed' && t.staleDetails) {
              const parts: string[] = [];
              if (t.staleDetails.added?.length) parts.push(`+${t.staleDetails.added.length} files`);
              if (t.staleDetails.removed?.length) parts.push(`-${t.staleDetails.removed.length} files`);
              detail += ` (${parts.join(', ')})`;
            } else if (t.staleReason === 'content_changed' && t.staleDetails?.modified?.length) {
              detail += ` (${t.staleDetails.modified.length} modified)`;
            }

            console.log(`  ${icon} ${t.name.padEnd(20)} ${t.status.padEnd(12)} ${detail}`);
          }
        }
      }

      if (result.promptFiles.length > 0) {
        console.log("\n  Prompts generated:");
        for (const f of result.promptFiles) {
          console.log(`    - ${f}`);
        }
        console.log("\n  Next steps:");
        console.log("    1. Copy brain-topics-prompt.md to your LLM");
        console.log("    2. Save each topic response to brain-topics/[name].md");
      } else if (result.topics.length > 0) {
        console.log("\n  All topics up to date.");
      }

      console.log(`\n  Generated: ${result.brainPath}`);
      console.log(`  Prompt: ${result.promptPath}`);
    } catch (error: any) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

program
  .command("update")
  .description("Update brain files while preserving Business Context")
  .option("-o, --output <dir>", "Output directory", ".project")
  .option("-a, --adapter <name>", "Force specific adapter")
  .action(async (options) => {
    try {
      const result = await updateProject({
        dir: process.cwd(),
        outputDir: options.output,
        adapter: options.adapter,
      });
      
      console.log("\n✓ Update complete!");
      console.log(`  Framework: ${result.framework}`);
      console.log(`  Modules: ${result.moduleCount}`);
      console.log(`  Routes: ${result.routeCount}`);
      console.log(`  Commands: ${result.commandCount}`);
      console.log(`  Files: ${result.fileCount}`);
      if (result.contextPreserved) {
        console.log(`  Business Context: preserved`);
      }
      console.log(`\n  Updated: ${result.brainPath}`);
      console.log(`  Updated: ${result.promptPath}`);
    } catch (error: any) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

program
  .command("install")
  .description("Install brain configuration for your IDE")
  .argument("[ide]", "Target IDE (cursor, claude, opencode, windsurf, zed, all)")
  .option("-o, --output <dir>", "Output directory", ".project")
  .action(async (ide, options) => {
    try {
      await installIde({
        dir: process.cwd(),
        ide: ide,
        brainPath: `${options.output}/brain.md`,
        promptPath: `${options.output}/brain-prompt.md`,
      });
    } catch (error: any) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

program.parse();

```

#### src/detect.ts
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

#### src/discover.ts
```typescript
import type { BrainData, Route, Command, Topic } from "./types.js";
import { TopicStatus } from "./types.js";

const GENERIC_TERMS = new Set([
  'service', 'controller', 'repository', 'entity', 'model', 'manager', 'handler',
  'factory', 'builder', 'provider', 'helper', 'util', 'utils', 'wrapper', 'adapter',
  'app', 'src', 'lib', 'bundle', 'component', 'module', 'interface', 'abstract', 'base',
  'api', 'http', 'request', 'response', 'json', 'xml', 'config', 'test', 'tests', 'spec',
  'index', 'main', 'default', 'types', 'type', 'class', 'const', 'enum',
]);

const EXPANSIONS: Record<string, string> = {
  'auth': 'authentication',
  'authz': 'authorization',
  'pay': 'payments',
  'usr': 'users',
  'notif': 'notifications',
  'msg': 'messaging',
  'inv': 'inventory',
  'rpt': 'reporting',
};

interface TermInfo {
  term: string;
  source: string;
  weight: number;
  files: Set<string>;
  totalScore: number;
}

function splitTerms(input: string): string[] {
  return input
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_\-./\\]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function normalizeTerm(term: string): string {
  let t = term.toLowerCase();
  if (t.endsWith('s') && t.length > 2) {
    t = t.slice(0, -1);
  }
  if (t.endsWith('ies') && t.length > 4) {
    t = t.slice(0, -3) + 'y';
  }
  return t;
}

function isBlacklisted(term: string): boolean {
  return GENERIC_TERMS.has(term);
}

function extractTermsFromPath(filePath: string): string[] {
  const parts = filePath.replace(/\.[^.]+$/, '').split(/[/\\]/);
  const terms: string[] = [];
  for (const part of parts) {
    const split = splitTerms(part);
    for (const raw of split) {
      const normalized = normalizeTerm(raw);
      if (normalized.length > 1 && !isBlacklisted(normalized)) {
        terms.push(normalized);
      }
    }
  }
  return terms;
}

function extractTermsFromName(name: string): string[] {
  const terms: string[] = [];
  const split = splitTerms(name);
  for (const raw of split) {
    const normalized = normalizeTerm(raw);
    if (normalized.length > 1 && !isBlacklisted(normalized)) {
      terms.push(normalized);
    }
  }
  return terms;
}

function addTerms(
  terms: string[],
  source: string,
  weight: number,
  file: string,
  occurrences: Map<string, TermInfo>,
): void {
  for (const term of terms) {
    if (!occurrences.has(term)) {
      occurrences.set(term, {
        term,
        source,
        weight,
        files: new Set(),
        totalScore: 0,
      });
    }
    const info = occurrences.get(term)!;
    info.files.add(file);
    info.totalScore += weight;
  }
}

function filterTerms(
  occurrences: Map<string, TermInfo>,
  allFiles: string[],
  minOccurrences: number,
  maxCoverage: number,
): Map<string, TermInfo> {
  const totalFileCount = allFiles.length || 1;
  const filtered = new Map<string, TermInfo>();
  for (const [term, info] of occurrences) {
    if (info.files.size < minOccurrences) continue;
    const coverage = info.files.size / totalFileCount;
    if (coverage > maxCoverage) continue;
    filtered.set(term, info);
  }
  return filtered;
}

function buildCooccurrenceMatrix(
  terms: Map<string, TermInfo>,
  allFiles: string[],
): Map<string, Map<string, number>> {
  const fileTerms = new Map<string, Set<string>>();
  for (const [term, info] of terms) {
    for (const file of info.files) {
      if (!fileTerms.has(file)) {
        fileTerms.set(file, new Set());
      }
      fileTerms.get(file)!.add(term);
    }
  }

  const matrix = new Map<string, Map<string, number>>();
  for (const [, termSet] of fileTerms) {
    const termList = [...termSet];
    for (let i = 0; i < termList.length; i++) {
      for (let j = i + 1; j < termList.length; j++) {
        const a = termList[i];
        const b = termList[j];
        if (!matrix.has(a)) matrix.set(a, new Map());
        if (!matrix.has(b)) matrix.set(b, new Map());
        matrix.get(a)!.set(b, (matrix.get(a)!.get(b) || 0) + 1);
        matrix.get(b)!.set(a, (matrix.get(b)!.get(a) || 0) + 1);
      }
    }
  }
  return matrix;
}

function findConnectedComponents(
  matrix: Map<string, Map<string, number>>,
  threshold: number,
): string[][] {
  const visited = new Set<string>();
  const components: string[][] = [];

  for (const node of matrix.keys()) {
    if (visited.has(node)) continue;
    const component: string[] = [];
    const stack = [node];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      component.push(current);
      const neighbors = matrix.get(current);
      if (neighbors) {
        for (const [neighbor, count] of neighbors) {
          if (count >= threshold && !visited.has(neighbor)) {
            stack.push(neighbor);
          }
        }
      }
    }
    if (component.length > 0) {
      components.push(component);
    }
  }

  return components;
}

function nameCluster(cluster: string[], termScores: Map<string, TermInfo>): string {
  let bestTerm = cluster[0];
  let bestScore = 0;
  for (const term of cluster) {
    const info = termScores.get(term);
    const score = info ? info.totalScore : 0;
    if (score > bestScore) {
      bestScore = score;
      bestTerm = term;
    }
  }
  return EXPANSIONS[bestTerm] || bestTerm;
}

function assignFilesToTopics(
  allFiles: string[],
  topics: Topic[],
): void {
  for (const file of allFiles) {
    const fileTerms = extractTermsFromPath(file);
    const termSet = new Set(fileTerms);
    for (const topic of topics) {
      const hasMatch = topic.keywords.some((k) => termSet.has(k));
      if (hasMatch) {
        topic.files.push(file);
      }
    }
  }
}

function assignRoutesToTopics(
  routes: Route[],
  topics: Topic[],
): void {
  for (const route of routes) {
    const routeTerms = [
      ...extractTermsFromPath(route.path),
      ...extractTermsFromName(route.name),
    ];
    const termSet = new Set(routeTerms);
    for (const topic of topics) {
      const hasMatch = topic.keywords.some((k) => termSet.has(k));
      if (hasMatch) {
        topic.routes.push(route);
      }
    }
  }
}

function assignCommandsToTopics(
  commands: Command[],
  topics: Topic[],
): void {
  for (const command of commands) {
    const cmdTerms = extractTermsFromName(command.name);
    const termSet = new Set(cmdTerms);
    for (const topic of topics) {
      const hasMatch = topic.keywords.some((k) => termSet.has(k));
      if (hasMatch) {
        topic.commands.push(command);
      }
    }
  }
}

export function discoverTopics(data: BrainData, allFiles: string[]): Topic[] {
  const occurrences = new Map<string, TermInfo>();

  for (const route of data.routes) {
    const pathTerms = extractTermsFromPath(route.path);
    const nameTerms = extractTermsFromName(route.name);
    const controllerTerms = route.controller
      ? extractTermsFromName(route.controller)
      : [];

    const file = route.file || route.path;
    addTerms(pathTerms, 'route-path', 2.5, file, occurrences);
    addTerms(nameTerms, 'route-name', 2.0, file, occurrences);
    addTerms(controllerTerms, 'controller', 1.5, file, occurrences);
  }

  for (const command of data.commands) {
    const nameTerms = extractTermsFromName(command.name);
    addTerms(nameTerms, 'command', 2.0, command.name, occurrences);
  }

  for (const mod of data.modules) {
    const nameTerms = extractTermsFromName(mod.name);
    const pathTerms = extractTermsFromPath(mod.path);
    addTerms(nameTerms, 'module', 3.0, mod.path, occurrences);
    addTerms(pathTerms, 'module-path', 3.0, mod.path, occurrences);
  }

  for (const keyFile of data.keyFiles) {
    const fileTerms = extractTermsFromPath(keyFile.path);
    addTerms(fileTerms, 'keyfile', 1.0, keyFile.path, occurrences);
  }

  for (const file of allFiles) {
    const fileTerms = extractTermsFromPath(file);
    addTerms(fileTerms, 'file', 1.0, file, occurrences);
  }

  const significantTerms = filterTerms(occurrences, allFiles, 3, 0.4);

  if (significantTerms.size === 0) {
    return [{
      name: 'general',
      keywords: [],
      files: [...allFiles],
      routes: [...data.routes],
      commands: [...data.commands],
      status: TopicStatus.New,
    }];
  }

  const cooccurrence = buildCooccurrenceMatrix(significantTerms, allFiles);

  const clusters = findConnectedComponents(cooccurrence, 2);

  const standaloneTerms: string[] = [];
  const significantKeys = new Set(significantTerms.keys());
  const clusteredTerms = new Set(clusters.flat());
  for (const term of significantKeys) {
    if (!clusteredTerms.has(term)) {
      standaloneTerms.push(term);
    }
  }
  for (const term of standaloneTerms) {
    clusters.push([term]);
  }

  const topics: Topic[] = clusters
    .map((cluster) => ({
      name: nameCluster(cluster, significantTerms),
      keywords: [...cluster],
      files: [] as string[],
      routes: [] as Route[],
      commands: [] as Command[],
      status: TopicStatus.New,
    }))
    .filter((topic) => topic.keywords.length > 0);

  assignFilesToTopics(allFiles, topics);
  assignRoutesToTopics(data.routes, topics);
  assignCommandsToTopics(data.commands, topics);

  const finalTopics = topics.filter((t) => t.files.length > 0);

  if (finalTopics.length === 0 && allFiles.length > 0) {
    return [{
      name: 'general',
      keywords: [],
      files: [...allFiles],
      routes: [...data.routes],
      commands: [...data.commands],
      status: TopicStatus.New,
    }];
  }

  return finalTopics;
}

export function mergeOverlappingTopics(topics: Topic[], threshold: number = 0.6): Topic[] {
  if (topics.length <= 1) return topics;

  const merged: boolean[] = new Array(topics.length).fill(false);
  const result: Topic[] = [];

  for (let i = 0; i < topics.length; i++) {
    if (merged[i]) continue;

    const current = { ...topics[i] };
    current.files = [...topics[i].files];
    current.routes = [...topics[i].routes];
    current.commands = [...topics[i].commands];
    current.keywords = [...topics[i].keywords];

    for (let j = i + 1; j < topics.length; j++) {
      if (merged[j]) continue;

      const filesA = new Set(current.files);
      const filesB = new Set(topics[j].files);
      const intersection = [...filesA].filter((f) => filesB.has(f)).length;
      const union = new Set([...current.files, ...topics[j].files]).size;

      if (union > 0 && intersection / union >= threshold) {
        const newKeywords = new Set([...current.keywords, ...topics[j].keywords]);
        current.keywords = [...newKeywords];
        current.files = [...new Set([...current.files, ...topics[j].files])];
        current.routes = [...new Map([...current.routes, ...topics[j].routes].map((r) => [r.name, r])).values()];
        current.commands = [...new Map([...current.commands, ...topics[j].commands].map((c) => [c.name, c])).values()];
        merged[j] = true;
      }
    }

    result.push(current);
  }

  return result;
}

```

## Output Format

Separate each topic with `---TOPIC---`:

---TOPIC---
# [topic-name]

## Overview
<Brief description of this domain>

## Core Files
| File | Role |
|------|------|
| ... | ... |

## Related Files
| File | Role |
|------|------|
| ... | ... |

## Flow
<key flows if applicable>

## Routes
| Method | Path | Description |
|--------|------|-------------|
| ... | ... | ... |

## Commands
- `command:name` — description

## Gotchas
<non-obvious details, edge cases>
---TOPIC---