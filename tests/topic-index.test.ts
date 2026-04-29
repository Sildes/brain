import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import type { Topic } from "../src/types.js";
import {
  generateTopicIndex,
  formatTopicIndexYaml,
  parseTopicIndexYaml,
  writeTopicIndex,
  readTopicIndex,
} from "../src/topic-index.js";

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

describe("generateTopicIndex", () => {
  it("maps symfony admin keyword to symfony-review skill", () => {
    const topics = [makeTopic({ name: "Admin Panel", keywords: ["admin", "crud"], files: ["src/Admin/Controller.php"] })];
    const index = generateTopicIndex(topics, "symfony");
    expect(index.topics["Admin Panel"].defaultSkill).toBe("symfony-review");
  });

  it("maps symfony twig/css keywords to twig-inline-css", () => {
    const topics = [makeTopic({ name: "Templates", keywords: ["twig", "css"], files: ["templates/base.html.twig"] })];
    const index = generateTopicIndex(topics, "symfony");
    expect(index.topics["Templates"].defaultSkill).toBe("twig-inline-css");
  });

  it("falls back to repo-map for unknown keywords", () => {
    const topics = [makeTopic({ name: "Utils", keywords: ["helper", "util"], files: ["src/Utils/helper.php"] })];
    const index = generateTopicIndex(topics, "symfony");
    expect(index.topics["Utils"].defaultSkill).toBe("repo-map");
  });

  it("uses repo-map for generic framework", () => {
    const topics = [makeTopic({ name: "Core", keywords: ["core"], files: ["src/core.ts"] })];
    const index = generateTopicIndex(topics, "generic");
    expect(index.topics["Core"].defaultSkill).toBe("repo-map");
  });

  it("extracts unique parent paths from files", () => {
    const topics = [makeTopic({
      name: "Auth",
      keywords: ["security"],
      files: ["src/Auth/Controller.php", "src/Auth/Service.php", "src/Auth/Controller.php"],
    })];
    const index = generateTopicIndex(topics, "symfony");
    expect(index.topics["Auth"].paths).toEqual(["src/Auth"]);
  });

  it("uses file itself as path when no directory", () => {
    const topics = [makeTopic({ name: "Root", keywords: ["root"], files: ["config.yaml"] })];
    const index = generateTopicIndex(topics, "symfony");
    expect(index.topics["Root"].paths).toEqual(["config.yaml"]);
  });

  it("preserves keywords", () => {
    const topics = [makeTopic({ name: "A", keywords: ["x", "y", "z"], files: ["f.ts"] })];
    const index = generateTopicIndex(topics, "generic");
    expect(index.topics["A"].keywords).toEqual(["x", "y", "z"]);
  });
});

describe("round-trip YAML", () => {
  it("formatTopicIndexYaml → parseTopicIndexYaml preserves data", () => {
    const topics = [
      makeTopic({ name: "Admin", keywords: ["admin"], files: ["src/Admin/Panel.php", "src/Admin/Form.php"] }),
      makeTopic({ name: "API", keywords: ["api", "rest"], files: ["src/Api/Controller.php"] }),
    ];
    const index = generateTopicIndex(topics, "symfony");
    const yaml = formatTopicIndexYaml(index);
    const parsed = parseTopicIndexYaml(yaml);

    expect(Object.keys(parsed.topics)).toEqual(["Admin", "API"]);
    expect(parsed.topics["Admin"].keywords).toEqual(["admin"]);
    expect(parsed.topics["Admin"].paths).toEqual(["src/Admin"]);
    expect(parsed.topics["Admin"].defaultSkill).toBe("symfony-review");
    expect(parsed.topics["Admin"].dependsOn).toEqual([]);
    expect(parsed.topics["Admin"].relatedTo).toEqual([]);
    expect(parsed.topics["API"].keywords).toEqual(["api", "rest"]);
    expect(parsed.topics["API"].paths).toEqual(["src/Api"]);
  });

  it("round-trip preserves depends_on and related_to", () => {
    const topics = [
      makeTopic({ name: "Auth", keywords: ["auth"], files: ["src/Auth.ts"] }),
      makeTopic({ name: "API", keywords: ["api"], files: ["src/Api.ts"] }),
    ];
    const index = generateTopicIndex(topics, "generic");
    index.topics["Auth"].dependsOn = ["API"];
    index.topics["Auth"].relatedTo = ["API"];
    index.topics["API"].relatedTo = ["Auth"];

    const yaml = formatTopicIndexYaml(index);
    const parsed = parseTopicIndexYaml(yaml);

    expect(parsed.topics["Auth"].dependsOn).toEqual(["API"]);
    expect(parsed.topics["Auth"].relatedTo).toEqual(["API"]);
    expect(parsed.topics["API"].relatedTo).toEqual(["Auth"]);
    expect(parsed.topics["API"].dependsOn).toEqual([]);
  });

  it("omits depends_on and related_to when empty in YAML output", () => {
    const topics = [makeTopic({ name: "Solo", keywords: ["solo"], files: ["src/solo.ts"] })];
    const index = generateTopicIndex(topics, "generic");
    const yaml = formatTopicIndexYaml(index);
    expect(yaml).not.toContain("depends_on");
    expect(yaml).not.toContain("related_to");
  });

  it("parses YAML without depends_on/related_to (backward compat)", () => {
    const yaml = `topics:
  auth:
    keywords:
      - auth
    paths:
      - src/Auth.ts
    default_skill: repo-map
`;
    const parsed = parseTopicIndexYaml(yaml);
    expect(parsed.topics["auth"].dependsOn).toEqual([]);
    expect(parsed.topics["auth"].relatedTo).toEqual([]);
  });

  it("parses depends_on/related_to with [] inline syntax", () => {
    const yaml = `topics:
  auth:
    keywords:
      - auth
    paths:
      - src
    default_skill: repo-map
    depends_on: []
    related_to: []
`;
    const parsed = parseTopicIndexYaml(yaml);
    expect(parsed.topics["auth"].dependsOn).toEqual([]);
    expect(parsed.topics["auth"].relatedTo).toEqual([]);
  });
});

describe("readTopicIndex / writeTopicIndex", () => {
  const tmpDir = path.join(process.cwd(), ".tmp-test-topic-index");

  beforeEach(async () => {
    await mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("readTopicIndex returns null for non-existent file", async () => {
    const result = await readTopicIndex(tmpDir);
    expect(result).toBeNull();
  });

  it("writeTopicIndex creates file and readTopicIndex reads it back", async () => {
    const topics = [makeTopic({ name: "Test", keywords: ["test"], files: ["src/test.ts"] })];
    const index = generateTopicIndex(topics, "generic");
    const filePath = await writeTopicIndex(tmpDir, index);
    expect(filePath).toContain("topic-index.yaml");

    const readBack = await readTopicIndex(tmpDir);
    expect(readBack).not.toBeNull();
    expect(readBack!.topics["Test"].keywords).toEqual(["test"]);
    expect(readBack!.topics["Test"].paths).toEqual(["src"]);
    expect(readBack!.topics["Test"].defaultSkill).toBe("repo-map");
  });
});
