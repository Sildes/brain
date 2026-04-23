import { writeFile, readFile, stat, mkdir, readdir } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

export interface InstallOptions {
  dir: string;
  ide?: string;
  brainPath: string;
  promptPath: string;
  withHook?: boolean;
}

interface IdeConfig {
  name: string;
  file: string;
  content: (brainPath: string) => string;
  commentStyle: 'hash' | 'html' | 'markdown';
  generatePrompt: (promptPath: string, brainPath: string) => string;
}

const MARKER_START = 'BRAIN:START';
const MARKER_END = 'BRAIN:END';

function getMarkerRegex(commentStyle: 'hash' | 'html' | 'markdown'): RegExp {
  if (commentStyle === 'hash') {
    return new RegExp(
      `#\\s*===\\s*${MARKER_START}\\s*===[\\s\\S]*?#\\s*===\\s*${MARKER_END}\\s*===`,
      'g'
    );
  }
  return new RegExp(
    `<!--\\s*${MARKER_START}[\\s\\S]*?${MARKER_END}\\s*-->`,
    'g'
  );
}

function wrapWithMarkers(content: string, commentStyle: 'hash' | 'html' | 'markdown'): string {
  if (commentStyle === 'hash') {
    return `# === ${MARKER_START} ===
${content}
# === ${MARKER_END} ===`;
  }
  return `<!-- ${MARKER_START} -->
${content}
<!-- ${MARKER_END} -->`;
}

const IDE_CONFIGS: Record<string, IdeConfig> = {
  cursor: {
    name: "Cursor",
    file: ".cursorrules",
    commentStyle: 'hash',
    content: (brainPath) => `# Brain - Project Context

Read ${brainPath} first for project structure and navigation commands.

# Skills
Run \`brain skill <name>\` to get structured analysis before acting.
- \`brain skill repo-map\` — Overview of repo zones from brain.md
- \`brain skill diff-only --diff "$(git diff)"\` — Targeted analysis of changed files
- \`brain skill route-debug --query "route_name"\` — Find and diagnose routes


# Workflow
1. Read ${brainPath} for structure
2. Read .agent/prompts/task-router.md for routing logic
3. Run the appropriate skill before reading source files
4. Output format: goal, topic, files, actions, risks, next

# Agent Prompts
Read .agent/prompts/ for detailed context policies and output format.`,
    generatePrompt: (promptPath, brainPath) => 
`Read ${promptPath} and generate the business context for this project.

Then write your response to ${brainPath} under the "## Business Context" section.

Format your response as:
## Business Context

### Purpose
<1-2 sentences>

### Flows
<key business flows>

### Concepts
<domain terms>

### Gotchas
<surprising behaviors>

### Decisions
<architecture choices>`,
  },
  claude: {
    name: "Claude Code",
    file: "CLAUDE.md",
    commentStyle: 'markdown',
    content: (brainPath) => `Read \`${brainPath}\` first for project structure and navigation commands.

## Skills

Run \`brain skill <name>\` to get structured analysis before acting.

| Skill | When to use |
|-------|-------------|
| \`brain skill repo-map\` | Need an overview of repo zones |
| \`brain skill diff-only --diff "$(git diff)"\` | Reviewing changes |
| \`brain skill route-debug --query "name"\` | Debugging a route |


## Workflow

1. Read \`${brainPath}\` for structure
2. Read \`.agent/prompts/task-router.md\` for routing logic
3. Run the appropriate \`brain skill\` before reading source files
4. Follow output format: goal, topic, files, actions, risks, next

## Context Policy

Read \`.agent/prompts/\` for context loading rules and output format.`,
    generatePrompt: (promptPath, brainPath) => 
`Read ${promptPath} and generate the business context for this project.

Then write your response to ${brainPath} under the "## Business Context" section.

Format your response as:
## Business Context

### Purpose
<1-2 sentences>

### Flows
<key business flows>

### Concepts
<domain terms>

### Gotchas
<surprising behaviors>

### Decisions
<architecture choices>`,
  },
  opencode: {
    name: "Opencode",
    file: ".opencode/rules.md",
    commentStyle: 'markdown',
    content: (brainPath) => `Read \`${brainPath}\` first for project structure and navigation commands.

## Skills

Run \`brain skill <name>\` for structured analysis:
- \`repo-map\` — repo overview
- \`diff-only --diff "\$(git diff)"\` — change analysis
- \`route-debug --query "name"\` — route diagnosis

## Workflow

1. Read \`${brainPath}\` for structure
2. Read \`.agent/prompts/task-router.md\` for routing
3. Run the matching skill before diving into code

Read \`.agent/prompts/\` for context policies.`,
    generatePrompt: (promptPath, brainPath) => 
`Read ${promptPath} and generate the business context for this project.

Then write your response to ${brainPath} under the "## Business Context" section.`,
  },
  windsurf: {
    name: "Windsurf",
    file: ".windsurfrules",
    commentStyle: 'hash',
    content: (brainPath) => `Read ${brainPath} first for project structure.

# Skills
Run \`brain skill <name>\` before acting:
- \`brain skill repo-map\` — repo overview
- \`brain skill diff-only --diff "\$(git diff)"\` — change analysis
- \`brain skill route-debug --query "name"\` — route diagnosis

Read .agent/prompts/ for routing and context policies.`,
    generatePrompt: (promptPath, brainPath) => 
`Read ${promptPath} and generate the business context for this project.

Then write your response to ${brainPath} under the "## Business Context" section.`,
  },
  zed: {
    name: "Zed",
    file: ".zed/rules.md",
    commentStyle: 'markdown',
    content: (brainPath) => `Read \`${brainPath}\` first for project structure.

## Skills

Run \`brain skill <name>\` for structured analysis:
- \`repo-map\` — repo overview
- \`diff-only --diff "\$(git diff)"\` — change analysis
- \`route-debug --query "name"\` — route diagnosis

Read \`.agent/prompts/\` for routing and context policies.`,
    generatePrompt: (promptPath, brainPath) => 
`Read ${promptPath} and generate the business context for this project.

Then write your response to ${brainPath} under the "## Business Context" section.`,
  },
};

