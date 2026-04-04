import { readFile, writeFile } from "node:fs/promises";
import { stat } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import type { Topic, TopicMetadata, TopicMeta } from "./types.js";
import { TopicStatus, TopicStaleReason } from "./types.js";

export function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

export async function hashFile(filePath: string): Promise<string> {
  const { readFile: rf } = await import("node:fs/promises");
  const content = await rf(filePath, "utf8");
  return hashContent(content);
}

async function getMtime(filePath: string): Promise<Date> {
  const s = await stat(filePath);
  return s.mtime;
}

function parseSimpleYaml(content: string): Record<string, any> {
  const result: Record<string, any> = {};
  const lines = content.split("\n");
  let currentTopic = "";
  let currentField = "";
  let inTopics = false;

  for (const rawLine of lines) {
    const line = rawLine;

    if (line.startsWith("topics:")) {
      inTopics = true;
      continue;
    }

    if (!inTopics) continue;
    if (!line.startsWith("  ")) continue;

    const indent2 = line.substring(2);
    if (!indent2.startsWith(" ") && indent2.includes(":")) {
      currentTopic = indent2.split(":")[0].trim();
      result[currentTopic] = {};
      currentField = "";
      continue;
    }

    if (!currentTopic) continue;

    const indent4 = line.startsWith("    ") ? line.substring(4) : null;
    if (indent4 && indent4.includes(":") && !indent4.startsWith(" ")) {
      const [key, ...rest] = indent4.split(":");
      const val = rest.join(":").trim();
      currentField = key.trim();

      if (val === "null" || val === "") {
        (result[currentTopic] as any)[currentField] = null;
      } else if (val === "true") {
        (result[currentTopic] as any)[currentField] = true;
      } else if (val === "false") {
        (result[currentTopic] as any)[currentField] = false;
      } else if (/^\d+$/.test(val)) {
        (result[currentTopic] as any)[currentField] = parseInt(val, 10);
      } else {
        (result[currentTopic] as any)[currentField] = val;
      }
    }

    if (line.trim().startsWith("- ") && currentField) {
      const val = line.trim().substring(2).trim();
      if (!(result[currentTopic] as any)[currentField]) {
        (result[currentTopic] as any)[currentField] = [];
      }
      ((result[currentTopic] as any)[currentField] as string[]).push(val);
    }
  }

  return result;
}

function serializeYamlValue(value: any, indent: number): string {
  const pad = " ".repeat(indent);
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value.map((v) => `${pad}- ${v}`).join("\n");
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, any>);
    return entries
      .map(([k, v]) => {
        if (Array.isArray(v)) {
          return `${pad}${k}:\n${serializeYamlValue(v, indent + 2)}`;
        }
        return `${pad}${k}: ${serializeYamlValue(v, indent + 2)}`;
      })
      .join("\n");
  }
  return String(value);
}

function serializeMetaYaml(meta: TopicMetadata): string {
  const lines: string[] = ["topics:"];
  for (const [name, topicMeta] of Object.entries(meta.topics)) {
    lines.push(`  ${name}:`);
    lines.push(`    draft_generated: ${topicMeta.draft_generated}`);
    lines.push(`    enriched_at: ${topicMeta.enriched_at || "null"}`);
    if (topicMeta.enriched_files.length > 0) {
      lines.push(`    enriched_files:`);
      for (const f of topicMeta.enriched_files) {
        lines.push(`      - ${f}`);
      }
    } else {
      lines.push(`    enriched_files: []`);
    }
    if (Object.keys(topicMeta.file_hashes).length > 0) {
      lines.push(`    file_hashes:`);
      for (const [file, hash] of Object.entries(topicMeta.file_hashes)) {
        lines.push(`      ${file}: ${hash}`);
      }
    } else {
      lines.push(`    file_hashes: {}`);
    }
    lines.push(`    status: ${topicMeta.status}`);
    if (topicMeta.status_reason) {
      lines.push(`    status_reason: ${topicMeta.status_reason}`);
    }
    if (topicMeta.status_details) {
      lines.push(`    status_details:`);
      if (topicMeta.status_details.added && topicMeta.status_details.added.length > 0) {
        lines.push(`      added:`);
        for (const f of topicMeta.status_details.added) {
          lines.push(`        - ${f}`);
        }
      }
      if (topicMeta.status_details.removed && topicMeta.status_details.removed.length > 0) {
        lines.push(`      removed:`);
        for (const f of topicMeta.status_details.removed) {
          lines.push(`        - ${f}`);
        }
      }
      if (topicMeta.status_details.modified && topicMeta.status_details.modified.length > 0) {
        lines.push(`      modified:`);
        for (const f of topicMeta.status_details.modified) {
          lines.push(`        - ${f}`);
        }
      }
    }
  }
  return lines.join("\n") + "\n";
}

