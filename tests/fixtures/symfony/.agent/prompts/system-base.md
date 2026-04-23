# System Base

## Priority Order
1. Read `.projectbrain/brain.md` for project structure
2. Load topic file if relevant to the task
3. Apply skill if applicable
4. Read only the files strictly needed

## Framework
Symfony

## Quick Commands
- `php bin/console debug:router` — List all routes
- `php bin/console debug:container` — List all services
- `php bin/phpunit` — Run tests

## Topics
- general

## Context Loading
- Load 1 topic by default, 2 max if ambiguous
- Prefer diff/extract over full file reads
- Summarize history to 10 lines max
