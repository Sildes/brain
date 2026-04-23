import type { BrainData, Topic } from "../types.js";

export interface SkillContext {
  projectDir: string;
  topic?: Topic;
  diff?: string;
  query?: string;
  framework: string;
  brainData: BrainData;
}

export interface SkillDefinition {
  name: string;
  description: string;
  config: import("../types.js").SkillConfig;
  execute(ctx: SkillContext): Promise<import("../types.js").SkillResult>;
}
