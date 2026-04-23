import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import type { Topic, TopicIndex, FreshnessData } from "../src/types.js";
import {
  computeFreshness,
  updateFreshnessFromDiff,
  formatFreshnessYaml,
  parseFreshnessYaml,
  writeFreshness,
  readFreshness,
} from "../src/freshness.js";

function makeTopic(overrides: Partial<Topic> & { name: string }): Topic {
  return {
    keywords: [],
    files: [],
    routes: [],
    commands: [],
    status: "fresh",
    ...overrides,
  };
}

describe("computeFreshness", () => {
  it("fresh topics → all 'fresh'", () => {
    const topics = [
      makeTopic({ name: "Auth", status: "fresh" }),
      makeTopic({ name: "Billing", status: "fresh" }),
    ];
    const data = computeFreshness(topics);
    expect(data.entries["Auth"].status).toBe("fresh");
    expect(data.entries["Billing"].status).toBe("fresh");
    expect(data.brainMdStatus).toBe("fresh");
    expect(data.lastUpdated).toBeTruthy();
  });

  it("stale topics → 'stale'", () => {
    const topics = [makeTopic({ name: "Auth", status: "stale" })];
    const data = computeFreshness(topics);
    expect(data.entries["Auth"].status).toBe("stale");
  });

  it("new topics → 'dirty'", () => {
    const topics = [makeTopic({ name: "Auth", status: "new" })];
    const data = computeFreshness(topics);
    expect(data.entries["Auth"].status).toBe("dirty");
  });
});

describe("updateFreshnessFromDiff", () => {
  function makeTopicIndex(topics: Record<string, { keywords: string[]; paths: string[] }>): TopicIndex {
    const entries: TopicIndex['topics'] = {};
    for (const [name, cfg] of Object.entries(topics)) {
      entries[name] = { name, keywords: cfg.keywords, paths: cfg.paths, defaultSkill: "symfony-review" };
    }
    return { topics: entries };
  }

  it("staging src/Admin/file → admin topic marked dirty", () => {
    const topics = [makeTopic({ name: "Admin Panel", status: "fresh" })];
    const freshness = computeFreshness(topics);
    const index = makeTopicIndex({
      "Admin Panel": { keywords: ["admin"], paths: ["src/Admin/"] },
    });

    const updated = updateFreshnessFromDiff(["src/Admin/UserController.php"], freshness, index);
    expect(updated.entries["Admin Panel"].status).toBe("dirty");
    expect(updated.entries["Admin Panel"].changedFiles).toContain("src/Admin/UserController.php");
  });

  it("staging README.md → no topic marked dirty", () => {
    const topics = [makeTopic({ name: "Auth", status: "fresh" })];
    const freshness = computeFreshness(topics);
    const index = makeTopicIndex({
      Auth: { keywords: ["auth"], paths: ["src/Auth/"] },
    });

    const updated = updateFreshnessFromDiff(["README.md"], freshness, index);
    expect(updated.entries["Auth"].status).toBe("fresh");
    expect(updated.brainMdStatus).toBe("fresh");
  });

  it("staging brain.md → brainMdStatus = 'dirty'", () => {
    const topics = [makeTopic({ name: "Auth", status: "fresh" })];
    const freshness = computeFreshness(topics);
    const index = makeTopicIndex({});

    const updated = updateFreshnessFromDiff([".projectbrain/brain.md"], freshness, index);
    expect(updated.brainMdStatus).toBe("dirty");
  });
});

describe("round-trip YAML", () => {
  it("formatFreshnessYaml → parseFreshnessYaml", () => {
    const data: FreshnessData = {
      entries: {
        Auth: {
          topic: "Auth",
          status: "dirty",
          lastCheck: "2026-04-23T10:00:00.000Z",
          changedFiles: ["src/Auth/Login.php"],
        },
        Billing: {
          topic: "Billing",
          status: "fresh",
          lastCheck: "2026-04-23T10:00:00.000Z",
        },
      },
      brainMdStatus: "dirty",
      lastUpdated: "2026-04-23T10:00:00.000Z",
    };

    const yaml = formatFreshnessYaml(data);
    const parsed = parseFreshnessYaml(yaml);

    expect(parsed.entries["Auth"].status).toBe("dirty");
    expect(parsed.entries["Auth"].changedFiles).toEqual(["src/Auth/Login.php"]);
    expect(parsed.entries["Billing"].status).toBe("fresh");
    expect(parsed.brainMdStatus).toBe("dirty");
    expect(parsed.lastUpdated).toBe("2026-04-23T10:00:00.000Z");
  });
});

describe("readFreshness", () => {
  const tmpDir = path.join("/tmp", `brain-freshness-test-${Date.now()}`);

  beforeEach(async () => {
    await mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("non-existent file → null", async () => {
    const result = await readFreshness("/tmp/nonexistent-dir-" + Date.now());
    expect(result).toBeNull();
  });

  it("writes and reads back correctly", async () => {
    const data: FreshnessData = {
      entries: {
        Auth: { topic: "Auth", status: "fresh", lastCheck: "2026-04-23T10:00:00.000Z" },
      },
      brainMdStatus: "fresh",
      lastUpdated: "2026-04-23T10:00:00.000Z",
    };
    const filePath = await writeFreshness(tmpDir, data);
    expect(filePath).toContain("freshness.yaml");

    const read = await readFreshness(tmpDir);
    expect(read).not.toBeNull();
    expect(read!.entries["Auth"].status).toBe("fresh");
  });
});
