import type { Topic, TopicIndex, TopicIndexEntry } from "./types.js";
import { writeFile, readFile, mkdir } from "node:fs/promises";
import path from "node:path";

// Framework-specific default skill mapping
const FRAMEWORK_SKILL_MAP: Record<string, Record<string, string>> = {
  symfony: { admin: "symfony-review", twig: "twig-inline-css", css: "twig-inline-css", route: "route-debug", security: "route-debug" },
  laravel: { controller: "symfony-review", route: "route-debug" },
  nextjs: { page: "repo-map", api: "repo-map" },
  generic: {},
};

export function generateTopicIndex(topics: Topic[], framework: string): TopicIndex {
  const topicEntries: Record<string, TopicIndexEntry> = {};
  const skillMap = FRAMEWORK_SKILL_MAP[framework] || FRAMEWORK_SKILL_MAP.generic;

  for (const topic of topics) {
    let defaultSkill = "repo-map"; // fallback
    for (const keyword of topic.keywords) {
      if (skillMap[keyword]) {
        defaultSkill = skillMap[keyword];
        break;
      }
    }

    const paths = [...new Set(topic.files.map((f) => {
      const parts = f.split("/");
      return parts.length > 1 ? parts.slice(0, -1).join("/") : f;
    }))];

    topicEntries[topic.name] = {
      name: topic.name,
      keywords: topic.keywords,
      paths,
      defaultSkill,
    };
  }

  return { topics: topicEntries };
}

export function formatTopicIndexYaml(index: TopicIndex): string {
  const lines: string[] = ["topics:"];
  for (const [name, entry] of Object.entries(index.topics)) {
    lines.push(`  ${name}:`);
    lines.push(`    keywords:`);
    for (const kw of entry.keywords) {
      lines.push(`      - ${kw}`);
    }
    lines.push(`    paths:`);
    for (const p of entry.paths) {
      lines.push(`      - ${p}`);
    }
    lines.push(`    default_skill: ${entry.defaultSkill}`);
  }
  return lines.join("\n") + "\n";
}

export function parseTopicIndexYaml(content: string): TopicIndex {
  const result: Record<string, TopicIndexEntry> = {};
  const lines = content.split("\n");
  let currentTopic = "";
  let currentField = "";

  for (const line of lines) {
    if (line.startsWith("topics:")) continue;
    if (!line.startsWith("  ")) continue;

    const indent2 = line.substring(2);
    if (!indent2.startsWith(" ") && indent2.includes(":")) {
      currentTopic = indent2.split(":")[0].trim();
      result[currentTopic] = { name: currentTopic, keywords: [], paths: [], defaultSkill: "repo-map" };
      currentField = "";
      continue;
    }

    if (!currentTopic) continue;

    const indent4 = line.startsWith("    ") ? line.substring(4) : null;
    if (indent4 && indent4.includes(":") && !indent4.startsWith(" ")) {
      const [key, ...rest] = indent4.split(":");
      const val = rest.join(":").trim();
      currentField = key.trim();
      if (currentField === "default_skill") {
        result[currentTopic].defaultSkill = val;
      }
      continue;
    }

    if (line.trim().startsWith("- ") && currentField) {
      const val = line.trim().substring(2).trim();
      if (currentField === "keywords") result[currentTopic].keywords.push(val);
      if (currentField === "paths") result[currentTopic].paths.push(val);
    }
  }

  return { topics: result };
}

export async function writeTopicIndex(outputDir: string, index: TopicIndex): Promise<string> {
  await mkdir(outputDir, { recursive: true });
  const filePath = path.join(outputDir, "topic-index.yaml");
  await writeFile(filePath, formatTopicIndexYaml(index), "utf8");
  return filePath;
}

export async function readTopicIndex(outputDir: string): Promise<TopicIndex | null> {
  try {
    const filePath = path.join(outputDir, "topic-index.yaml");
    const content = await readFile(filePath, "utf8");
    return parseTopicIndexYaml(content);
  } catch {
    return null;
  }
}
