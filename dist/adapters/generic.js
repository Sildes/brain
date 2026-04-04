import { stat } from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
async function fileExists(filePath) {
    try {
        await stat(filePath);
        return true;
    }
    catch {
        return false;
    }
}
function inferModulesFromSrc(srcFiles) {
    const moduleMap = new Map();
    for (const file of srcFiles) {
        const normalized = file.replace(/\\/g, "/");
        // Try common source directories
        const match = normalized.match(/^(?:src|app|lib)\/([^/]+)/);
        if (!match)
            continue;
        const topDir = match[1];
        // Skip common non-module directories
        const skipDirs = [
            "controllers", "models", "views", "helpers", "utils",
            "services", "middleware", "config", "tests", "test", "public",
        ];
        if (skipDirs.includes(topDir.toLowerCase()))
            continue;
        const moduleId = topDir.toLowerCase();
        if (!moduleMap.has(moduleId)) {
            moduleMap.set(moduleId, `src/${topDir}`);
        }
    }
    return [...moduleMap.entries()].map(([id, modulePath]) => ({
        name: id.charAt(0).toUpperCase() + id.slice(1),
        path: modulePath,
        dependsOn: [],
        confidence: 0.65,
    }));
}
async function identifyKeyFiles(dir, files) {
    const keyFiles = [];
    // Common important files
    const importantPatterns = [
        { pattern: "README.md", role: "documentation" },
        { pattern: "package.json", role: "package-manifest" },
        { pattern: "composer.json", role: "package-manifest" },
        { pattern: "Cargo.toml", role: "package-manifest" },
        { pattern: "go.mod", role: "package-manifest" },
        { pattern: "requirements.txt", role: "dependencies" },
        { pattern: "Makefile", role: "build-config" },
        { pattern: "docker-compose.yml", role: "deployment" },
        { pattern: "Dockerfile", role: "deployment" },
    ];
    for (const { pattern, role } of importantPatterns) {
        if (files.includes(pattern) || await fileExists(path.join(dir, pattern))) {
            keyFiles.push({ path: pattern, role });
        }
    }
    // Add some source files as examples
    const srcFiles = files.filter((f) => /\.(ts|tsx|js|jsx|py|php|go|rs|java)$/i.test(f) &&
        !f.includes("node_modules") &&
        !f.includes("vendor") &&
        !f.includes("test") &&
        !f.includes("__tests__")).slice(0, 5);
    for (const src of srcFiles) {
        keyFiles.push({ path: src, role: "source" });
    }
    return keyFiles;
}
function inferConventions() {
    return {
        standards: [],
        notes: [
            "Generic project - no framework-specific conventions detected",
            "Follow existing code patterns in the codebase",
        ],
        navigation: [],
    };
}
function buildQuickFind() {
    return [
        { task: "Find source code", location: "src/ or app/" },
        { task: "Find tests", location: "tests/ or test/" },
        { task: "Find configuration", location: "config/ or *.config.*" },
        { task: "Find documentation", location: "README.md or docs/" },
    ];
}
export const genericAdapter = {
    name: "generic",
    priority: 0, // Lowest priority, always fallback
    async detect(_dir) {
        // Generic adapter always matches with low confidence
        return {
            supported: true,
            framework: "generic",
            confidence: 0.5,
            reasons: ["Fallback adapter - no specific framework detected"],
        };
    },
    async extract(dir) {
        // Get all files
        const allFiles = await fg(["**/*"], {
            cwd: dir,
            ignore: [
                "node_modules/**",
                "vendor/**",
                ".git/**",
                "dist/**",
                "build/**",
                "target/**",
                "__pycache__/**",
                "*.lock",
            ],
            onlyFiles: true,
        });
        // Get files from source directories
        const srcFiles = allFiles.filter((f) => f.startsWith("src/") || f.startsWith("app/") || f.startsWith("lib/"));
        // Extract modules
        const modules = inferModulesFromSrc(srcFiles);
        // Identify key files
        const keyFiles = await identifyKeyFiles(dir, allFiles);
        return {
            framework: "Generic",
            modules,
            routes: [],
            commands: [],
            conventions: inferConventions(),
            keyFiles,
            quickFind: buildQuickFind(),
            fileCount: allFiles.length,
        };
    },
};
export default genericAdapter;
//# sourceMappingURL=generic.js.map