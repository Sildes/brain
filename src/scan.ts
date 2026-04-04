import { findBestAdapter } from "./detect.js";
import { formatBrainMd, formatBrainPromptMd } from "./output.js";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { BrainData } from "./types.js";

export interface ScanOptions {
  dir: string;
  outputDir?: string;
  adapter?: string;
}

export interface ScanResult {
  framework: string;
  confidence: number;
  fileCount: number;
  moduleCount: number;
  routeCount: number;
  commandCount: number;
  brainPath: string;
  promptPath: string;
}

async function ensureDir(dir: string): Promise<void> {
  try {
    await mkdir(dir, { recursive: true });
  } catch (error: any) {
    if (error.code !== "EEXIST") throw error;
  }
}

export async function scanProject(options: ScanOptions): Promise<ScanResult> {
  const { dir, outputDir = ".project", adapter: forcedAdapter } = options;

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
  const data: BrainData = await adapter.extract(dir);

  // Generate output
  const brainMd = formatBrainMd(data, dir);
  const brainPromptMd = await formatBrainPromptMd(data, dir);

  // Ensure output directory exists
  const outputPath = path.join(dir, outputDir);
  await ensureDir(outputPath);

  // Write files
  const brainPath = path.join(outputPath, "brain.md");
  const promptPath = path.join(outputPath, "brain-prompt.md");

  await writeFile(brainPath, brainMd, "utf8");
  await writeFile(promptPath, brainPromptMd, "utf8");

  console.log(`Generated: ${brainPath}`);
  console.log(`Generated: ${promptPath}`);

  return {
    framework: data.framework,
    confidence: match.confidence,
    fileCount: data.fileCount,
    moduleCount: data.modules.length,
    routeCount: data.routes.length,
    commandCount: data.commands.length,
    brainPath,
    promptPath,
  };
}
