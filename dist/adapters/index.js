const adapters = [];
export function registerAdapter(adapter) {
    adapters.push(adapter);
    adapters.sort((a, b) => b.priority - a.priority);
}
export function getAdapters() {
    return [...adapters];
}
export async function detectFramework(dir) {
    for (const adapter of adapters) {
        const match = await adapter.detect(dir);
        if (match.supported) {
            return { adapter, match };
        }
    }
    return null;
}
export function clearAdapters() {
    adapters.length = 0;
}
//# sourceMappingURL=index.js.map