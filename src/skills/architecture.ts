import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { SkillDefinition, SkillContext } from './types.js';
import type { SkillResult, TopicIndex } from '../types.js';
import { registerSkill } from './runner.js';
import { parseBrainMd } from './repo-map.js';
import { parseTopicIndexYaml } from '../topic-index.js';

function generateGlobalPrompt(
  brainContent: string,
  topicIndex: TopicIndex | null,
  enrichedTopics: Map<string, string>,
  framework: string,
): string {
  const lines: string[] = [];

  lines.push('# Architecture Diagram Generation');
  lines.push('');
  lines.push('Generate an architecture diagram for the following project.');
  lines.push('Produce both a **Mermaid** diagram and an **ASCII** fallback.');
  lines.push('');
  lines.push('## Requirements');
  lines.push('');
  lines.push('- Use `graph TD` (top-down) for the Mermaid diagram');
  lines.push('- Modules → rectangular nodes `[name]`');
  lines.push('- Topics → rounded nodes `(name)`');
  lines.push('- Solid arrows `-->` for hard dependencies (depends_on)');
  lines.push('- Dashed arrows `-.->` for related/soft links (related_to)');
  lines.push('- Group nodes by layer if you can identify one (e.g. presentation, domain, infrastructure)');
  lines.push('- Keep the diagram readable: max ~20 nodes. Merge trivial modules if needed');
  lines.push('');
  lines.push('## Output format');
  lines.push('');
  lines.push('```markdown');
  lines.push('# Architecture');
  lines.push('');
  lines.push('Framework: <framework>');
  lines.push('');
  lines.push('## Mermaid');
  lines.push('');
  lines.push('```mermaid');
  lines.push('graph TD');
  lines.push('    ...');
  lines.push('```');
  lines.push('');
  lines.push('## ASCII');
  lines.push('');
  lines.push('```');
  lines.push('[Module A] --> [Module B]');
  lines.push('(Topic X) -.-> (Topic Y)');
  lines.push('```');
  lines.push('');
  lines.push('## Legend');
  lines.push('- [Module] = rectangle');
  lines.push('- (Topic) = rounded');
  lines.push('- --> = depends on');
  lines.push('- -.-> = related to');
  lines.push('```');
  lines.push('');
  lines.push('## Project context');
  lines.push('');
  lines.push(`Framework: ${framework}`);
  lines.push('');

  lines.push('### brain.md');
  lines.push('');
  lines.push('```');
  lines.push(brainContent);
  lines.push('```');
  lines.push('');

  if (topicIndex) {
    lines.push('### Topic dependencies');
    lines.push('');
    lines.push('```yaml');
    for (const [name, entry] of Object.entries(topicIndex.topics)) {
      const deps = entry.dependsOn.length > 0 ? entry.dependsOn.join(', ') : 'none';
      const related = entry.relatedTo.length > 0 ? entry.relatedTo.join(', ') : 'none';
      lines.push(`${name}:`);
      lines.push(`  depends_on: ${deps}`);
      lines.push(`  related_to: ${related}`);
    }
    lines.push('```');
    lines.push('');
  }

  const enrichedNames = [...enrichedTopics.keys()];
  if (enrichedNames.length > 0) {
    lines.push('### Enriched topics');
    lines.push('');
    for (const [name, content] of enrichedTopics) {
      lines.push(`#### ${name}`);
      lines.push('');
      lines.push(content);
      lines.push('');
    }
  }

  return lines.join('\n');
}

function generateTopicPrompt(
  topicName: string,
  topicContent: string,
  topicIndex: TopicIndex | null,
  relatedTopics: Map<string, string>,
  framework: string,
): string {
  const lines: string[] = [];

  lines.push(`# Architecture Diagram for Topic: ${topicName}`);
  lines.push('');
  lines.push(`Generate an architecture diagram focused on the **${topicName}** topic.`);
  lines.push('Produce both a **Mermaid** diagram and an **ASCII** fallback.');
  lines.push('');
  lines.push('## Requirements');
  lines.push('');
  lines.push('- Use `graph TD` (top-down) for the Mermaid diagram');
  lines.push('- Show internal components of this topic and their relationships');
  lines.push('- Show connections to other topics/modules this topic depends on');
  lines.push('- Solid arrows `-->` for hard dependencies');
  lines.push('- Dashed arrows `-.->` for related/soft links');
  lines.push('- Keep it focused: only nodes relevant to this topic');
  lines.push('');
  lines.push('## Output format');
  lines.push('');
  lines.push('```markdown');
  lines.push(`# Architecture: ${topicName}`);
  lines.push('');
  lines.push('## Mermaid');
  lines.push('');
  lines.push('```mermaid');
  lines.push('graph TD');
  lines.push('    ...');
  lines.push('```');
  lines.push('');
  lines.push('## ASCII');
  lines.push('');
  lines.push('```');
  lines.push('...');
  lines.push('```');
  lines.push('```');
  lines.push('');
  lines.push('## Topic context');
  lines.push('');
  lines.push(`Framework: ${framework}`);
  lines.push('');

  lines.push(`### ${topicName} (enriched)`);
  lines.push('');
  lines.push(topicContent);
  lines.push('');

  if (topicIndex) {
    const entry = topicIndex.topics[topicName];
    if (entry) {
      lines.push('### Dependencies');
      lines.push('');
      if (entry.dependsOn.length > 0) {
        lines.push(`Depends on: ${entry.dependsOn.join(', ')}`);
      }
      if (entry.relatedTo.length > 0) {
        lines.push(`Related to: ${entry.relatedTo.join(', ')}`);
      }
      lines.push('');
    }
  }

  if (relatedTopics.size > 0) {
    lines.push('### Related topics');
    lines.push('');
    for (const [name, content] of relatedTopics) {
      lines.push(`#### ${name}`);
      lines.push('');
      lines.push(content);
      lines.push('');
    }
  }

  return lines.join('\n');
}

