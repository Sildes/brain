#!/usr/bin/env node
import { program } from "commander";
import { scanProject } from "./scan.js";
import { installIde } from "./install.js";
import { registerAdapter } from "./adapters/index.js";
import { symfonyAdapter } from "./adapters/symfony.js";
import { laravelAdapter } from "./adapters/laravel.js";
import { nextjsAdapter } from "./adapters/nextjs.js";
import { genericAdapter } from "./adapters/generic.js";

// Register all adapters
registerAdapter(symfonyAdapter);
registerAdapter(laravelAdapter);
registerAdapter(nextjsAdapter);
registerAdapter(genericAdapter);

program
  .name("brain")
  .description("Generate project context for LLMs - works with any IDE")
  .version("0.1.0");

program
  .command("scan")
  .description("Scan the project and generate brain files")
  .option("-o, --output <dir>", "Output directory", ".project")
  .option("-a, --adapter <name>", "Force specific adapter")
  .action(async (options) => {
    try {
      const result = await scanProject({
        dir: process.cwd(),
        outputDir: options.output,
        adapter: options.adapter,
      });
      
      console.log("\n✓ Scan complete!");
      console.log(`  Framework: ${result.framework}`);
      console.log(`  Modules: ${result.moduleCount}`);
      console.log(`  Routes: ${result.routeCount}`);
      console.log(`  Commands: ${result.commandCount}`);
      console.log(`  Files: ${result.fileCount}`);
      console.log(`\n  Generated: ${result.brainPath}`);
      console.log(`  Prompt: ${result.promptPath}`);
    } catch (error: any) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

program
  .command("install")
  .description("Install brain configuration for your IDE")
  .argument("[ide]", "Target IDE (cursor, claude, opencode, windsurf, zed, all)")
  .option("-o, --output <dir>", "Output directory", ".project")
  .action(async (ide, options) => {
    try {
      await installIde({
        dir: process.cwd(),
        ide: ide,
        brainPath: `${options.output}/brain.md`,
        promptPath: `${options.output}/brain-prompt.md`,
      });
    } catch (error: any) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

program.parse();
