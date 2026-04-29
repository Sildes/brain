import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { TopicMetadata } from "../src/types.js";
import { saveMeta, loadMeta } from "../src/stale.js";

describe("saveMeta and loadMeta roundtrip", () => {
  const tmpDir = path.join("/tmp", `brain-stale-test-${Date.now()}`);

  beforeEach(async () => {
    await mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("preserves quality through saveMeta → loadMeta", async () => {
    const meta: TopicMetadata = {
      topics: {
        auth: {
          draft_generated: "2026-04-29T10:00:00.000Z",
          enriched_at: "2026-04-29T11:00:00.000Z",
          enriched_files: ["src/Auth.ts", "src/AuthService.ts"],
          file_hashes: {
            "src/Auth.ts": "abc123",
            "src/AuthService.ts": "def456",
          },
          status: "up_to_date",
          quality: {
            lines: 150,
            flows: 5,
            gotchas: 3,
            routes: 4,
            commands: 2,
            fileCoverage: 0.8,
            score: 0.9,
          },
        },
      },
    };

    await saveMeta(tmpDir, meta);
    const loaded = await loadMeta(tmpDir);

    expect(loaded).not.toBeNull();
    expect(loaded!.topics.auth).toBeDefined();
    expect(loaded!.topics.auth.quality).toBeDefined();
    expect(loaded!.topics.auth.quality?.lines).toBe(150);
    expect(loaded!.topics.auth.quality?.flows).toBe(5);
    expect(loaded!.topics.auth.quality?.gotchas).toBe(3);
    expect(loaded!.topics.auth.quality?.routes).toBe(4);
    expect(loaded!.topics.auth.quality?.commands).toBe(2);
    expect(loaded!.topics.auth.quality?.fileCoverage).toBe(0.8);
    expect(loaded!.topics.auth.quality?.score).toBe(0.9);
  });

  it("handles missing quality field (backward compat)", async () => {
    const meta: TopicMetadata = {
      topics: {
        auth: {
          draft_generated: "2026-04-29T10:00:00.000Z",
          enriched_at: "2026-04-29T11:00:00.000Z",
          enriched_files: ["src/Auth.ts"],
          file_hashes: {},
          status: "up_to_date",
        },
      },
    };

    await saveMeta(tmpDir, meta);
    const loaded = await loadMeta(tmpDir);

    expect(loaded).not.toBeNull();
    expect(loaded!.topics.auth).toBeDefined();
    expect(loaded!.topics.auth.quality).toBeUndefined();
  });

  it("handles partial quality with defaults to 0", async () => {
    const metaPath = path.join(tmpDir, ".meta.yaml");
    const yaml = `topics:
  auth:
    draft_generated: 2026-04-29T10:00:00.000Z
    enriched_at: 2026-04-29T11:00:00.000Z
    enriched_files: []
    file_hashes: {}
    status: up_to_date
    quality:
      lines: 75
      flows: 3
`;

    await writeFile(metaPath, yaml, "utf8");
    const loaded = await loadMeta(tmpDir);

    expect(loaded).not.toBeNull();
    expect(loaded!.topics.auth).toBeDefined();
    expect(loaded!.topics.auth.quality).toBeDefined();
    expect(loaded!.topics.auth.quality?.lines).toBe(75);
    expect(loaded!.topics.auth.quality?.flows).toBe(3);
    expect(loaded!.topics.auth.quality?.gotchas).toBe(0);
    expect(loaded!.topics.auth.quality?.routes).toBe(0);
    expect(loaded!.topics.auth.quality?.commands).toBe(0);
    expect(loaded!.topics.auth.quality?.fileCoverage).toBe(0);
    expect(loaded!.topics.auth.quality?.score).toBe(0);
  });

  it("handles quality with float values", async () => {
    const meta: TopicMetadata = {
      topics: {
        auth: {
          draft_generated: "2026-04-29T10:00:00.000Z",
          enriched_at: "2026-04-29T11:00:00.000Z",
          enriched_files: [],
          file_hashes: {},
          status: "up_to_date",
          quality: {
            lines: 100,
            flows: 2,
            gotchas: 1,
            routes: 0,
            commands: 0,
            fileCoverage: 0.6666666667,
            score: 0.8333333333,
          },
        },
      },
    };

    await saveMeta(tmpDir, meta);
    const loaded = await loadMeta(tmpDir);

    expect(loaded).not.toBeNull();
    expect(loaded!.topics.auth.quality).toBeDefined();
    expect(loaded!.topics.auth.quality?.fileCoverage).toBeCloseTo(0.6666666667, 5);
    expect(loaded!.topics.auth.quality?.score).toBeCloseTo(0.8333333333, 5);
  });

  it("handles multiple topics with mixed quality presence", async () => {
    const meta: TopicMetadata = {
      topics: {
        auth: {
          draft_generated: "2026-04-29T10:00:00.000Z",
          enriched_at: "2026-04-29T11:00:00.000Z",
          enriched_files: [],
          file_hashes: {},
          status: "up_to_date",
          quality: {
            lines: 100,
            flows: 5,
            gotchas: 2,
            routes: 3,
            commands: 2,
            fileCoverage: 0.75,
            score: 0.8,
          },
        },
        billing: {
          draft_generated: "2026-04-29T10:00:00.000Z",
          enriched_at: "2026-04-29T11:00:00.000Z",
          enriched_files: [],
          file_hashes: {},
          status: "new",
        },
      },
    };

    await saveMeta(tmpDir, meta);
    const loaded = await loadMeta(tmpDir);

    expect(loaded).not.toBeNull();
    expect(loaded!.topics.auth.quality).toBeDefined();
    expect(loaded!.topics.auth.quality?.lines).toBe(100);
    expect(loaded!.topics.billing.quality).toBeUndefined();
  });
});