const AVAILABLE_IDES = Object.keys(IDE_CONFIGS);

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function promptIde(): Promise<string> {
  const rl = createInterface({ input, output });
  
  console.log("\nSelect your IDE:\n");
  AVAILABLE_IDES.forEach((ide, i) => {
    console.log(`  ${i + 1}. ${IDE_CONFIGS[ide].name}`);
  });
  console.log(`  ${AVAILABLE_IDES.length + 1}. All (install for every IDE)\n`);
  
  const answer = await rl.question("Choice [1-" + (AVAILABLE_IDES.length + 1) + "]: ");
  rl.close();
  
  const choice = parseInt(answer, 10);
  if (choice >= 1 && choice <= AVAILABLE_IDES.length) {
    return AVAILABLE_IDES[choice - 1];
  }
  if (choice === AVAILABLE_IDES.length + 1) {
    return "all";
  }
  
  throw new Error("Invalid choice");
}

async function installForIde(dir: string, ideKey: string, brainPath: string): Promise<void> {
  const config = IDE_CONFIGS[ideKey];
  if (!config) {
    throw new Error(`Unknown IDE: ${ideKey}`);
  }
  
  const filePath = path.join(dir, config.file);
  const newContent = wrapWithMarkers(config.content(brainPath), config.commentStyle);
  
  // Ensure directory exists for nested paths
  const dirPath = path.dirname(filePath);
  await mkdir(dirPath, { recursive: true }).catch(() => {});
  
  // Check if file exists
  const exists = await fileExists(filePath);
  
  if (!exists) {
    await writeFile(filePath, newContent, "utf8");
    console.log(`  ✓ Created ${config.file}`);
    return;
  }
  
  // Read existing content
  const existingContent = await readFile(filePath, "utf8");
  const markerRegex = getMarkerRegex(config.commentStyle);
  
  if (markerRegex.test(existingContent)) {
    const updatedContent = existingContent.replace(markerRegex, newContent);
    await writeFile(filePath, updatedContent, "utf8");
    console.log(`  ✓ Updated brain section in ${config.file}`);
  } else {
    const separator = config.commentStyle === 'hash' ? '\n\n' : '\n\n---\n\n';
    const updatedContent = existingContent.trimEnd() + separator + newContent + '\n';
    await writeFile(filePath, updatedContent, "utf8");
    console.log(`  ✓ Appended brain section to ${config.file}`);
  }
}

function printGeneratePrompt(ideKey: string, promptPath: string, brainPath: string): void {
  const config = IDE_CONFIGS[ideKey];
  if (!config) return;
  
  const prompt = config.generatePrompt(promptPath, brainPath);
  
  console.log("\n" + "━".repeat(60));
  console.log("📋 Copy this prompt to your IDE's chat:");
  console.log("━".repeat(60) + "\n");
  console.log(prompt);
  console.log("\n" + "━".repeat(60));
  console.log("After pasting, the LLM will update " + brainPath);
  console.log("━".repeat(60));
}

