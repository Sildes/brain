## Context

Project Brain currently has two main commands:
- `brain scan` - generates `.project/brain.md` and `.project/brain-prompt.md` from scratch
- `brain install` - adds brain rules to IDE config files

When users run `brain scan` again, it completely overwrites `.project/brain.md`, destroying any "Business Context" section added by the LLM. Users want a way to refresh structural data while preserving their business context.

## Goals / Non-Goals

**Goals:**
- Add `brain update` command that refreshes project context
- Preserve existing "Business Context" section during update
- Reuse existing scan infrastructure

**Non-Goals:**
- Smart/incremental updates (detecting what changed)
- Merging other manual edits to brain.md
- Updating brain-prompt.md (it can be regenerated)

## Decisions

### 1. Update as wrapper around scan

**Decision:** `brain update` will call the existing scan logic, then merge the preserved Business Context.

**Rationale:** Avoids code duplication. The scan logic already does everything needed for extracting project data.

**Alternative considered:** Fork scan logic into update. Rejected because it would create maintenance burden.

### 2. Business Context extraction via regex

**Decision:** Extract the Business Context section using a regex pattern matching `## Business Context` through the next `## ` header or end of file.

**Rationale:** Simple, predictable, no need for a full markdown parser.

### 3. Preserve only Business Context

**Decision:** Only the "Business Context" section is preserved. Other manual edits to brain.md will be lost.

**Rationale:** The structural sections (Modules, Routes, Commands, etc.) should reflect the current state of the project. Business Context is the only section meant to be hand-crafted by LLMs.

**Trade-off:** Users who manually edit other sections will lose those changes. This is acceptable because those sections are meant to be generated.

### 4. Command naming

**Decision:** Use `brain update` rather than `brain scan --update` or `brain refresh`.

**Rationale:** Clearer semantic distinction - `scan` is for initial setup, `update` is for refresh. Shorter to type.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Users expect all manual edits to be preserved | Document clearly that only Business Context is preserved |
| Regex fails on edge cases (e.g., Business Context in code blocks) | Use non-greedy matching, test against real examples |
| Business Context section format changes | Keep regex flexible - match header only, preserve everything below |
