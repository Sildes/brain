import { writeFile, readFile, stat, mkdir } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

export interface InstallOptions {
  dir: string;
  ide?: string;
  brainPath: string;
  promptPath: string;
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
    content: (brainPath) => `Read ${brainPath} first for project context.
Use navigation commands listed there for live data.

Quick commands:
- Routes: php bin/console debug:router
- Services: php bin/console debug:container
- Tests: php bin/phpunit`,
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
    content: (brainPath) => `Read \`${brainPath}\` first for project context.

Use navigation commands listed there for live data.

### Quick Commands
- Routes: \`php bin/console debug:router\`
- Services: \`php bin/console debug:container\`
- Tests: \`php bin/phpunit\``,
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
    content: (brainPath) => `Read \`${brainPath}\` first for project context.

Use navigation commands listed there for live data.

### Quick Commands
- Routes: \`php bin/console debug:router\`
- Services: \`php bin/console debug:container\`
- Tests: \`php bin/phpunit\``,
    generatePrompt: (promptPath, brainPath) => 
`Read ${promptPath} and generate the business context for this project.

Then write your response to ${brainPath} under the "## Business Context" section.`,
  },
  windsurf: {
    name: "Windsurf",
    file: ".windsurfrules",
    commentStyle: 'hash',
    content: (brainPath) => `Read ${brainPath} first for project context.
Use navigation commands listed there for live data.`,
    generatePrompt: (promptPath, brainPath) => 
`Read ${promptPath} and generate the business context for this project.

Then write your response to ${brainPath} under the "## Business Context" section.`,
  },
  zed: {
    name: "Zed",
    file: ".zed/rules.md",
    commentStyle: 'markdown',
    content: (brainPath) => `Read \`${brainPath}\` first for project context.

Use navigation commands listed there for live data.`,
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
  const { dir, ide, brainPath, promptPath } = options;
  
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
  
  console.log("\n✓ Done!");
}
