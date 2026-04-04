import type { BrainData } from "./types.js";
export declare function formatBrainMd(data: BrainData, dir: string, businessContext?: string): string;
export declare function formatBrainPromptMd(data: BrainData, dir: string): Promise<string>;
