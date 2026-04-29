#!/usr/bin/env node
import { program } from "commander";
import { scanProject } from "./scan.js";
import { updateProject } from "./update.js";
import { installIde } from "./install.js";
import { enrichTopics } from "./enrich.js";
import { registerAdapter } from "./adapters/index.js";
import { symfonyAdapter } from "./adapters/symfony.js";
import { laravelAdapter } from "./adapters/laravel.js";
import { nextjsAdapter } from "./adapters/nextjs.js";
import { genericAdapter } from "./adapters/generic.js";
import { findBestAdapter } from "./detect.js";
import { discoverTopics, mergeOverlappingTopics } from "./discover.js";
import { TopicStatus } from "./types.js";
import { execFile } from "node:child_process";
import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(path.join(__dirname, "../package.json"), "utf8"));

// Register all adapters
registerAdapter(symfonyAdapter);
registerAdapter(laravelAdapter);
registerAdapter(nextjsAdapter);
registerAdapter(genericAdapter);

program
  .name("brain")
  .description("Generate project context for LLMs - works with any IDE")
  .version(pkg.version);

program
  .command("scan")
  .description("Scan the project and generate brain files")
  .option("-d, --dir <path>", "Project directory", process.cwd())
  .option("-o, --output <dir>", "Output directory", ".projectbrain")
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
        const freshnessMap = new Map(
          (result.freshnessEntries || []).map(e => [e.topic, e.status]),
        );

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

            const freshStatus = freshnessMap.get(t.name) || 'fresh';
            const freshBadge = `[${freshStatus}]`;

            let detail = `${t.fileCount} files, ${t.routeCount} routes`;
            if (t.staleReason === 'files_changed' && t.staleDetails) {
              const parts: string[] = [];
              if (t.staleDetails.added?.length) parts.push(`+${t.staleDetails.added.length} files`);
              if (t.staleDetails.removed?.length) parts.push(`-${t.staleDetails.removed.length} files`);
              detail += ` (${parts.join(', ')})`;
            } else if (t.staleReason === 'content_changed' && t.staleDetails?.modified?.length) {
              detail += ` (${t.staleDetails.modified.length} modified)`;
            }

            console.log(`  ${icon} ${t.name.padEnd(20)} ${freshBadge.padEnd(8)} ${detail}`);
          }
        }
      }

      if (result.promptFiles.length > 0) {
        console.log("\n  Prompts generated:");
        for (const f of result.promptFiles) {
          console.log(`    - ${f}`);
        }
        console.log("\n  Next step:");
        console.log("    Copy brain-topics-prompt.md to your LLM");
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
  .option("-o, --output <dir>", "Output directory", ".projectbrain")
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
  .option("-d, --dir <path>", "Project directory", process.cwd())
  .option("-o, --output <dir>", "Output directory", ".projectbrain")
  .option("--with-hook", "Install pre-commit hook without prompting")
  .action(async (ide, options) => {
    try {
      await installIde({
        dir: options.dir,
        ide: ide,
        brainPath: `${options.output}/brain.md`,
        promptPath: `${options.output}/brain-prompt.md`,
        withHook: options.withHook,
      });
    } catch (error: any) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

program
  .command("enrich")
  .description("Generate enrichment instruction for processing all topic prompts")
  .option("-d, --dir <path>", "Project directory", process.cwd())
  .option("-o, --output <dir>", "Output directory", ".projectbrain")
  .option("-t, --topic <name>", "Generate instruction for a specific topic (or 'all')")
  .option("-i, --install <ide>", "Install instruction as IDE rule (cursor, claude, opencode, windsurf, zed)")
  .option("--stdout", "Print instruction to stdout")
  .action(async (options) => {
    try {
      await enrichTopics({
        dir: options.dir,
        outputDir: options.output,
        topic: options.topic,
        ide: options.install,
        stdout: options.stdout,
      });
    } catch (error: any) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

program
  .command("prompt")
  .description("Generate LLM prompt for business context or specific topic")
  .option("-d, --dir <path>", "Project directory", process.cwd())
  .option("-o, --output <dir>", "Output directory", ".projectbrain")
  .option("-t, --topic <name>", "Generate prompt for a specific topic")
  .option("-a, --adapter <name>", "Force specific adapter")
  .option("--stdout", "Print prompt to stdout instead of saving")
  .action(async (options) => {
    try {
      const dir = options.dir;
      const outputDir = options.output;
      const result = await findBestAdapter(dir);

      if (!result) {
        throw new Error("No suitable adapter found. Run 'brain scan' first.");
      }

      const { adapter } = result;
      const data = await adapter.extract(dir);

      if (options.topic) {
        const topics = await getTopics(dir, data);
        const staleNew = topics.filter(
          (t) => t.status === TopicStatus.New || t.status === TopicStatus.Stale,
        );

        let selected: typeof topics;
        if (options.topic.toLowerCase() === "all") {
          selected = staleNew;
          if (selected.length === 0) {
            console.log("All topics are up to date. No prompts to generate.");
            return;
          }
        } else {
          const topic = topics.find((t) => t.name === options.topic);
          if (!topic) {
            console.error(`Topic "${options.topic}" not found.`);
            console.error(`Available topics: ${topics.map((t) => t.name).join(", ")}`);
            process.exit(1);
          }
          selected = [topic];
        }

        const { writeFile, mkdir } = await import("node:fs/promises");
        const topicsDir = path.join(dir, outputDir, "brain-topics");
        await mkdir(topicsDir, { recursive: true });

        for (const topic of selected) {
          const prompt = await formatSingleTopicPromptMd(topic, dir, data);
          if (options.stdout) {
            console.log(prompt);
            console.log("\n---TOPIC-SEPARATOR---\n");
          } else {
            const promptPath = path.join(topicsDir, `${topic.name}-prompt.md`);
            await writeFile(promptPath, prompt, "utf8");
            console.log(`  ✓ ${topic.name} -> ${promptPath}`);
          }
        }

        if (!options.stdout) {
          console.log(`\n✓ ${selected.length} topic prompt(s) generated`);
          console.log("  Paste each prompt into your LLM chat to enrich the topics.");
        }
      } else {
        const prompt = await formatBrainPromptMd(data, dir);
        if (options.stdout) {
          console.log(prompt);
        } else {
          const promptPath = path.join(dir, outputDir, "brain-prompt.md");
          const { writeFile, mkdir } = await import("node:fs/promises");
          await mkdir(path.join(dir, outputDir), { recursive: true });
          await writeFile(promptPath, prompt, "utf8");
          console.log(`\n✓ Business context prompt generated`);
          console.log(`  Saved to: ${promptPath}`);
          console.log(`\n  Paste this prompt into your LLM chat to generate Business Context.`);
          console.log(`  The LLM will produce a section to add to ${path.join(dir, outputDir, "brain.md")}`);

          const topics = await getTopics(dir, data);
          const staleNew = topics.filter((t) => t.status === TopicStatus.New || t.status === TopicStatus.Stale);
          if (staleNew.length > 0) {
            console.log(`\n  Topics with pending prompts:`);
            for (const t of staleNew) {
              console.log(`    - ${t.name} (${t.files.length} files, ${t.routes.length} routes)`);
            }
            console.log(`\n  Generate topic prompts with:`);
            for (const t of staleNew) {
              console.log(`    brain prompt --topic ${t.name}`);
            }
          }
        }
      }
    } catch (error: any) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

program
  .command("skill")
  .description("Execute a skill against the project")
  .argument("[name]", "Skill name to execute")
  .option("-d, --dir <path>", "Project directory", process.cwd())
  .option("-t, --topic <name>", "Topic name for context")
  .option("--diff <string>", "Git diff content")
  .option("--query <string>", "Search query for route-debug")
  .option("--json", "Output as JSON")
  .action(async (name, options) => {
    try {
      const { runSkill, listSkills, createSkillContext } = await import("./skills/runner.js");
      await import("./skills/repo-map.js");
      await import("./skills/twig-inline-css.js");
      await import("./skills/symfony-review.js");
      await import("./skills/route-debug.js");
      await import("./skills/diff-only.js");
      await import("./skills/architecture.js");

      if (!name) {
        const skills = listSkills();
        if (skills.length === 0) {
          console.log("No skills registered.");
          return;
        }
        console.log("Available skills:");
        for (const s of skills) {
          console.log(`  ${s.name} — ${s.description} (input: ${s.inputType})`);
        }
        return;
      }

      const ctx = await createSkillContext({
        projectDir: options.dir,
        diff: options.diff,
        query: options.query,
      });

      const result = await runSkill(name, ctx);

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        if (result.content && result.outputFile) {
          const { writeFile, mkdir } = await import("node:fs/promises");
          const outputFullPath = path.join(options.dir, result.outputFile);
          await mkdir(path.dirname(outputFullPath), { recursive: true });
          await writeFile(outputFullPath, result.content, "utf8");
          console.log(`Written: ${result.outputFile}`);
        }
        console.log(`goal: ${result.goal}`);
        console.log(`topic: ${result.topic}`);
        console.log(`files:`);
        for (const f of result.files) console.log(`  - ${f}`);
        console.log(`actions:`);
        for (const a of result.actions) console.log(`  ${result.actions.indexOf(a) + 1}. ${a}`);
        console.log(`risks:`);
        for (const r of result.risks) console.log(`  ! ${r}`);
        console.log(`next: ${result.next}`);
      }
    } catch (error: any) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command("hook")
  .description("Install or manage pre-commit hook")
  .option("-d, --dir <path>", "Project directory", process.cwd())
  .option("--uninstall", "Remove the brain pre-commit hook")
  .action(async (options) => {
    try {
      const { installHook, uninstallHook } = await import("./hook.js");

      if (options.uninstall) {
        const removed = await uninstallHook(options.dir);
        if (removed) {
          console.log("✓ Brain pre-commit hook removed.");
        } else {
          console.log("No brain pre-commit hook found.");
        }
        return;
      }

      await installHook(options.dir);
      console.log("✓ Brain pre-commit hook installed.");
      console.log("  The hook will mark dirty topics on each commit.");
      console.log("  Remove with: brain hook --uninstall");
    } catch (error: any) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command("_hook-check", { hidden: true })
  .description("Internal: run freshness pre-check (called by pre-commit hook)")
  .option("-d, --dir <path>", "Project directory", process.cwd())
  .action(async (options: any) => {
    try {
      const { runPreCheck, formatPreCheckReport } = await import("./hook.js");
      const freshness = await runPreCheck(options.dir);
      const report = formatPreCheckReport(freshness);
      console.log(report);
    } catch (error: any) {
      console.error(`Brain check warning: ${error.message}`);
    }
  });

program.parse();

async function getTopics(dir: string, data: any) {
  const allFiles = await new Promise<string[]>((resolve) => {
    execFile("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: dir, maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
      if (err) { resolve([]); return; }
      resolve(stdout.split("\n").filter((f) => f.trim().length > 0));
    });
  });
  let topics = discoverTopics(data, allFiles);
  topics = mergeOverlappingTopics(topics);
  return topics;
}

async function formatBrainPromptMd(data: any, dir: string): Promise<string> {
  const { formatBrainPromptMd: fn } = await import("./output.js");
  return fn(data, dir);
}

async function formatSingleTopicPromptMd(topic: any, dir: string, data: any): Promise<string> {
  const { formatSingleTopicPromptMd: fn } = await import("./output.js");
  return fn(topic, dir, data);
}
