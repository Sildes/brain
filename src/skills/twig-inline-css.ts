import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { SkillDefinition, SkillContext } from './types.js';
import type { SkillConfig, SkillResult } from '../types.js';
import { registerSkill } from './runner.js';

const config: SkillConfig = {
  name: 'twig-inline-css',
  description: 'Extract and refactor inline CSS from Twig templates',
  inputType: 'topic',
  requiredTopics: [],
};

const STYLE_REGEX = /style\s*=\s*"([^"]*)"/g;
const RISK_THRESHOLD = 3;
const COMPLEX_SELECTOR_LENGTH = 50;

function isTwigFile(filePath: string): boolean {
  return filePath.endsWith('.html.twig') || filePath.endsWith('.twig');
}

interface FileAnalysis {
  file: string;
  count: number;
  styles: string[];
}

async function analyzeInlineStyles(files: string[], projectDir: string): Promise<FileAnalysis[]> {
  const results: FileAnalysis[] = [];

  for (const file of files) {
    try {
      const content = await readFile(join(projectDir, file), 'utf-8');
      const styles: string[] = [];
      let match: RegExpExecArray | null;
      const regex = new RegExp(STYLE_REGEX.source, 'g');
      while ((match = regex.exec(content)) !== null) {
        styles.push(match[1]);
      }
      results.push({ file, count: styles.length, styles });
    } catch {
      results.push({ file, count: 0, styles: [] });
    }
  }

  return results;
}

function modeAnalyze(analysis: FileAnalysis[], topicName: string): SkillResult {
  const withStyles = analysis.filter(a => a.count > 0);

  return {
    goal: 'Analyze inline CSS in Twig templates',
    topic: topicName,
    files: withStyles.map(a => a.file),
    actions: withStyles.map(a => `${a.file}: ${a.count} inline style(s)`),
    risks: withStyles
      .filter(a => a.count >= RISK_THRESHOLD)
      .map(a => `${a.file} has ${a.count} inline styles — consider refactoring`),
    next: 'Run generate-css mode to extract styles',
  };
}

function modeGenerateCss(analysis: FileAnalysis[], topicName: string): SkillResult {
  const withStyles = analysis.filter(a => a.count > 0);

  return {
    goal: 'Generate CSS classes from inline styles',
    topic: topicName,
    files: withStyles.map(a => a.file),
    actions: withStyles.flatMap(a =>
      a.styles.map(s => `${a.file}: propose class for "${s}"`)
    ),
    risks: withStyles.flatMap(a =>
      a.styles
        .filter(s => s.length > COMPLEX_SELECTOR_LENGTH)
        .map(s => `Complex selector: "${s.substring(0, COMPLEX_SELECTOR_LENGTH)}..."`)
    ),
    next: 'Run apply mode to see replacement suggestions',
  };
}

function modeApply(analysis: FileAnalysis[], topicName: string): SkillResult {
  const withStyles = analysis.filter(a => a.count > 0);

  return {
    goal: 'Generate replacement suggestions for inline CSS',
    topic: topicName,
    files: withStyles.map(a => a.file),
    actions: withStyles.map(a => `${a.file}: replace ${a.count} inline style(s) with CSS classes`),
    risks: withStyles.map(a => `${a.file}: manual review required before applying`),
    next: 'Run dry-run mode to preview changes',
  };
}

function modeDryRun(analysis: FileAnalysis[], topicName: string): SkillResult {
  const withStyles = analysis.filter(a => a.count > 0);

  return {
    goal: 'Preview inline CSS refactoring (dry-run)',
    topic: topicName,
    files: withStyles.map(a => a.file),
    actions: withStyles.map(a => `[dry-run] ${a.file}: would replace ${a.count} inline style(s)`),
    risks: [],
    next: 'Apply changes manually or with generate-css output',
  };
}

export const twigInlineCssSkill: SkillDefinition = {
  name: config.name,
  description: config.description,
  config,
  async execute(ctx: SkillContext): Promise<SkillResult> {
    const mode = ctx.query || 'analyze';
    const topicName = ctx.topic?.name || 'unknown';
    const twigFiles = (ctx.topic?.files || []).filter(isTwigFile);

    const analysis = await analyzeInlineStyles(twigFiles, ctx.projectDir);

    switch (mode) {
      case 'analyze':
        return modeAnalyze(analysis, topicName);
      case 'generate-css':
        return modeGenerateCss(analysis, topicName);
      case 'apply':
        return modeApply(analysis, topicName);
      case 'dry-run':
        return modeDryRun(analysis, topicName);
      default:
        return {
          goal: 'Unknown mode for twig-inline-css',
          topic: topicName,
          files: [],
          actions: [`Unknown mode: ${mode}. Use: analyze, generate-css, apply, dry-run`],
          risks: [],
          next: 'Use a valid mode: analyze, generate-css, apply, dry-run',
        };
    }
  },
};

registerSkill(twigInlineCssSkill);
