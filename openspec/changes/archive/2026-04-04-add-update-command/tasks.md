## 1. Core Update Logic

- [x] 1.1 Create `src/update.ts` with `extractBusinessContext(content: string): string | null` function using regex
- [x] 1.2 Add `insertBusinessContext(content: string, businessContext: string): string` function to place section after "Quick Find"
- [x] 1.3 Create `updateProject(options: UpdateOptions): Promise<ScanResult>` function that:
  - Reads existing brain.md if present
  - Extracts Business Context
  - Calls scan logic to regenerate
  - Re-inserts Business Context if it existed

## 2. CLI Integration

- [x] 2.1 Add `update` command to `src/cli.ts` with same options as `scan` (output, adapter)
- [x] 2.2 Import and wire up the update function from `src/update.ts`
- [x] 2.3 Add console output showing Business Context preservation status

## 3. Output Modifications

- [x] 3.1 Modify `formatBrainMd()` in `src/output.ts` to accept optional `businessContext?: string` parameter
- [x] 3.2 Insert Business Context section after "Quick Find" and before "Meta" when provided

## 4. Documentation

- [x] 4.1 Update README.md with `brain update` command documentation in both French and English sections

## 5. Testing

- [x] 5.1 Test `brain update` on project without brain.md (should behave like scan)
- [x] 5.2 Test `brain update` on project with brain.md but no Business Context
- [x] 5.3 Test `brain update` on project with brain.md containing Business Context (verify preservation)
- [x] 5.4 Test with custom --output directory
- [x] 5.5 Verify section ordering (Business Context between Quick Find and Meta)
