You are enriching an auto-generated topic file for a Symfony codebase.
Topic: **general** — help future LLM sessions find relevant files quickly.

## Context
- Keywords: 
- Files detected: 4
- Routes: 0 | Commands: 1

## Files detected
- `composer.json`
- `config/services.yaml`
- `src/Command/ImportCommand.php`
- `src/Controller/UserController.php`

## Read these files first

- src/Controller/UserController.php
- config/services.yaml
- composer.json
- src/Command/ImportCommand.php

## Task

Produce a TOPIC FILE optimized for LLM consumption (not human readable).
Goal: minimize tokens while maximizing information density for future LLM sessions.

## Rules (CRITICAL)
- YAML-like compact format — NO markdown tables, NO prose paragraphs
- Every line must be useful to an LLM. No filler. No summaries. No explanations.
- `ClassName::method` references > descriptions
- One file per line with its role as tags, not sentences
- Flows = ordered list of `Class::method → Class::method` chains
- Gotchas = single-line bullets with file reference
- MAX 200 lines total. Cut before padding.

## Output Format

```
# general
domain: <1-5 word domain label>
purpose: <1 line, max 15 words>

## core
path/to/File.php: ClassName — <3 word role>
path/to/Other.php: OtherName — <3 word role>

## related
path/X.php: XName — role

## flows
flow-name: Controller::action → Service::method → Repository::method
other-flow: A::b → C::d

## routes
GET /path: route_name
POST /path: route_name

## gotchas
- ClassName::method does X instead of Y — path/to/file.php
- edge case: Z fails when W — path/to/file.php
```