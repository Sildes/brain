# Project Brain

Generate project context for LLMs - works with any IDE.

## Installation

```bash
npm install -g project-brain
```

Or use directly:

```bash
npx project-brain scan
```

## Usage

### Quick Start

```bash
cd your-project
brain scan                        # Generate brain.md + brain-prompt.md
brain install cursor              # Configure + show generate prompt
[Paste prompt in Cursor chat]
# LLM updates brain.md automatically
```

### What You Get

- **Framework detection** (Symfony, Laravel, Next.js, or generic)
- **Module extraction** from directory structure
- **Route extraction** with filtering (business routes only)
- **Command extraction** from CLI command files
- **Convention extraction** from config files
- **Key file identification** for LLM context
- **Token-efficient** - One read replaces many

## Commands

### `brain scan`

Scans project and generates:
- `.project/brain.md` - Structural map
- `.project/brain-prompt.md` - LLM prompt

Options:
```
brain scan --output .context     # Custom output directory
brain scan --adapter symfony   # Force specific adapter
```

### `brain install [ide]`

Installs brain configuration for your IDE:

```bash
brain install cursor      # Cursor (.cursorrules)
brain install claude      # Claude Code (CLAUDE.md)
brain install opencode    # Opencode (.opencode/rules.md)
brain install windsurf    # Windsurf (.windsurfrules)
brain install zed         # Zed (.zed/rules.md)
brain install all         # All supported IDEs
brain install             # Interactive selection
```

**Smart Updates:**
- Creates file if not exists
- Appends to existing file (preserves content)
- Updates only the marked section

### Generate Business Context

After `brain install`, copy the displayed prompt to your IDE's chat. The LLM will:
1. Read `.project/brain-prompt.md`
2. Generate business context
3. Write to `.project/brain.md` under `## Business Context`

Done! Your `.project/brain.md` now has complete business context.

## Supported Frameworks

| Framework | Detection | Routes | Commands |
|-----------|-------------|-------|----------|
| Symfony | composer.json + bin/console | debug:router | bin/console |
| Laravel | artisan + composer.json | artisan route:list | artisan |
| Next.js | package.json (next) | app/ or pages/ directory structure | - |
| Generic | directory structure | - | - |

## How It Works

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User's Project                              │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                        ┌───────────────────┐
                        │   brain scan     │
                        └───────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │  Detect       │   Extract    │
                │  Framework   │   Data      │
                └───────────────┘───────────────┘
                                │
                ┌───────────────────────────────────────┐
                │  .project/brain.md                  │
                │  .project/brain-prompt.md          │
                └───────────────────────────────────────┘
                                │
                                ▼
                        ┌───────────────────┐
                        │   brain install   │
                        └───────────────────┘
                                │
                ┌───────────────┐
                │  Add rule     │   Show prompt  │
                │  to IDE       │   for LLM   │
                └───────────────┘───────────────┘
                                │
                                ▼
                        ┌───────────────────┐
                        │   Your LLM      │
                        │   (in IDE)      │
                        └───────────────────┘
```

## Example Output

### .cursorrules (after install)

```
# === BRAIN:START ===
Read .project/brain.md first for project context.
Use navigation commands listed there for live data.

Quick commands:
- Routes: php bin/console debug:router
- Services: php bin/console debug:container
- Tests: php bin/phpunit
# === BRAIN:END ===
```

### .project/brain.md

```markdown
# 🧠 Project Brain
> Generated: 2026-04-04T16:00:00Z · Symfony 6.4 · 847 files

## At a Glance
- **Modules**: Booking, Billing, Customer, Notification
- **Routes**: 47 HTTP endpoints
- **Commands**: 12 CLI commands

## Modules

### Booking
- **Path**: `src/Booking/`
- **Depends on**: `billing`, `customer`

## Routes

Total: 412 (397 business, 15 technical)

### Booking

| Route | Method | Path |
|-------|--------|------|
| app_booking_new | GET|POST | `/booking/new` |
| app_booking_show | GET | `/booking/{id}` |
| app_booking_edit | GET|POST | `/booking/{id}/edit` |
| ... | ... |

CLI: `php bin/console debug:router` for full list

## Conventions
- **Standards**: PSR-12
- Keep controllers thin
- Business logic in services

## Quick Find

| I need to... | Look in... |
|-------------|------------|
| Add an API endpoint | `src/Controller/ + config/routes.yaml` |
| Add business logic | `src/*/Service/` |
| Add a CLI command | `src/Command/` |

## Meta

| Property | Value |
|----------|-------|
| Framework | Symfony |
| Files scanned | 847 |
| Generated | 2026-04-04T16:00:00Z |
```

## License

MIT
