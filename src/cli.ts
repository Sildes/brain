#!/usr/bin/env node
import { program } from "commander";
import { scanProject } from "./scan.js";
import { updateProject } from "./update.js";
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
  .option("-d, --dir <path>", "Project directory", process.cwd())
  .option("-o, --output <dir>", "Output directory", ".project")
  .option("-a, --adapter <name>", "Force specific adapter")
  .action(async (options) => {
    try {
      const result = await scanProject({
        dir: options.dir,
        outputDir: options.output,
        adapter: options.adapter,
      });
      
      console.log("\n✓ Scan complete!");
      console.log(`  Framework: ${result.framework}`);
      console.log(`  Modules: ${result.moduleCount}`);
      console.log(`  Routes: ${result.routeCount}`);
      console.log(`  Commands: ${result.commandCount}`);
      console.log(`  Files: ${result.fileCount}`);

      if (result.topics.length > 0) {
        console.log("\n  Topics:");
        const byStatus = new Map<string, typeof result.topics>();
        for (const t of result.topics) {
          const group = t.status;
          if (!byStatus.has(group)) byStatus.set(group, []);
          byStatus.get(group)!.push(t);
        }

        const statusOrder = ['new', 'stale', 'up_to_date', 'orphaned'];
        for (const status of statusOrder) {
          const group = byStatus.get(status);
          if (!group) continue;
          for (const t of group) {
            const icon =
              t.status === 'up_to_date' ? '  OK' :
              t.status === 'new' ? '   +' :
              t.status === 'stale' ? '   !' :
              '   ?';

            let detail = `${t.fileCount} files, ${t.routeCount} routes`;
            if (t.staleReason === 'files_changed' && t.staleDetails) {
              const parts: string[] = [];
              if (t.staleDetails.added?.length) parts.push(`+${t.staleDetails.added.length} files`);
              if (t.staleDetails.removed?.length) parts.push(`-${t.staleDetails.removed.length} files`);
              detail += ` (${parts.join(', ')})`;
            } else if (t.staleReason === 'content_changed' && t.staleDetails?.modified?.length) {
              detail += ` (${t.staleDetails.modified.length} modified)`;
            }

            console.log(`  ${icon} ${t.name.padEnd(20)} ${t.status.padEnd(12)} ${detail}`);
          }
        }
      }

      if (result.promptFiles.length > 0) {
        console.log("\n  Prompts generated:");
        for (const f of result.promptFiles) {
          console.log(`    - ${f}`);
        }
        console.log("\n  Next steps:");
        console.log("    1. Copy brain-topics-prompt.md to your LLM");
        console.log("    2. Save each topic response to brain-topics/[name].md");
      } else if (result.topics.length > 0) {
        console.log("\n  All topics up to date.");
      }

      console.log(`\n  Generated: ${result.brainPath}`);
      console.log(`  Prompt: ${result.promptPath}`);
    } catch (error: any) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

program
  .command("update")
  .description("Update brain files while preserving Business Context")
  .option("-d, --dir <path>", "Project directory", process.cwd())
  .option("-o, --output <dir>", "Output directory", ".project")
  .option("-a, --adapter <name>", "Force specific adapter")
  .action(async (options) => {
    try {
      const result = await updateProject({
        dir: options.dir,
        outputDir: options.output,
        adapter: options.adapter,
      });
      
      console.log("\n✓ Update complete!");
      console.log(`  Framework: ${result.framework}`);
      console.log(`  Modules: ${result.moduleCount}`);
      console.log(`  Routes: ${result.routeCount}`);
      console.log(`  Commands: ${result.commandCount}`);
      console.log(`  Files: ${result.fileCount}`);
      if (result.contextPreserved) {
        console.log(`  Business Context: preserved`);
      }
      console.log(`\n  Updated: ${result.brainPath}`);
      console.log(`  Updated: ${result.promptPath}`);
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
