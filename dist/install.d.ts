export interface InstallOptions {
    dir: string;
    ide?: string;
    brainPath: string;
    promptPath: string;
}
export declare function installIde(options: InstallOptions): Promise<void>;
