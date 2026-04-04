export interface Module {
    name: string;
    path: string;
    dependsOn: string[];
    confidence?: number;
}
export interface Route {
    name: string;
    path: string;
    methods?: string[];
    controller?: string;
    module?: string;
    file?: string;
}
export interface Command {
    name: string;
    class?: string;
    description?: string;
    safe: boolean;
}
export interface KeyFile {
    path: string;
    role: string;
    language?: string;
}
export interface NavigationCommand {
    description: string;
    command: string;
}
export interface Conventions {
    standards: string[];
    notes: string[];
    navigation: NavigationCommand[];
}
export interface QuickFindMapping {
    task: string;
    location: string;
}
export interface BrainData {
    framework: string;
    modules: Module[];
    routes: Route[];
    commands: Command[];
    conventions: Conventions;
    keyFiles: KeyFile[];
    quickFind: QuickFindMapping[];
    fileCount: number;
}
export interface AdapterMatch {
    supported: boolean;
    framework: string;
    confidence: number;
    reasons: string[];
}
export interface Adapter {
    name: string;
    priority: number;
    detect(dir: string): Promise<AdapterMatch>;
    extract(dir: string): Promise<BrainData>;
}
