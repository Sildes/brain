import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
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
function extractRoutesFromAppDir(appFiles) {
    const routes = [];
    for (const file of appFiles) {
        const normalized = file.replace(/\\/g, "/");
        // App Router: page.tsx or page.js
        if (/(?:^|\/)app\/(.*)\/page\.(tsx|ts|js|jsx)$/.test(normalized)) {
            const match = normalized.match(/(?:^|\/)app\/(.*)\/page\.(tsx|ts|js|jsx)$/);
            if (match) {
                const routePath = match[1]
                    .replace(/\([^)]+\)/g, "") // Remove route groups
                    .replace(/\/+/g, "/")
                    .replace(/^\//, "")
                    .replace(/\/$/, "");
                routes.push({
                    name: routePath || "home",
                    path: "/" + routePath,
                    methods: ["GET"],
                    file: `app/${match[1]}/page.${match[2]}`,
                });
            }
        }
        // App Router: route.ts (API routes)
        if (/(?:^|\/)app\/(.*)\/route\.(tsx|ts|js|jsx)$/.test(normalized)) {
            const match = normalized.match(/(?:^|\/)app\/(.*)\/route\.(tsx|ts|js|jsx)$/);
            if (match) {
                const routePath = match[1]
                    .replace(/\([^)]+\)/g, "")
                    .replace(/\/+/g, "/")
                    .replace(/^\//, "")
                    .replace(/\/$/, "");
                routes.push({
                    name: `api:${routePath}`,
                    path: "/" + routePath,
                    methods: ["GET", "POST", "PUT", "DELETE"],
                    file: `app/${match[1]}/route.${match[2]}`,
                });
            }
        }
    }
    return routes;
}
function extractRoutesFromPagesDir(pagesFiles) {
    const routes = [];
    for (const file of pagesFiles) {
        const normalized = file.replace(/\\/g, "/");
        // Skip _app, _document, _error, api
        if (/pages\/_/.test(normalized))
            continue;
        if (/pages\/api\//.test(normalized)) {
            // API routes
            const match = normalized.match(/pages\/api\/(.*)\.(tsx|ts|js|jsx)$/);
            if (match) {
                routes.push({
                    name: `api:${match[1]}`,
                    path: "/api/" + match[1],
                    methods: ["GET", "POST", "PUT", "DELETE"],
                    file: `pages/api/${match[1]}.${match[2]}`,
                });
            }
            continue;
        }
        // Regular pages
        const match = normalized.match(/pages\/(.*)\.(tsx|ts|js|jsx)$/);
        if (match) {
            let routePath = match[1]
                .replace(/index$/, "")
                .replace(/\/$/, "");
            routes.push({
                name: routePath || "home",
                path: "/" + routePath,
                methods: ["GET"],
                file: `pages/${match[1]}.${match[2]}`,
            });
        }
    }
    return routes;
}
function inferModulesFromApp(appFiles) {
    const moduleMap = new Map();
    for (const file of appFiles) {
        const normalized = file.replace(/\\/g, "/");
        // Try to infer modules from app directory structure
        const appMatch = normalized.match(/app\/([^/]+)/);
        if (appMatch) {
            const topDir = appMatch[1];
            // Skip route groups and standard directories
            if (topDir.startsWith("(") || ["api", "(auth)", "(dashboard)"].includes(topDir))
                continue;
            const moduleId = topDir.toLowerCase();
            if (!moduleMap.has(moduleId)) {
                moduleMap.set(moduleId, new Set());
            }
            moduleMap.get(moduleId).add(`app/${topDir}`);
        }
    }
    return [...moduleMap.entries()].map(([id, paths]) => ({
        name: id.charAt(0).toUpperCase() + id.slice(1),
        path: [...paths][0],
        dependsOn: [],
        confidence: 0.65,
    }));
}
export const nextjsAdapter = {
    name: "nextjs",
    priority: 95,
    async detect(dir) {
        const packageJson = await readJson(path.join(dir, "package.json"), {});
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        if (deps["next"]) {
            return {
                supported: true,
                framework: "nextjs",
                confidence: 0.95,
                reasons: [`next v${deps["next"]} found in package.json`],
            };
        }
        return {
            supported: false,
            framework: "nextjs",
            confidence: 0,
            reasons: ["next not found in package.json"],
        };
    },
    async extract(dir) {
        const allFiles = await fg(["**/*.{ts,tsx,js,jsx,json}"], {
            cwd: dir,
            ignore: ["node_modules/**", ".next/**", "out/**", "dist/**"],
        });
        // Separate app router and pages router files
        const appFiles = allFiles.filter((f) => f.startsWith("app/"));
        const pagesFiles = allFiles.filter((f) => f.startsWith("pages/"));
        // Extract routes
        const appRoutes = extractRoutesFromAppDir(appFiles);
        const pagesRoutes = extractRoutesFromPagesDir(pagesFiles);
        const routes = [...appRoutes, ...pagesRoutes];
        // Extract modules
        const modules = inferModulesFromApp(appFiles);
        // Key files
        const keyFiles = [
            { path: "package.json", role: "package-manifest" },
            { path: "next.config.js", role: "next-config" },
            { path: "tsconfig.json", role: "typescript-config" },
        ];
        if (await fileExists(path.join(dir, "tailwind.config.js"))) {
            keyFiles.push({ path: "tailwind.config.js", role: "tailwind-config" });
        }
        // Add example pages
        const examplePages = [...appFiles, ...pagesFiles]
            .filter((f) => /page\.(tsx|js)$/.test(f) || f.includes("pages/") && !f.includes("/api/"))
            .slice(0, 3);
        for (const page of examplePages) {
            keyFiles.push({ path: page, role: "page" });
        }
        const conventions = {
            standards: ["React best practices"],
            notes: [
                "Use App Router (app/) over Pages Router (pages/) when possible",
                "Server Components by default, use 'use client' for interactivity",
                "Use Server Actions for mutations",
            ],
            navigation: [
                { description: "Run dev server", command: "npm run dev" },
                { description: "Build for production", command: "npm run build" },
                { description: "Run tests", command: "npm test" },
            ],
        };
        return {
            framework: "Next.js",
            modules,
            routes,
            commands: [],
            conventions,
            keyFiles,
            quickFind: [
                { task: "Add a page", location: "app/*/page.tsx" },
                { task: "Add an API route", location: "app/api/*/route.ts or pages/api/" },
                { task: "Add a component", location: "components/" },
                { task: "Add a layout", location: "app/layout.tsx" },
                { task: "Add styles", location: "app/globals.css or tailwind.config.js" },
                { task: "Find tests", location: "__tests__/ or *.test.ts" },
            ],
            fileCount: allFiles.length,
        };
    },
};
export default nextjsAdapter;
//# sourceMappingURL=nextjs.js.map