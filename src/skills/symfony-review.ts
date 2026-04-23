import { readFile } from 'fs/promises';
import { join } from 'path';
import type { SkillDefinition, SkillContext } from './types.js';
import type { SkillResult } from '../types.js';
import { registerSkill } from './runner.js';

export const symfonyReviewSkill: SkillDefinition = {
  name: 'symfony-review',
  description: 'Review Symfony conventions, services, forms, repositories',
  config: {
    name: 'symfony-review',
    description: 'Review Symfony conventions, services, forms, repositories',
    inputType: 'topic',
    requiredTopics: [],
  },

  async execute(ctx: SkillContext): Promise<SkillResult> {
    const { framework, topic, projectDir } = ctx;
    const topicName = topic?.name || 'unknown';

    if (framework !== 'symfony' && framework !== 'laravel') {
      return {
        goal: `Review Symfony conventions for ${topicName}`,
        topic: topicName,
        files: [],
        actions: [],
        risks: [`Not applicable for ${framework}`],
        next: 'Check the service configuration',
      };
    }

    const phpFiles = (topic?.files || []).filter(f => f.endsWith('.php'));
    const actions: string[] = [];
    const risks: string[] = [];

    for (const file of phpFiles) {
      let content: string;
      try {
        content = await readFile(join(projectDir, file), 'utf-8');
      } catch {
        risks.push(`Could not read file: ${file}`);
        continue;
      }

      const classMatches = content.matchAll(/class\s+(\w+)/g);
      for (const match of classMatches) {
        const className = match[1];
        const line = getLineContaining(content, match.index!);

        if (/class\s+\w+Service\b/.test(line) || /#{1}\[AsService\]/.test(content)) {
          actions.push(`Service: ${className}`);
        }
        if (/class\s+\w+Type\s+extends\s+AbstractType/.test(line)) {
          actions.push(`FormType: ${className}`);
        } else if (/class\s+\w+Type\b/.test(line) && /Form/.test(file)) {
          risks.push(`Form ${className} does not extend AbstractType`);
        }
        if (/class\s+\w+Repository\b/.test(line)) {
          actions.push(`Repository: ${className}`);
        }
        if (/class\s+\w+Controller\b/.test(line)) {
          actions.push(`Controller: ${className}`);
        }
      }
    }

    return {
      goal: `Review Symfony conventions for ${topicName}`,
      topic: topicName,
      files: phpFiles,
      actions,
      risks,
      next: 'Check the service configuration',
    };
  },
};

registerSkill(symfonyReviewSkill);

function getLineContaining(content: string, offset: number): string {
  const start = content.lastIndexOf('\n', offset) + 1;
  const end = content.indexOf('\n', offset);
  return content.slice(start, end === -1 ? content.length : end);
}
