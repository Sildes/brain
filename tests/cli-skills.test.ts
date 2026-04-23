import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import os from "node:os";
import { mkdir, rm } from "node:fs/promises";

const execFile = promisify(execFileCb);
const tsx = path.resolve("node_modules/.bin/tsx");
const cli = path.resolve("src/cli.ts");

describe("brain skill command", () => {
  it("lists available skills when no args", async () => {
    const { stdout } = await execFile(tsx, [cli, "skill"], {
      timeout: 15000,
    });
    expect(stdout).toContain("Available skills:");
    expect(stdout).toContain("repo-map");
  });

  it("shows error for nonexistent skill", async () => {
    try {
      await execFile(tsx, [cli, "skill", "nonexistent-skill-xyz"], {
        timeout: 15000,
      });
      expect.unreachable("Should have exited with error");
    } catch (err: any) {
      expect(err.stderr || err.stdout || String(err)).toMatch(
        /Skill 'nonexistent-skill-xyz' not found/
      );
    }
  });
});

describe("brain hook command", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join(
      os.tmpdir(),
      `brain-cli-hook-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    await mkdir(path.join(tmpDir, ".git", "hooks"), { recursive: true });
  });

  afterEach(async () => {
  });

  it("installs pre-commit hook", async () => {
    const { stdout } = await execFile(tsx, [cli, "hook", "--dir", tmpDir], {
      timeout: 15000,
    });
    expect(stdout).toContain("Brain pre-commit hook installed");
  });

  it("uninstalls pre-commit hook", async () => {
    await execFile(tsx, [cli, "hook", "--dir", tmpDir], { timeout: 15000 });
    const { stdout } = await execFile(
      tsx,
      [cli, "hook", "--dir", tmpDir, "--uninstall"],
      { timeout: 15000 }
    );
    expect(stdout).toContain("Brain pre-commit hook removed");
  });

  it("reports no hook found when uninstalling with none installed", async () => {
    const { stdout } = await execFile(
      tsx,
      [cli, "hook", "--dir", tmpDir, "--uninstall"],
      { timeout: 15000 }
    );
    expect(stdout).toContain("No brain pre-commit hook found");
  });
});

describe("brain _hook-check command", () => {
  it("runs without error", async () => {
    const tmpDir = path.join(
      os.tmpdir(),
      `brain-hook-check-test-${Date.now()}`
    );
    await mkdir(tmpDir, { recursive: true });
    const { stdout } = await execFile(
      tsx,
      [cli, "_hook-check", "--dir", tmpDir],
      { timeout: 15000 }
    );
    expect(stdout).toContain("Brain freshness check");
  });
});
