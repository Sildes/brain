import type { Topic, TopicQuality } from './types.js';

function countItemsInSection(content: string, sectionName: string): number {
  const lines = content.split('\n');
  let inSection = false;
  let count = 0;

  const singular = sectionName.endsWith('s') ? sectionName.slice(0, -1) : sectionName;
  const plural = sectionName.endsWith('s') ? sectionName : sectionName + 's';
  const headerPattern = new RegExp(`^##\\s+(${singular}|${plural})$`, 'i');

  for (const line of lines) {
    if (line.match(/^##\s+/)) {
      if (line.match(headerPattern)) {
        inSection = true;
      } else {
        inSection = false;
      }
    } else if (inSection && line.trim().startsWith('- ')) {
      count++;
    }
  }

  return count;
}

function removeYamlFrontmatter(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];
  let inFrontmatter = false;
  let firstLine = true;

  for (const line of lines) {
    if (firstLine && line.trim() === '---') {
      inFrontmatter = !inFrontmatter;
      firstLine = false;
      continue;
    }
    if (line.trim() === '---' && inFrontmatter) {
      inFrontmatter = false;
      continue;
    }
    if (!inFrontmatter) {
      result.push(line);
    }
  }

  return result.join('\n');
}

function countNonEmptyLines(content: string): number {
  const lines = content.split('\n');
  let count = 0;
  for (const line of lines) {
    if (line.trim() !== '') {
      count++;
    }
  }
  return count;
}

function countMentionedFiles(content: string, topicFiles: string[]): number {
  const mentionedFiles = new Set<string>();

  for (const file of topicFiles) {
    const fileEscaped = file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`\\b${fileEscaped}\\b`, 'g');
    if (content.match(pattern)) {
      mentionedFiles.add(file);
    }
  }

  if (content.includes('src/')) {
    const srcPattern = /\bsrc\/[^\s\]]+\b/g;
    const matches = content.match(srcPattern);
    if (matches) {
      for (const match of matches) {
        for (const file of topicFiles) {
          if (file.includes(match) || match.includes(file)) {
            mentionedFiles.add(file);
          }
        }
      }
    }
  }

  return mentionedFiles.size;
}

export function computeQualityScore(quality: TopicQuality): number {
  const fileCoverage = quality.fileCoverage;
  const flowsGotchas = Math.min(quality.flows + quality.gotchas, 5) / 5;
  const lines = Math.min(quality.lines, 100) / 100;
  const routesCommands = quality.routes + quality.commands > 0 ? 1 : 0.5;

  const score =
    0.3 * fileCoverage +
    0.3 * flowsGotchas +
    0.2 * lines +
    0.2 * routesCommands;

  return Math.max(0, Math.min(1, score));
}

export function computeTopicQuality(
  topic: Topic,
  enrichedContent: string | null,
): TopicQuality | null {
  if (enrichedContent === null) {
    return null;
  }

  const contentWithoutFrontmatter = removeYamlFrontmatter(enrichedContent);
  const lines = countNonEmptyLines(contentWithoutFrontmatter);

  const flows = countItemsInSection(contentWithoutFrontmatter, 'flows');
  const gotchas = countItemsInSection(contentWithoutFrontmatter, 'gotchas');
  const routes = countItemsInSection(contentWithoutFrontmatter, 'routes');
  const commands = countItemsInSection(contentWithoutFrontmatter, 'commands');

  let fileCoverage = 0;
  if (topic.files.length > 0) {
    const mentionedFilesCount = countMentionedFiles(contentWithoutFrontmatter, topic.files);
    fileCoverage = Math.min(mentionedFilesCount / topic.files.length, 1);
  }

  const quality: TopicQuality = {
    lines,
    flows,
    gotchas,
    routes,
    commands,
    fileCoverage,
    score: 0,
  };

  quality.score = computeQualityScore(quality);

  return quality;
}
