import type { SkillDefinition, SkillContext } from './types.js';
import type { SkillResult } from '../types.js';
import { readTopicIndex } from '../topic-index.js';
import { registerSkill } from './runner.js';

interface ParsedFile {
  path: string;
  type: 'added' | 'deleted' | 'modified';
}

function parseDiff(diff: string): ParsedFile[] {
  const files: ParsedFile[] = [];
  const newFileRegex = /^new file mode /;
  const deletedFileRegex = /^deleted file mode /;
  const nullPath = '/dev/null';

  const chunks = diff.split(/^diff --git /m).slice(1);

  for (const chunk of chunks) {
    const headerMatch = chunk.match(/a\/(.+?) b\/(.+)/);
    if (!headerMatch) continue;

    const path = headerMatch[2];
    const lines = chunk.split('\n');
    const isNew = lines.some(l => newFileRegex.test(l));
    const isDeleted = lines.some(l => deletedFileRegex.test(l));
    const hasNullSrc = lines.some(l => l.startsWith(`--- ${nullPath}`));
    const hasNullDst = lines.some(l => l.startsWith(`+++ ${nullPath}`));

    let type: ParsedFile['type'] = 'modified';
    if (isNew || (hasNullSrc && !hasNullDst)) type = 'added';
    else if (isDeleted || (hasNullDst && !hasNullSrc)) type = 'deleted';

    if (!files.some(f => f.path === path)) {
      files.push({ path, type });
    }
  }

  return files;
}

function mapFilesToTopics(
  files: ParsedFile[],
  topicIndex: { topics: Record<string, { name: string; paths: string[] }> } | null,
): Map<string, ParsedFile[]> {
  const topicMap = new Map<string, ParsedFile[]>();

  for (const file of files) {
    let matched = false;
    if (topicIndex) {
      for (const [, entry] of Object.entries(topicIndex.topics)) {
        for (const topicPath of entry.paths) {
          if (file.path.startsWith(topicPath) || file.path === topicPath) {
            if (!topicMap.has(entry.name)) topicMap.set(entry.name, []);
            topicMap.get(entry.name)!.push(file);
            matched = true;
            break;
          }
        }
        if (matched) break;
      }
    }
    if (!matched) {
      if (!topicMap.has('general')) topicMap.set('general', []);
      topicMap.get('general')!.push(file);
    }
  }

  return topicMap;
}

export const diffOnlySkill: SkillDefinition = {
  name: 'diff-only',
  description: 'Analyze git diff content, map changed files to topics, identify coupling risks',
  config: {
    name: 'diff-only',
    description: 'Analyze git diff content, map changed files to topics, identify coupling risks',
    inputType: 'diff',
    requiredTopics: [],
  },
  async execute(ctx: SkillContext): Promise<SkillResult> {
    const risks: string[] = [];
    const actions: string[] = [];
    const files: string[] = [];

    if (!ctx.diff || ctx.diff.trim() === '') {
      if (!ctx.diff) {
        risks.push('No diff provided in context');
      }
      return {
        goal: 'Analyze targeted git diff',
        topic: 'general',
        files,
        actions,
        risks,
        next: 'Review the most impactful changed file',
      };
    }

    const parsedFiles = parseDiff(ctx.diff);
    const diffLines = ctx.diff.split('\n').length;

    if (diffLines > 500) {
      risks.push('Large diff detected — consider splitting into smaller, focused changes');
    }

    const topicIndex = await readTopicIndex(ctx.projectDir);
    const topicMap = mapFilesToTopics(parsedFiles, topicIndex);

    if (topicMap.size > 1) {
      risks.push(`Coupling risk: changes span ${topicMap.size} topics (${[...topicMap.keys()].join(', ')})`);
    }

    // Pick the topic with the most files as primary
    let primaryTopic = 'general';
    let maxFiles = 0;
    for (const [topic, topicFiles] of topicMap) {
      if (topicFiles.length > maxFiles) {
        maxFiles = topicFiles.length;
        primaryTopic = topic;
      }
    }

    for (const file of parsedFiles) {
      files.push(file.path);
      actions.push(`${file.path}: ${file.type}`);
    }

    return {
      goal: 'Analyze targeted git diff',
      topic: primaryTopic,
      files,
      actions,
      risks,
      next: 'Review the most impactful changed file',
    };
  },
};

registerSkill(diffOnlySkill);
