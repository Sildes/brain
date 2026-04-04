## ADDED Requirements

### Requirement: Update command preserves Business Context

The `brain update` command SHALL re-scan the project and regenerate `.project/brain.md` while preserving any existing "## Business Context" section.

#### Scenario: Update with existing Business Context
- **WHEN** user runs `brain update` on a project with existing `.project/brain.md` containing a "## Business Context" section
- **THEN** the command SHALL extract the Business Context section before regeneration
- **AND** the command SHALL re-insert the same Business Context section in the regenerated file

#### Scenario: Update without Business Context
- **WHEN** user runs `brain update` on a project with existing `.project/brain.md` that has no "## Business Context" section
- **THEN** the command SHALL regenerate brain.md normally without any section preservation

#### Scenario: Update on new project
- **WHEN** user runs `brain update` on a project without `.project/brain.md`
- **THEN** the command SHALL behave identically to `brain scan`

### Requirement: Update command CLI interface

The `brain update` command SHALL accept the same options as `brain scan` for output directory and adapter selection.

#### Scenario: Update with custom output directory
- **WHEN** user runs `brain update --output .context`
- **THEN** the command SHALL read from and write to the `.context` directory

#### Scenario: Update with forced adapter
- **WHEN** user runs `brain update --adapter symfony`
- **THEN** the command SHALL use the symfony adapter regardless of detected framework

### Requirement: Business Context section placement

The preserved Business Context section SHALL be placed after the "Quick Find" section and before the "Meta" section in the regenerated brain.md.

#### Scenario: Section ordering after update
- **WHEN** user runs `brain update` with an existing Business Context
- **THEN** the Business Context section SHALL appear after "## Quick Find"
- **AND** the Business Context section SHALL appear before "## Meta"

### Requirement: Update regenerates brain-prompt.md

The `brain update` command SHALL regenerate `.project/brain-prompt.md` along with `.project/brain.md`.

#### Scenario: Prompt file regeneration
- **WHEN** user runs `brain update`
- **THEN** the command SHALL regenerate both brain.md and brain-prompt.md

### Requirement: Success output indicates update vs scan

The `brain update` command output SHALL indicate when Business Context was preserved.

#### Scenario: Output shows preservation status
- **WHEN** user runs `brain update` with an existing Business Context
- **THEN** the console output SHALL include a message indicating Business Context was preserved
