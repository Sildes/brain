export interface ScanOptions {
    dir: string;
    outputDir?: string;
    adapter?: string;
}
export interface ScanResult {
    framework: string;
    confidence: number;
    fileCount: number;
    moduleCount: number;
    routeCount: number;
    commandCount: number;
    brainPath: string;
    promptPath: string;
}
export declare function scanProject(options: ScanOptions): Promise<ScanResult>;
