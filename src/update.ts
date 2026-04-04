import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { findBestAdapter } from "./detect.js";
import { formatBrainMd, formatBrainPromptMd } from "./output.js";
import { writeFile, mkdir } from "node:fs/promises";
import type { BrainData } from "./types.js";

export interface UpdateOptions {
  dir: string;
  outputDir?: string;
  adapter?: string;
}

export interface UpdateResult {
  framework: string;
  confidence: number;
  fileCount: number;
  moduleCount: number;
  routeCount: number;
  commandCount: number;
  brainPath: string;
  promptPath: string;
  contextPreserved: boolean;
}

const BUSINESS_CONTEXT_REGEX = /(^## Business Context[\s\S]*?)(?=^## )/m;

/**
 * Extracts the Business Context section from brain.md content.
 * Returns null if the section doesn't exist.
 */
export function extractBusinessContext(content: string): string | null {
  const match = content.match(BUSINESS_CONTEXT_REGEX);
  if (!match) return null;
  return match[0];
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(dir: string): Promise<void> {
  try {
    await mkdir(dir, { recursive: true });
  } catch (error: any) {
    if (error.code !== "EEXIST") throw error;
  }
}

export async function updateProject(options: UpdateOptions): Promise<UpdateResult> {
  const { dir, outputDir = ".project", adapter: forcedAdapter } = options;

  // Path to existing brain.md
  const brainPath = path.join(dir, outputDir, "brain.md");
  const promptPath = path.join(dir, outputDir, "brain-prompt.md");

  // Extract existing Business Context if brain.md exists
  let existingBusinessContext: string | null = null;
  if (await fileExists(brainPath)) {
    const existingContent = await readFile(brainPath, "utf8");
    existingBusinessContext = extractBusinessContext(existingContent);
  }

  // Find best adapter
  const result = await findBestAdapter(dir);

  if (!result) {
    throw new Error("No suitable adapter found for this project");
  }

  const { adapter, match } = result;

  if (forcedAdapter && adapter.name !== forcedAdapter) {
    throw new Error(`Forced adapter "${forcedAdapter}" does not match detected framework "${adapter.name}"`);
  }

  console.log(`Detected: ${match.framework} (confidence: ${(match.confidence * 100).toFixed(0)}%)`);
  console.log(`Reasons: ${match.reasons.join(", ")}`);

  // Extract project data
  console.log(`Scanning project with ${adapter.name} adapter...`);
  const data = await adapter.extract(dir);

  // Generate output with optional Business Context
  const brainMd = formatBrainMd(data, dir, existingBusinessContext || undefined);
  const brainPromptMd = await formatBrainPromptMd(data, dir);

  // Ensure output directory exists
  const outputPath = path.join(dir, outputDir);
  await ensureDir(outputPath);

  // Write files
  await writeFile(brainPath, brainMd, "utf8");
  await writeFile(promptPath, brainPromptMd, "utf8");

  console.log(`Updated: ${brainPath}`);
  console.log(`Updated: ${promptPath}`);

  return {
    framework: data.framework,
    confidence: match.confidence,
    fileCount: data.fileCount,
    moduleCount: data.modules.length,
    routeCount: data.routes.length,
    commandCount: data.commands.length,
    brainPath,
    promptPath,
    contextPreserved: existingBusinessContext !== null,
  };
}
