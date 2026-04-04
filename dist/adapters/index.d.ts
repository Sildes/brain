import type { Adapter, AdapterMatch } from "../types.js";
export declare function registerAdapter(adapter: Adapter): void;
export declare function getAdapters(): Adapter[];
export declare function detectFramework(dir: string): Promise<{
    adapter: Adapter;
    match: AdapterMatch;
} | null>;
export declare function clearAdapters(): void;
