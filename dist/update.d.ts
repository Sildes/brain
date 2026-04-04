export interface UpdateOptions {
    dir: string;
    outputDir?: string;
    adapter?: string;
}
export interface UpdateResult {
    framework: string;
    confidence: number;
    fileCount: number;
    moduleCount: number;
    routeCount: number;
    commandCount: number;
    brainPath: string;
    promptPath: string;
    contextPreserved: boolean;
}
/**
 * Extracts the Business Context section from brain.md content.
 * Returns null if the section doesn't exist.
 */
export declare function extractBusinessContext(content: string): string | null;
export declare function updateProject(options: UpdateOptions): Promise<UpdateResult>;
