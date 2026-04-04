export declare function findBestAdapter(dir: string): Promise<{
    adapter: import("./types.ts").Adapter;
    match: import("./types.ts").AdapterMatch;
} | null>;