export const architectureSkill: SkillDefinition = {
  name: 'architecture',
  description: 'Generate architecture prompt (Mermaid + ASCII) from brain.md and topic-index.yaml',
  config: {
    name: 'architecture',
    description: 'Generate architecture prompt (Mermaid + ASCII) from brain.md and topic-index.yaml',
    inputType: 'query',
    requiredTopics: [],
  },
  async execute(ctx: SkillContext): Promise<SkillResult> {
    const brainPath = path.join(ctx.projectDir, '.projectbrain', 'brain.md');
    const topicIndexPath = path.join(ctx.projectDir, '.projectbrain', 'brain-topics', 'topic-index.yaml');
    const topicsDir = path.join(ctx.projectDir, '.projectbrain', 'brain-topics');
    const files: string[] = [];
    const risks: string[] = [];

    let brainContent = '';
    try {
      brainContent = await readFile(brainPath, 'utf-8');
      files.push('.projectbrain/brain.md');
    } catch {
      return {
        goal: 'Generate architecture prompt',
        topic: ctx.query || 'global',
        files: [],
        actions: ['Generate brain.md with `brain scan`'],
        risks: ['brain.md not found — run `brain scan` first'],
        next: 'Run `brain scan` to generate project structure',
      };
    }

    let topicIndex: TopicIndex | null = null;
    try {
      const yaml = await readFile(topicIndexPath, 'utf-8');
      topicIndex = parseTopicIndexYaml(yaml);
      files.push('.projectbrain/brain-topics/topic-index.yaml');
    } catch {
      risks.push('topic-index.yaml not found — dependency edges will be missing');
    }

    const topicName = ctx.query;

    if (topicName) {
      const topicPath = path.join(topicsDir, `${topicName}.md`);
      let topicContent = '';
      try {
        topicContent = await readFile(topicPath, 'utf-8');
        files.push(`.projectbrain/brain-topics/${topicName}.md`);
      } catch {
        return {
          goal: 'Generate architecture prompt',
          topic: topicName,
          files,
          actions: [`Topic "${topicName}" has no enriched file`],
          risks: [`.projectbrain/brain-topics/${topicName}.md not found — enrich the topic first`],
          next: `Run \`brain prompt --topic ${topicName}\` then paste the LLM response to brain-topics/${topicName}.md`,
        };
      }

      const relatedTopics = new Map<string, string>();
      if (topicIndex) {
        const entry = topicIndex.topics[topicName];
        if (entry) {
          for (const dep of [...entry.dependsOn, ...entry.relatedTo]) {
            try {
              const content = await readFile(path.join(topicsDir, `${dep}.md`), 'utf-8');
              relatedTopics.set(dep, content);
              files.push(`.projectbrain/brain-topics/${dep}.md`);
            } catch {
              risks.push(`Related topic "${dep}" has no enriched file`);
            }
          }
        }
      }

      const content = generateTopicPrompt(topicName, topicContent, topicIndex, relatedTopics, ctx.framework);

      return {
        goal: `Generate architecture prompt for topic "${topicName}"`,
        topic: topicName,
        files,
        actions: [
          `Read enriched topic "${topicName}"`,
          'Read topic dependencies',
          'Generated topic architecture prompt',
        ],
        risks,
        next: `Copy the prompt to your LLM, save the response to .projectbrain/architecture-${topicName}.md`,
        content,
        outputFile: `.projectbrain/architecture-${topicName}-prompt.md`,
      };
    }


    const parsed = parseBrainMd(brainContent);
    const enrichedTopics = new Map<string, string>();

    for (const topic of parsed.topics) {
      try {
        const content = await readFile(path.join(topicsDir, `${topic.name}.md`), 'utf-8');
        if (content.trim().length > 0) {
          enrichedTopics.set(topic.name, content);
          files.push(`.projectbrain/brain-topics/${topic.name}.md`);
        }
      } catch {
      }
    }

    if (enrichedTopics.size === 0 && parsed.moduleDetails.length === 0) {
      return {
        goal: 'Generate architecture prompt',
        topic: 'global',
        files,
        actions: ['No enriched topics or modules found'],
        risks: ['Not enough context — run `brain scan` then enrich topics'],
        next: 'Run `brain scan` then `brain prompt --topic all` to enrich topics',
      };
    }

    if (enrichedTopics.size < parsed.topics.length) {
      const missing = parsed.topics
        .filter((t) => !enrichedTopics.has(t.name))
        .map((t) => t.name);
      risks.push(`Topics not enriched: ${missing.join(', ')} — diagram may be incomplete`);
    }

    const content = generateGlobalPrompt(brainContent, topicIndex, enrichedTopics, ctx.framework);

    return {
      goal: 'Generate global architecture prompt',
      topic: 'global',
      files,
      actions: [
        'Read brain.md',
        `Read ${enrichedTopics.size} enriched topics`,
        'Generated global architecture prompt',
      ],
      risks,
      next: 'Copy the prompt to your LLM, save the response to .projectbrain/architecture.md',
      content,
      outputFile: '.projectbrain/architecture-prompt.md',
    };
  },
};

registerSkill(architectureSkill);
