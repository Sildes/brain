## Why

Currently, users must re-run `brain scan` to refresh their project context, which completely regenerates `.project/brain.md`. This overwrites any manually-added content, including the "Business Context" section that LLMs populate after using `brain install`.

Users need a way to refresh structural information (modules, routes, commands) while preserving the business context they've invested time creating.

## What Changes

- Add new `brain update` command that re-scans the project
- Preserve existing "Business Context" section during update
- Clear semantic distinction: `scan` = initial setup, `update` = refresh existing context

## Capabilities

### New Capabilities

- `update-command`: CLI command to refresh project context while preserving business context

### Modified Capabilities

None - this is a new feature with no existing spec changes.

## Impact

- **New file**: `src/update.ts` - update logic with context preservation
- **Modified file**: `src/cli.ts` - add new `update` command
- **Potentially modified**: `src/scan.ts` - extract reusable scan logic
- **No breaking changes**: Existing `scan` and `install` commands unchanged
