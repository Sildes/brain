import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import fg from "fast-glob";
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
        const result = await execAsync(cmd, { cwd, timeout: 30000, maxBuffer: 1024 * 1024 * 10 });
        return result;
    }
    catch {
        return null;
    }
}
function inferModulesFromSrc(srcFiles) {
    const moduleMap = new Map();
    for (const file of srcFiles) {
        const normalized = file.replace(/\\/g, "/");
        const match = normalized.match(/^src\/([^/]+)/);
        if (!match)
            continue;
        const topDir = match[1];
        // Skip common non-module directories
        if (["Controller", "Command", "Entity", "Repository", "DependencyInjection", "Resources", "Kernel.php"].includes(topDir)) {
            continue;
        }
        const moduleId = topDir.toLowerCase();
        if (!moduleMap.has(moduleId)) {
            moduleMap.set(moduleId, new Set());
        }
        moduleMap.get(moduleId).add(`src/${topDir}`);
    }
    return [...moduleMap.entries()].map(([id, paths]) => ({
        name: id.charAt(0).toUpperCase() + id.slice(1),
        path: [...paths][0],
        dependsOn: [],
        confidence: 0.72,
    }));
}
async function extractRoutesViaCli(dir) {
    const result = await runCommand("php bin/console debug:router --format=json 2>/dev/null", dir);
    if (!result?.stdout)
        return [];
    try {
        const routes = JSON.parse(result.stdout);
        return Object.entries(routes).map(([name, info]) => ({
            name,
            path: info.path || info.route || "/unknown",
            methods: info.method ? [info.method] : (info.methods || []),
            controller: info.defaults?._controller,
            module: inferModuleFromController(info.defaults?._controller),
        }));
    }
    catch {
        return [];
    }
}
function inferModuleFromController(controller) {
    if (!controller || typeof controller !== 'string')
        return undefined;
    // Pattern: App\Controller\Admin\XxxController → admin
    const adminMatch = controller.match(/App\\Controller\\Admin\\/);
    if (adminMatch)
        return 'admin';
    // Pattern: App\Controller\XxxController → xxx
    const controllerMatch = controller.match(/App\\Controller\\([A-Z][a-zA-Z]+)Controller/);
    if (controllerMatch) {
        // Convert CamelCase to kebab-case: BookingRequest → booking-request
        const name = controllerMatch[1];
        return name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    }
    // Fallback: App\ModuleName\... → modulename
    const moduleMatch = controller.match(/App\\([^\\]+)\\/);
    return moduleMatch ? moduleMatch[1].toLowerCase() : undefined;
}
async function extractCommands(dir, srcFiles) {
    const commands = [];
    const commandFiles = srcFiles.filter((f) => f.includes("/Command/") && f.endsWith(".php"));
    for (const file of commandFiles) {
        const filePath = path.join(dir, file);
        try {
            const content = await readFile(filePath, "utf8");
            // Extract command name from AsCommand attribute
            const asCommandMatch = content.match(/#\[AsCommand\s*\([^)]*name:\s*['"]([^'"]+)['"]/);
            // Or from defaultName property
            const defaultNameMatch = content.match(/protected\s+static\s+\$defaultName\s*=\s*['"]([^'"]+)['"]/);
            // Or from command: in configure()
            const configureMatch = content.match(/setName\s*\(\s*['"]([^'"]+)['"]\s*\)/);
            const name = asCommandMatch?.[1] || defaultNameMatch?.[1] || configureMatch?.[1];
            if (!name)
                continue;
            // Extract class name
            const classMatch = content.match(/class\s+(\w+)/);
            // Check if command is "dangerous"
            const isUnsafe = /\b(migrate|drop|delete|truncate|clear|reset)\b/i.test(name);
            commands.push({
                name,
                class: classMatch?.[1],
                safe: !isUnsafe,
            });
        }
        catch {
            // Skip unreadable files
        }
    }
    return commands;
}
async function extractKeyFiles(dir, srcFiles) {
    const keyFiles = [];
    // Check for common important files
    const importantPaths = [
        { path: "composer.json", role: "package-manifest" },
        { path: "config/services.yaml", role: "service-container" },
        { path: "config/routes.yaml", role: "routing-config" },
        { path: ".env", role: "environment-template" },
        { path: "README.md", role: "documentation" },
    ];
    for (const { path: p, role } of importantPaths) {
        if (await fileExists(path.join(dir, p))) {
            keyFiles.push({ path: p, role });
        }
    }
    // Add representative controllers
    const controllers = srcFiles.filter((f) => f.includes("/Controller/") && f.endsWith(".php")).slice(0, 3);
    for (const ctrl of controllers) {
        keyFiles.push({ path: ctrl, role: "controller" });
    }
    // Add representative services
    const services = srcFiles.filter((f) => f.includes("/Service/") && f.endsWith(".php")).slice(0, 3);
    for (const svc of services) {
        keyFiles.push({ path: svc, role: "service" });
    }
    return keyFiles;
}
function extractConventions(composer) {
    const conventions = {
        standards: ["PSR-12"],
        notes: ["Keep controllers thin", "Business logic in services"],
        navigation: [],
    };
    const psr4 = composer.autoload?.["psr-4"] || {};
    const namespaces = Object.keys(psr4);
    if (namespaces.length > 0) {
        conventions.notes.push(`PSR-4 namespaces: ${namespaces.join(", ")}`);
    }
    // Add common Symfony commands
    conventions.navigation.push({ description: "List all routes", command: "php bin/console debug:router" }, { description: "List all services", command: "php bin/console debug:container" }, { description: "Run tests", command: "php bin/phpunit" });
    return conventions;
}
function buildQuickFind() {
    return [
        { task: "Add an API endpoint", location: "src/Controller/ + config/routes.yaml" },
        { task: "Add business logic", location: "src/*/Service/" },
        { task: "Add a CLI command", location: "src/Command/" },
        { task: "Change database schema", location: "migrations/" },
        { task: "Find tests", location: "tests/*/" },
        { task: "Configure services", location: "config/services.yaml" },
    ];
}
export const symfonyAdapter = {
    name: "symfony",
    priority: 100,
    async detect(dir) {
        const composerPath = path.join(dir, "composer.json");
        const composer = await readJson(composerPath, {});
        const deps = { ...composer.require, ...composer["require-dev"] };
        const hasFrameworkBundle = Boolean(deps["symfony/framework-bundle"]);
        if (hasFrameworkBundle) {
            return {
                supported: true,
                framework: "symfony",
                confidence: 0.95,
                reasons: ["symfony/framework-bundle found in composer.json"],
            };
        }
        // Check for Symfony structure without framework-bundle
        const hasConsole = await fileExists(path.join(dir, "bin/console"));
        const hasConfig = await fileExists(path.join(dir, "config"));
        if (hasConsole && hasConfig) {
            return {
                supported: true,
                framework: "symfony",
                confidence: 0.80,
                reasons: ["bin/console and config/ directory detected"],
            };
        }
        return {
            supported: false,
            framework: "symfony",
            confidence: 0,
            reasons: ["No Symfony markers found"],
        };
    },
    async extract(dir) {
        // Get all PHP files
        const allFiles = await fg(["**/*.php", "composer.json", "config/**/*"], {
            cwd: dir,
            ignore: ["vendor/**", "node_modules/**", "var/**"],
        });
        const srcFiles = allFiles.filter((f) => f.startsWith("src/"));
        // Read composer.json
        const composer = await readJson(path.join(dir, "composer.json"), {});
        // Extract modules
        const modules = inferModulesFromSrc(srcFiles);
        // Extract routes
        const routes = await extractRoutesViaCli(dir);
        // Extract commands
        const commands = await extractCommands(dir, srcFiles);
        // Extract key files
        const keyFiles = await extractKeyFiles(dir, srcFiles);
        // Extract conventions
        const conventions = extractConventions(composer);
        return {
            framework: "Symfony",
            modules,
            routes,
            commands,
            conventions,
            keyFiles,
            quickFind: buildQuickFind(),
            fileCount: allFiles.length,
        };
    },
};
export default symfonyAdapter;
//# sourceMappingURL=symfony.js.map