export async function loadMeta(topicsDir: string): Promise<TopicMetadata | null> {
  const metaPath = path.join(topicsDir, ".meta.yaml");
  try {
    const content = await readFile(metaPath, "utf8");
    const parsed = parseSimpleYaml(content);
    const topics: Record<string, TopicMeta> = {};
    for (const [name, raw] of Object.entries(parsed)) {
      const r = raw as any;
      topics[name] = {
        draft_generated: r.draft_generated || new Date().toISOString(),
        enriched_at: r.enriched_at || null,
        enriched_files: Array.isArray(r.enriched_files) ? r.enriched_files : [],
        file_hashes: r.file_hashes && typeof r.file_hashes === "object" && !Array.isArray(r.file_hashes) ? r.file_hashes : {},
        status: r.status || TopicStatus.New,
        status_reason: r.status_reason,
        status_details: r.status_details,
      };
    }
    return { topics };
  } catch {
    return null;
  }
}

export async function saveMeta(topicsDir: string, meta: TopicMetadata): Promise<void> {
  const metaPath = path.join(topicsDir, ".meta.yaml");
  const content = serializeMetaYaml(meta);
  await writeFile(metaPath, content, "utf8");
}

export async function detectStaleTopics(
  topics: Topic[],
  meta: TopicMetadata | null,
  projectDir: string,
): Promise<Topic[]> {
  if (!meta) {
    return topics.map((t) => ({ ...t, status: TopicStatus.New }));
  }

  const enrichedNames = new Set(Object.keys(meta.topics));

  for (const topic of topics) {
    const enrichedMeta = meta.topics[topic.name];

    if (!enrichedMeta || !enrichedMeta.enriched_at) {
      topic.status = TopicStatus.New;
      continue;
    }

    if (topic.files.length === 0 && enrichedMeta.enriched_files.length > 0) {
      topic.status = TopicStatus.Orphaned;
      continue;
    }

    const draftFiles = new Set(topic.files);
    const enrichedFiles = new Set(enrichedMeta.enriched_files);

    const added = [...draftFiles].filter((f) => !enrichedFiles.has(f));
    const removed = [...enrichedFiles].filter((f) => !draftFiles.has(f));

    if (added.length > 0 || removed.length > 0) {
      topic.status = TopicStatus.Stale;
      topic.staleReason = TopicStaleReason.FilesChanged;
      topic.staleDetails = { added, removed };
      continue;
    }

    const enrichedAt = new Date(enrichedMeta.enriched_at).getTime();
    const modified: string[] = [];

    for (const file of topic.files) {
      const storedHash = enrichedMeta.file_hashes[file];
      if (!storedHash) continue;

      const fullPath = path.join(projectDir, file);
      try {
        const mtime = await getMtime(fullPath);
        if (mtime.getTime() <= enrichedAt) continue;

        const currentHash = await hashFile(fullPath);
        if (currentHash !== storedHash) {
          modified.push(file);
        }
      } catch {
        continue;
      }
    }

    if (modified.length > 0) {
      topic.status = TopicStatus.Stale;
      topic.staleReason = TopicStaleReason.ContentChanged;
      topic.staleDetails = { modified };
    } else {
      topic.status = TopicStatus.UpToDate;
    }
  }

  return topics;
}
