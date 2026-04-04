import { detectFramework, getAdapters } from "./adapters/index.js";
export async function findBestAdapter(dir) {
    const result = await detectFramework(dir);
    if (result) {
        return result;
    }
    // Fallback to generic adapter
    const adapters = getAdapters();
    const generic = adapters.find((a) => a.name === "generic");
    if (generic) {
        const match = await generic.detect(dir);
        return { adapter: generic, match };
    }
    return null;
}
//# sourceMappingURL=detect.js.map