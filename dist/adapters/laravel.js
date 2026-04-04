import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import { promisify } from "node:util";
import { exec } from "node:child_process";
const execAsync = promisify(exec);
async function readJson(filePath, fallback) {
    try {
        const content = await readFile(filePath, "utf8");
        return JSON.parse(content);
    }
    catch {
        return fallback;
    }
}
async function fileExists(filePath) {
    try {
        await stat(filePath);
        return true;
    }
    catch {
        return false;
    }
}
async function runCommand(cmd, cwd) {
    try {
        const result = await execAsync(cmd, { cwd, timeout: 10000 });
        return result;
    }
    catch {
        return null;
    }
}
function inferModulesFromApp(appFiles) {
    const moduleMap = new Map();
    for (const file of appFiles) {
        const normalized = file.replace(/\\/g, "/");
        const match = normalized.match(/^app\/([^/]+)/);
        if (!match)
            continue;
        const topDir = match[1];
        // Skip Laravel standard directories
        const skipDirs = ["Http", "Console", "Providers", "Exceptions", "Models"];
        if (skipDirs.includes(topDir))
            continue;
        const moduleId = topDir.toLowerCase();
        if (!moduleMap.has(moduleId)) {
            moduleMap.set(moduleId, `app/${topDir}`);
        }
    }
    return [...moduleMap.entries()].map(([id, modulePath]) => ({
        name: id.charAt(0).toUpperCase() + id.slice(1),
        path: modulePath,
        dependsOn: [],
        confidence: 0.70,
    }));
}
async function extractRoutesViaArtisan(dir) {
    const result = await runCommand("php artisan route:list --json 2>/dev/null", dir);
    if (!result?.stdout)
        return [];
    try {
        const routes = JSON.parse(result.stdout);
        return routes.map((r) => ({
            name: r.name || r.uri,
            path: r.uri,
            methods: Array.isArray(r.method) ? r.method : [r.method],
            controller: r.action?.includes("@") ? r.action : undefined,
            module: undefined,
        }));
    }
    catch {
        return [];
    }
}
async function extractCommandsFromApp(dir, appFiles) {
    const commands = [];
    const commandFiles = appFiles.filter((f) => f.includes("/Commands/") && f.endsWith(".php"));
    for (const file of commandFiles) {
        try {
            const content = await readFile(path.join(dir, file), "utf8");
            const signatureMatch = content.match(/protected\s+\$signature\s*=\s*['"]([^'"]+)['"]/);
            const classMatch = content.match(/class\s+(\w+)/);
            if (signatureMatch) {
                const name = signatureMatch[1].split(" ")[0]; // Get command name only
                const isUnsafe = /\b(migrate|drop|delete|truncate|clear|reset)\b/i.test(name);
                commands.push({
                    name,
                    class: classMatch?.[1],
                    safe: !isUnsafe,
                });
            }
        }
        catch {
            // Skip unreadable files
        }
    }
    return commands;
}
async function identifyKeyFiles(dir, appFiles) {
    const keyFiles = [];
    const importantFiles = [
        { path: "composer.json", role: "package-manifest" },
        { path: ".env.example", role: "environment-template" },
        { path: "config/app.php", role: "app-config" },
        { path: "routes/web.php", role: "routes" },
        { path: "routes/api.php", role: "api-routes" },
    ];
    for (const { path: p, role } of importantFiles) {
        if (await fileExists(path.join(dir, p))) {
            keyFiles.push({ path: p, role });
        }
    }
    // Add representative controllers
    const controllers = appFiles.filter((f) => f.includes("/Controllers/") && f.endsWith(".php")).slice(0, 3);
    for (const ctrl of controllers) {
        keyFiles.push({ path: ctrl, role: "controller" });
    }
    return keyFiles;
}
function buildConventions() {
    return {
        standards: ["PSR-12"],
        notes: [
            "Eloquent ORM for database",
            "Blade templates for views",
            "Service providers for dependency injection",
        ],
        navigation: [
            { description: "List routes", command: "php artisan route:list" },
            { description: "Run migrations", command: "php artisan migrate" },
            { description: "Run tests", command: "php artisan test" },
        ],
    };
}
function buildQuickFind() {
    return [
        { task: "Add an API endpoint", location: "routes/api.php + app/Http/Controllers/" },
        { task: "Add business logic", location: "app/Services/ or app/Models/" },
        { task: "Add a CLI command", location: "app/Console/Commands/" },
        { task: "Add middleware", location: "app/Http/Middleware/" },
        { task: "Find tests", location: "tests/" },
    ];
}
export const laravelAdapter = {
    name: "laravel",
    priority: 90,
    async detect(dir) {
        const hasArtisan = await fileExists(path.join(dir, "artisan"));
        if (!hasArtisan) {
            return {
                supported: false,
                framework: "laravel",
                confidence: 0,
                reasons: ["artisan file not found"],
            };
        }
        const composer = await readJson(path.join(dir, "composer.json"), {});
        const hasLaravel = Boolean(composer.require?.["laravel/framework"]);
        if (hasLaravel) {
            return {
                supported: true,
                framework: "laravel",
                confidence: 0.95,
                reasons: ["artisan and laravel/framework found"],
            };
        }
        return {
            supported: true,
            framework: "laravel",
            confidence: 0.80,
            reasons: ["artisan file found (laravel/framework not in composer.json)"],
        };
    },
    async extract(dir) {
        const allFiles = await fg(["**/*.php", "composer.json"], {
            cwd: dir,
            ignore: ["vendor/**", "node_modules/**", "storage/**"],
        });
        const appFiles = allFiles.filter((f) => f.startsWith("app/"));
        const modules = inferModulesFromApp(appFiles);
        const routes = await extractRoutesViaArtisan(dir);
        const commands = await extractCommandsFromApp(dir, appFiles);
        const keyFiles = await identifyKeyFiles(dir, appFiles);
        return {
            framework: "Laravel",
            modules,
            routes,
            commands,
            conventions: buildConventions(),
            keyFiles,
            quickFind: buildQuickFind(),
            fileCount: allFiles.length,
        };
    },
};
export default laravelAdapter;
//# sourceMappingURL=laravel.js.map