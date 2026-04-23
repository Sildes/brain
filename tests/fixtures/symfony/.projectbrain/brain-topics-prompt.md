# Brain Topic Enrichment

Framework: Symfony · 4 files · 0 routes

GOAL: enrich each topic draft below into a compact LLM-optimized file.
CRITICAL: YAML-like format. No prose. No markdown tables. `ClassName::method` > descriptions. Max 200 lines/topic.

## Steps

For each topic below:
1. READ the listed files to understand the domain
2. VALIDATE — remove irrelevant files, add missing ones (check imports, deps)
3. WRITE enriched file to `.projectbrain/brain-topics/[name].md` using the format below

## Topics (1)

### 1/1: general
keywords: 
output: .projectbrain/brain-topics/general.md

commands:
  app:import-users

read these files:
  src/Controller/UserController.php
  config/services.yaml
  composer.json
  src/Command/ImportCommand.php

## Output Format

```
# [topic-name]
domain: <1-5 words>
purpose: <1 line max 15 words>

## core
path/File.php: ClassName — role

## related
path/X.php: XName — role

## flows
name: A::b → C::d → E::f

## routes
GET /path: route_name

## commands
command:name — 3 word desc

## gotchas
- X does Y instead of Z — path/file.php
```

## Cleanup

After writing all enriched topic files:
1. DELETE `.projectbrain/brain-topics/*-prompt.md` files — they are single-use prompts, not needed after enrichment
2. DELETE `.projectbrain/brain-topics/.draft/` directory — drafts are replaced by enriched files
3. DELETE any enriched topic file that is empty, redundant, or too vague to be useful — bad topics pollute context more than no topics