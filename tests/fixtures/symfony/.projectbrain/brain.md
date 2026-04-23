# 🧠 Project Brain
> Generated: 2026-04-23T19:16:30Z · Symfony · 4 files

## At a Glance
- **Modules**: none detected
- **Routes**: 0 HTTP endpoints
- **Commands**: 1 CLI commands
- **Key Files**: 3 identified

## Navigation (CLI)
```bash
# List all routes
php bin/console debug:router

# List all services
php bin/console debug:container

# Run tests
php bin/phpunit

```

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
| Change database schema | `migrations/` |
| Find tests | `tests/*/` |
| Configure services | `config/services.yaml` |

## Topics

- **general** [+] — 4 files, 0 routes

See `.projectbrain/brain-topics/` for topic details.

## Meta

| Property | Value |
|----------|-------|
| Framework | Symfony |
| Files scanned | 4 |
| Generated | 2026-04-23T19:16:30Z |

### When to Refresh
- **Re-run `brain scan`** when: adding/removing modules, major refactoring
- **Re-run `brain prompt`** when: business logic changes significantly