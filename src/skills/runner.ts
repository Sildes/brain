import type { SkillDefinition, SkillContext } from "./types.js";
import type { SkillConfig, SkillResult } from "../types.js";
import { findBestAdapter } from "../detect.js";

const skills: Map<string, SkillDefinition> = new Map();

export function registerSkill(skill: SkillDefinition): void {
  skills.set(skill.name, skill);
}

export function getSkill(name: string): SkillDefinition | undefined {
  return skills.get(name);
}

export function listSkills(): SkillConfig[] {
  return [...skills.values()].map(s => s.config);
}

export function clearSkills(): void {
  skills.clear();
}

export async function runSkill(name: string, ctx: SkillContext): Promise<SkillResult> {
  const skill = skills.get(name);
  if (!skill) {
    const available = listSkills().map(s => s.name).join(', ');
    throw new Error(`Skill '${name}' not found. Available: ${available || 'none'}`);
  }
  return skill.execute(ctx);
}

export async function createSkillContext(options: {
  projectDir: string;
  topic?: import("../types.js").Topic;
  diff?: string;
  query?: string;
}): Promise<SkillContext> {
  const { projectDir, topic, diff, query } = options;

  const result = await findBestAdapter(projectDir);
  const framework = result?.match?.framework || 'generic';

  const brainData = {
    framework,
    modules: [],
    routes: [],
    commands: [],
    conventions: { standards: [], notes: [], navigation: [] },
    keyFiles: [],
    quickFind: [],
    fileCount: 0,
  };

  return {
    projectDir,
    framework,
    brainData,
    topic,
    diff,
    query,
  };
}
