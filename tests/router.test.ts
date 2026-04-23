import { describe, it, expect } from "vitest";
import type { TopicIndex } from "../src/types.js";
import { routeTask } from "../src/router.js";

const emptyIndex: TopicIndex = { topics: {} };

function makeIndex(entries: Record<string, { keywords?: string[]; paths?: string[]; defaultSkill?: string }>): TopicIndex {
  const topics: TopicIndex["topics"] = {};
  for (const [name, e] of Object.entries(entries)) {
    topics[name] = {
      name,
      keywords: e.keywords ?? [],
      paths: e.paths ?? [],
      defaultSkill: e.defaultSkill ?? "repo-map",
    };
  }
  return { topics };
}

describe("routeTask", () => {
  describe("built-in symfony keyword matching", () => {
    it("matches admin sonata user to admin topic with symfony-review", () => {
      const result = routeTask("admin sonata user", emptyIndex, "symfony");
      expect(result).not.toBeNull();
      expect(result!.topic).toBe("admin");
      expect(result!.skill).toBe("symfony-review");
      expect(result!.score).toBeGreaterThanOrEqual(0.7);
    });

    it("matches twig inline css template to asset topic", () => {
      const result = routeTask("twig inline css template", emptyIndex, "symfony");
      expect(result).not.toBeNull();
      expect(result!.topic).toBe("asset");
      expect(result!.skill).toBe("twig-inline-css");
    });

    it("matches route 404 controller to routing topic with route-debug", () => {
      const result = routeTask("route 404 controller", emptyIndex, "symfony");
      expect(result).not.toBeNull();
      expect(result!.skill).toBe("route-debug");
    });

    it("matches activity audit logger subscriber to activity topic", () => {
      const result = routeTask("activity audit logger", emptyIndex, "symfony");
      expect(result).not.toBeNull();
      expect(result!.topic).toBe("activity");
      expect(result!.skill).toBe("symfony-review");
    });
  });

  describe("diff boost", () => {
    it("overrides skill to diff-only when git/diff mentioned", () => {
      const result = routeTask("check this git diff for admin", emptyIndex, "symfony");
      expect(result).not.toBeNull();
      expect(result!.skill).toBe("diff-only");
      expect(result!.topic).toBe("admin");
    });

    it("sets diff-only for diff keyword", () => {
      const result = routeTask("review the diff of user module", emptyIndex, "symfony");
      expect(result).not.toBeNull();
      expect(result!.skill).toBe("diff-only");
    });
  });

  describe("threshold rejection", () => {
    it("returns null for vague input below threshold", () => {
      const result = routeTask("the", emptyIndex, "symfony");
      expect(result).toBeNull();
    });

    it("returns null for completely unknown framework keywords", () => {
      const result = routeTask("xyzzy foobar quux", emptyIndex, "generic");
      expect(result).toBeNull();
    });
  });

  describe("topic index matching", () => {
    it("matches topic index keywords over built-in when score is higher", () => {
      const index = makeIndex({
        payment: { keywords: ["stripe", "invoice", "billing"], paths: [], defaultSkill: "payment-review" },
      });
      const result = routeTask("stripe invoice billing payment", index, "symfony");
      expect(result).not.toBeNull();
      expect(result!.topic).toBe("payment");
      expect(result!.skill).toBe("payment-review");
    });

    it("matches topic index with path-based matching", () => {
      const index = makeIndex({
        admin: { keywords: ["admin"], paths: ["src/Admin/Dashboard.php", "src/Admin/UserAdmin.php"], defaultSkill: "admin-skill" },
      });
      const result = routeTask("src/Admin/Dashboard.php", index, "symfony");
      expect(result).not.toBeNull();
      expect(result!.topic).toBe("admin");
    });

    it("prefers topic index hit when built-in has no match", () => {
      const index = makeIndex({
        notifications: { keywords: ["email", "push", "notification"], paths: [], defaultSkill: "notif-skill" },
      });
      const result = routeTask("send email notification push", index, "symfony");
      expect(result).not.toBeNull();
      expect(result!.topic).toBe("notifications");
      expect(result!.skill).toBe("notif-skill");
    });
  });

  describe("empty topicIndex fallback", () => {
    it("falls back to built-in keywords with empty topicIndex", () => {
      const result = routeTask("sonata admin crud", emptyIndex, "symfony");
      expect(result).not.toBeNull();
      expect(result!.topic).toBe("admin");
      expect(result!.skill).toBe("symfony-review");
    });
  });

  describe("framework variants", () => {
    it("matches laravel controller to routing", () => {
      const result = routeTask("controller route", emptyIndex, "laravel");
      expect(result).not.toBeNull();
      expect(result!.topic).toBe("routing");
    });

    it("matches laravel migration to database", () => {
      const result = routeTask("database migration schema", emptyIndex, "laravel");
      expect(result).not.toBeNull();
      expect(result!.topic).toBe("database");
    });

    it("matches nextjs page component", () => {
      const result = routeTask("page component layout", emptyIndex, "nextjs");
      expect(result).not.toBeNull();
      expect(result!.topic).toBe("pages");
    });

    it("returns null for unknown framework with generic map", () => {
      const result = routeTask("admin sonata user", emptyIndex, "unknown-framework");
      expect(result).toBeNull();
    });
  });

  describe("path matching via input", () => {
    it("extracts keywords from file paths like src/Admin/Dashboard.php", () => {
      const index = makeIndex({
        admin: { keywords: ["admin", "dashboard"], paths: ["src/Admin/Dashboard.php"], defaultSkill: "admin-skill" },
      });
      const result = routeTask("src/Admin/Dashboard.php", index, "symfony");
      expect(result).not.toBeNull();
      expect(result!.topic).toBe("admin");
    });
  });

  describe("deduplication and best-score selection", () => {
    it("picks highest scoring topic when multiple match", () => {
      const index = makeIndex({
        user: { keywords: ["user", "profile"], paths: [], defaultSkill: "user-skill" },
        admin: { keywords: ["admin"], paths: [], defaultSkill: "admin-skill" },
      });
      // "admin" is a built-in symfony keyword (score 0.9) AND appears in topic index
      // "user" appears only in topic index
      // With input "admin user profile", admin gets 0.9 built-in, user gets 0.4*2=0.8 topic
      const result = routeTask("admin user profile", index, "symfony");
      expect(result).not.toBeNull();
      // admin has higher score from built-in
      expect(result!.topic).toBe("admin");
    });
  });
});