export async function installIde(options: InstallOptions): Promise<void> {
  const { dir, ide, brainPath, promptPath, withHook } = options;
  
  // Validate brain.md exists
  const brainFile = path.join(dir, brainPath);
  if (!await fileExists(brainFile)) {
    throw new Error(`Brain file not found: ${brainPath}. Run 'brain scan' first.`);
  }
  
  let targetIde = ide?.toLowerCase();
  
  // If no IDE specified, prompt user
  if (!targetIde) {
    targetIde = await promptIde();
  }
  
  console.log("\nInstalling brain configuration...\n");
  
  if (targetIde === "all") {
    for (const ideKey of AVAILABLE_IDES) {
      await installForIde(dir, ideKey, brainPath);
    }
  } else if (IDE_CONFIGS[targetIde]) {
    await installForIde(dir, targetIde, brainPath);
    
    // Show the generate prompt for single IDE install
    printGeneratePrompt(targetIde, promptPath, brainPath);
  } else {
    throw new Error(`Unknown IDE: ${targetIde}. Available: ${AVAILABLE_IDES.join(", ")}, all`);
  }
  
  // Generate .agent/ directory
  await generateAgentDirectory(dir);
  
  // Hook install
  let shouldInstallHook = withHook ?? false;
  if (withHook === undefined) {
    shouldInstallHook = await promptHook();
  }
  if (shouldInstallHook) {
    const { installHook } = await import("./hook.js");
    const hookPath = await installHook(dir);
    console.log(`  ✓ Pre-commit hook installed at ${hookPath}`);
  }
  
  console.log("\n✓ Done!");
}

async function generateAgentDirectory(dir: string): Promise<void> {
  try {
    const { generateAgentDir } = await import("./agent-generator.js");
    
    const brainFilePath = path.join(dir, '.projectbrain', 'brain.md');
    let framework = 'Generic';
    let navigation: Array<{ command: string; description: string }> = [];
    let quickFind: Array<{ task: string; location: string }> = [];
    let fileCount = 0;
    
    try {
      const brainContent = await readFile(brainFilePath, 'utf8');
      const fwMatch = brainContent.match(/Generated:.*·\s*(\S+)\s*·/);
      if (fwMatch) framework = fwMatch[1];
      
      const fcMatch = brainContent.match(/·\s*(\d+)\s*files/);
      if (fcMatch) fileCount = parseInt(fcMatch[1], 10);
      
      const navSection = brainContent.match(/## Navigation \(CLI\)\n```bash\n([\s\S]*?)```/);
      if (navSection) {
        const lines = navSection[1].trim().split('\n').filter(l => l.startsWith('#') || l.trim().length > 0);
        let currentCmd = '';
        for (const line of lines) {
          const cmdMatch = line.match(/^#\s+(.+)/);
          if (cmdMatch) {
            currentCmd = cmdMatch[1].replace(/^#\s*/, '');
          } else if (currentCmd) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
              navigation.push({ command: trimmed, description: currentCmd });
              currentCmd = '';
            }
          }
        }
      }
      
      const { parseBrainMd } = await import("./skills/repo-map.js");
      const parsed = parseBrainMd(brainContent);
      quickFind = parsed.quickFind.map(q => ({ task: q.task, location: q.location }));
    } catch {
      // brain.md missing or unparseable — use defaults
    }
    
    const topicsList = buildTopicsList(dir);
    const brainData: import("./types.js").BrainData = {
      framework,
      modules: [],
      routes: [],
      commands: [],
      conventions: { standards: [], notes: [], navigation },
      keyFiles: [],
      quickFind,
      fileCount,
    };
    
    const files = await generateAgentDir({
      projectDir: dir,
      framework,
      brainData,
      topicsList,
    });
    console.log(`  ✓ Generated .agent/ directory (${files.length} files)`);
  } catch (error: any) {
    console.error(`  ⚠ Agent directory generation skipped: ${error.message}`);
  }
}

function buildTopicsList(dir: string): string {
  try {
    const topicsDir = path.join(dir, '.projectbrain', 'brain-topics');
    if (!existsSync(topicsDir)) return '- No topics detected';
    const entries = readdirSync(topicsDir)
      .filter((f: string) => f.endsWith('.md') && !f.startsWith('.'));
    if (entries.length === 0) return '- No topics detected';
    return entries.map((f: string) => `- ${f.replace('.md', '')}`).join('\n');
  } catch {
    return '- No topics detected';
  }
}

async function promptHook(): Promise<boolean> {
  const rl = createInterface({ input, output });
  const answer = await rl.question("Also install pre-commit hook? [Y/n] ");
  rl.close();
  return answer.trim().toLowerCase() !== 'n';
}
