import { readFile as fsReadFile } from 'node:fs/promises';
import path from 'node:path';
import type { SkillDefinition, SkillContext } from './types.js';
import type { SkillResult } from '../types.js';
import { registerSkill } from './runner.js';

type ReadFileFn = (path: string, encoding: BufferEncoding) => Promise<string>;

let _readFile: ReadFileFn = fsReadFile;

export function setReadFileFn(fn: ReadFileFn): void {
  _readFile = fn;
}

export function resetReadFileFn(): void {
  _readFile = fsReadFile;
}

interface ModuleDetail {
  name: string;
  path: string;
  dependsOn: string[];
}

interface QuickFindEntry {
  task: string;
  location: string;
}

interface TopicEntry {
  name: string;
  files: string[];
}

interface ParsedBrainMd {
  modules: string[];
  moduleDetails: ModuleDetail[];
  quickFind: QuickFindEntry[];
  topics: TopicEntry[];
}

export function parseBrainMd(content: string): ParsedBrainMd {
  if (!content) {
    return { modules: [], moduleDetails: [], quickFind: [], topics: [] };
  }

  const modules: string[] = [];
  const moduleDetails: ModuleDetail[] = [];
  const quickFind: QuickFindEntry[] = [];
  const topics: TopicEntry[] = [];

  const lines = content.split('\n');
  let inModules = false;
  let currentModule: ModuleDetail | null = null;
  let inQuickFind = false;
  let inTopics = false;
  let currentTopic: TopicEntry | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('## Modules')) {
      inModules = true;
      inQuickFind = false;
      inTopics = false;
      currentModule = null;
      continue;
    }

    if (trimmed.startsWith('## Quick Find')) {
      inQuickFind = true;
      inModules = false;
      inTopics = false;
      continue;
    }

    if (trimmed.startsWith('## Topics')) {
      inTopics = true;
      inModules = false;
      inQuickFind = false;
      currentTopic = null;
      continue;
    }

    if (trimmed.startsWith('## ') && !trimmed.startsWith('## Modules') && !trimmed.startsWith('## Quick Find') && !trimmed.startsWith('## Topics')) {
      if (currentModule) {
        moduleDetails.push(currentModule);
        currentModule = null;
      }
      if (currentTopic) {
        topics.push(currentTopic);
        currentTopic = null;
      }
      inModules = false;
      inQuickFind = false;
      inTopics = false;
    }

    if (inModules && trimmed.startsWith('### ')) {
      if (currentModule) {
        moduleDetails.push(currentModule);
      }
      currentModule = { name: trimmed.slice(4), path: '', dependsOn: [] };
      continue;
    }

    if (inModules && currentModule && trimmed.startsWith('- **Path**:')) {
      const match = trimmed.match(/`([^`]+)`/);
      currentModule.path = match?.[1] || '';
      continue;
    }

    if (inModules && currentModule && trimmed.includes('**Depends on**')) {
      const depMatches = trimmed.match(/`([^`]+)`/g);
      currentModule.dependsOn = depMatches ? depMatches.map(d => d.replace(/`/g, '')) : [];
      continue;
    }

    if (trimmed.startsWith('- **Modules**:') && !trimmed.startsWith('###')) {
      const raw = trimmed.replace(/^- \*\*Modules\*\*:\s*/, '');
      if (raw && raw !== 'none detected') {
        modules.push(...raw.split(',').map(m => m.trim()));
      }
    }

    if (inQuickFind && trimmed.startsWith('|') && !trimmed.startsWith('| I need to') && !trimmed.startsWith('|---')) {
      const parts = trimmed.split('|').map(s => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const task = parts[0].trim();
        const locMatch = parts[1].match(/`([^`]+)`/);
        if (task && locMatch) {
          quickFind.push({ task, location: locMatch[1] });
        }
      }
    }

    if (inTopics && trimmed.startsWith('### ')) {
      if (currentTopic) {
        topics.push(currentTopic);
      }
      currentTopic = { name: trimmed.slice(4), files: [] };
      continue;
    }

    if (inTopics && currentTopic && trimmed.includes('**Files**:')) {
      const raw = trimmed.replace(/^-\s+\*\*Files\*\*:\s*/, '');
      currentTopic.files = raw.split(',').map(f => f.trim()).filter(Boolean);
    }
  }

  if (currentModule) {
    moduleDetails.push(currentModule);
  }
  if (currentTopic) {
    topics.push(currentTopic);
  }

  if (modules.length === 0 && moduleDetails.length > 0) {
    modules.push(...moduleDetails.map(m => m.name));
  }

  return { modules, moduleDetails, quickFind, topics };
}

export const repoMapSkill: SkillDefinition = {
  name: 'repo-map',
  description: 'Parse brain.md to localize repo zones — modules, topics, key files',
  config: {
    name: 'repo-map',
    description: 'Parse brain.md to localize repo zones — modules, topics, key files',
    inputType: 'query',
    requiredTopics: [],
  },
  async execute(ctx: SkillContext): Promise<SkillResult> {
    const brainPath = path.join(ctx.projectDir, '.projectbrain', 'brain.md');
    const risks: string[] = [];
    const files: string[] = [];

    let content = '';
    try {
      content = await _readFile(brainPath, 'utf-8');
    } catch {
      return {
        goal: 'Localize repo zones from brain.md',
        topic: ctx.topic?.name || 'global',
        files: [],
        actions: ['Generate brain.md with `brain scan`'],
        risks: ['brain.md not found — run `brain scan` first'],
        next: 'Run `brain scan` to generate project structure',
      };
    }

    const parsed = parseBrainMd(content);

    for (const mod of parsed.moduleDetails) {
      if (mod.path) {
        files.push(mod.path);
      }
    }

    for (const qf of parsed.quickFind) {
      files.push(qf.location);
    }

    if (ctx.topic) {
      const matchedTopic = parsed.topics.find(t => t.name === ctx.topic!.name);
      if (matchedTopic) {
        files.push(...matchedTopic.files);
      }
    }

    const modulesWithRoutes = new Set<string>();
    const routeSection = content.match(/## Routes[\s\S]*?(?=\n## |\n### (?!User|Order|Payment|Api|Frontend))/);
    if (routeSection) {
      for (const mod of parsed.moduleDetails) {
        const capName = mod.name.charAt(0).toUpperCase() + mod.name.slice(1);
        if (routeSection.includes(`### ${capName}`)) {
          modulesWithRoutes.add(mod.name);
        }
      }
    }

    for (const mod of parsed.moduleDetails) {
      if (!modulesWithRoutes.has(mod.name)) {
        risks.push(`Module "${mod.name}" has no routes — may be internal service only`);
      }
    }

    for (const topic of parsed.topics) {
      if (topic.files.length === 0) {
        risks.push(`Topic "${topic.name}" has no files — may need enrichment`);
      }
    }

    const actions: string[] = ['Read brain.md', 'Check topic-index.yaml', 'Review module structure'];

    let next = 'Read the most relevant topic file';
    if (ctx.topic) {
      const matched = parsed.topics.find(t => t.name === ctx.topic!.name);
      if (matched && matched.files.length > 0) {
        next = `Read ${matched.files[0]}`;
      }
    }

    return {
      goal: 'Localize repo zones from brain.md',
      topic: ctx.topic?.name || 'global',
      files: [...new Set(files)],
      actions,
      risks,
      next,
    };
  },
};

registerSkill(repoMapSkill);
