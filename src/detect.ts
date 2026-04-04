import { detectFramework, getAdapters } from "./adapters/index.js";

export async function findBestAdapter(dir: string): Promise<{
  adapter: import("./types.ts").Adapter;
  match: import("./types.ts").AdapterMatch;
} | null> {
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
