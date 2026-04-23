import type { BrainData } from "./types.js";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

interface AgentDirOptions {
  projectDir: string;
  framework: string;
  brainData: BrainData;
  topicsList: string; // formatted list of topics
}

function generateSystemBase(options: AgentDirOptions): string {
  const { framework, topicsList } = options;
  return `# System Base

## Priority Order
1. Read \`.projectbrain/brain.md\` for project structure
2. Load topic file if relevant to the task
3. Apply skill if applicable
4. Read only the files strictly needed

## Framework
${framework}

## Quick Commands
${options.brainData.conventions.navigation.map(n => `- \`${n.command}\` — ${n.description}`).join('\n') || '- None detected'}

## Topics
${topicsList}

## Context Loading
- Load 1 topic by default, 2 max if ambiguous
- Prefer diff/extract over full file reads
- Summarize history to 10 lines max
`;
}

function generateContextPolicy(): string {
  return `# Context Policy

## Budget
- Max 1 topic per request (2 only if ambiguous)
- Max 3 full files without justification
- Prefer diff, excerpt, or summary over full file
- Summarize old history to 10 lines max

## Loading Order (static → dynamic)
1. system-base.md (stable)
2. context-policy.md (stable)
3. output-format.md (stable)
4. brain.md (session-cached)
5. 1 topic (dynamic)
6. skill.md (dynamic)
7. Current diff/logs/ticket (dynamic)

## Restrictions
- Never load > 2 topics simultaneously
- Never inject > 3 full files
- Never reload full conversation history
`;
}

function generateOutputFormat(): string {
  return `# Output Format

All skill outputs MUST follow this format:

## Structure
\`\`\`
goal: <what you're trying to accomplish>
topic: <active topic name>
files: <list of relevant files>
actions: <proposed steps>
risks: <points of attention>
next: <minimal next action>
\`\`\`

## Rules
- One line per field
- files as bullet list
- actions as numbered list
- risks as bullet list with file references
- next is a single actionable step
- Max 50 lines total output
`;
}

function generateTaskRouter(): string {
  return `# Task Router

## How It Works
1. User request comes in
2. Match keywords against topic-index.yaml
3. Select the best matching topic (max 2 if ambiguous)
4. Apply the default skill for that topic
5. If "git diff" mentioned, switch to diff-only skill

## Fallback
If no topic matches (score < 0.4):
- Use brain.md only (no topic)
- Use repo-map skill
- Ask user for clarification

## Skills Reference
| Skill | Input | Output |
|-------|-------|--------|
| repo-map | brain.md + query | Quick zone overview |
| diff-only | git diff + topic | Targeted change analysis |
| symfony-review | topic + PHP files | Conventions, risks, fixes |
| twig-inline-css | topic + Twig templates | CSS extraction/refactor |
| route-debug | error + route name | Controller, config, security |
`;
}

export async function generateAgentDir(options: AgentDirOptions): Promise<string[]> {
  const { projectDir } = options;
  const agentDir = path.join(projectDir, '.agent');
  const promptsDir = path.join(agentDir, 'prompts');
  const cacheDir = path.join(agentDir, 'cache');

  await mkdir(promptsDir, { recursive: true });
  await mkdir(cacheDir, { recursive: true });

  const files: string[] = [];

  const prompts = [
    { name: 'system-base.md', content: generateSystemBase(options) },
    { name: 'context-policy.md', content: generateContextPolicy() },
    { name: 'output-format.md', content: generateOutputFormat() },
    { name: 'task-router.md', content: generateTaskRouter() },
  ];

  for (const prompt of prompts) {
    const filePath = path.join(promptsDir, prompt.name);
    await writeFile(filePath, prompt.content, 'utf8');
    files.push(filePath);
  }

  // Create empty cache files
  const lastTopicPath = path.join(cacheDir, 'last-topic.txt');
  await writeFile(lastTopicPath, '', 'utf8');
  files.push(lastTopicPath);

  const recentContextPath = path.join(cacheDir, 'recent-context.md');
  await writeFile(recentContextPath, '', 'utf8');
  files.push(recentContextPath);

  return files;
}

export type { AgentDirOptions };
