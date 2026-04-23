## 2026-04-23 Session Start
- Plan: brain-routing-skills-hook
- Wave 1: Foundation (migration + types) — sequential
- Key: migration .project/ → .projectbrain/ is highest risk per Metis
- Convention: all skills use SkillDefinition interface from src/skills/types.ts
- Convention: YAML serialization follows stale.ts pattern (parseSimpleYaml/serializeYamlValue)

## Migration .project → .projectbrain complete
- install.ts has NO hardcoded .project refs — brainPath passed from callers
- output.ts had 5 hardcoded `.project/brain-topics/` strings (replaceAll worked cleanly)
- cli.ts had 5 identical `".project"` defaults (replaceAll worked)
- scan.ts had both a default param AND an ignore glob (needed 2 separate edits)
- `grep -v '.projectbrain'` is essential to avoid false negatives during verification
- 18 tests pass, build clean — no test changes needed

## Task 4: topic-index.ts created
- generateTopicIndex: derives defaultSkill from FRAMEWORK_SKILL_MAP keyword lookup, falls back to repo-map
- formatTopicIndexYaml/parseTopicIndexYaml: simple line-based YAML parser following stale.ts pattern
- writeTopicIndex/readTopicIndex: async fs wrappers with mkdir recursive + null on missing file
- 20 tests added (38 total), all passing, build clean

## freshness.ts created
- 6 exports: computeFreshness, updateFreshnessFromDiff, formatFreshnessYaml, parseFreshnessYaml, writeFreshness, readFreshness
- YAML parser: line.split(':') fails on ISO dates — use line.substring(line.indexOf(':') + 1) for top-level scalar fields
- stale.ts indent4 parser uses rest.join(':') which handles colons in values correctly
- 9 tests added (61 total), all passing, build clean

## agent-generator.ts complete
- Created src/agent-generator.ts: generateAgentDir() creates .agent/prompts/ (4 files) + .agent/cache/ (2 files)
- Exported AgentDirOptions interface for reuse
- Tests: 10 describe blocks covering file count, content validation, navigation commands, cache emptiness, absolute paths
- Pattern: makeBrainData() helper reused from output.test.ts convention
- Total: 100 tests passing (10 files), build clean

## Task: skills/runner.ts — skill registry + execution framework
- Map<string, SkillDefinition> registry (not array — skills keyed by name, no priority sorting needed)
- Pattern mirrors adapters/index.ts but simpler: register, get, list, clear, run
- clearSkills() uses Map.clear() vs adapters' array.length = 0
- createSkillContext auto-detects framework via findBestAdapter, builds minimal BrainData
- SkillContext.topic is Topic | undefined (not topicName string) — skeleton code was inaccurate
- Tests: 10 test files, 100 tests total (new file: tests/skills/runner.test.ts with 8 tests)
- Build + tests pass cleanly

## Task: skills/diff-only.ts — diff analysis skill
- parseDiff splits on `^diff --git ` header lines, extracts path from `b/` side
- File type detection: `new file mode` / `deleted file mode` flags, plus `/dev/null` src/dst heuristics
- mapFilesToTopics: prefix-matches file path against topic entry paths, falls back to 'general'
- Primary topic = topic with most matched files
- Coupling risk when files span >1 topic
- Large diff risk when total lines > 500
- vi.mock for readTopicIndex in tests — mock before import
- stringContaining is case-sensitive; use stringMatching(/pattern/i) for case-insensitive checks
- 13 tests added, build clean

## route-debug skill created
- SkillDefinition pattern: export const, inline config, async execute(ctx)
- Route matching: exact name → contains name → exact path → contains path → contains controller
- Files extraction: prefer route.file over route.controller (controller is FQCN, file is actual path)
- Fuzzy matching: simple character overlap scoring, threshold 0.4, suggest top 3
- Tests: 12 tests in tests/skills/route-debug.test.ts, all pass
- Register: export from src/skills/index.ts
- 12 tests pass, build clean (repo-map failures pre-existing)

## Task: skills/repo-map.ts created
- Exports: repoMapSkill (SkillDefinition), parseBrainMd (pure parser), setReadFileFn/resetReadFileFn (DI for testing)
- parseBrainMd: line-by-line state machine tracking inModules/inQuickFind/inTopics sections
- Bug fix: section termination (new ## header) must flush currentModule/currentTopic BEFORE nulling them
- Bug fix: "At a Glance" modules line is NOT inside ## Modules section — match globally, not gated by inModules
- ESM mocking: vi.spyOn on node:fs/promises fails in ESM — use dependency injection (setReadFileFn) instead
- Self-registration pattern: module-level registerSkill() + clearSkills() in beforeEach means re-register needed for runSkill tests
- 16 tests added (160 total pre-existing pass), build clean

## symfony-review skill created
- Pattern: SkillDefinition with config + async execute(ctx)
- File I/O: use fs/promises readFile with try/catch, add risk on failure
- ESM mocking: vi.mock('fs/promises') at top level, then vi.mocked(readFile) — NOT vi.spyOn (fails with ESM namespace)
- PHP detection: filter topic.files by .endsWith('.php')
- Regex patterns: class FooService, #[AsService], class FooType extends AbstractType, class FooRepository, class FooController
- Form risk: file path contains "Form" + class name ends with "Type" but doesn't extend AbstractType → risk
- getLineContaining helper: extract single line from offset for context-aware regex
- 18 tests (new file: tests/skills/symfony-review.test.ts), 159 total (11 pre-existing failures in repo-map/twig-inline-css unrelated)
- Build clean

## twig-inline-css skill created
- ESM module caching: `await import()` returns cached module — registerSkill in module body won't re-execute after clearSkills()
- Fix: import skill definition directly, call registerSkill(twigInlineCssSkill) manually in beforeEach
- Pattern: separate mode functions (modeAnalyze, modeGenerateCss, modeApply, modeDryRun) + switch in execute
- Temp files via mkdtempSync for integration tests — no fs mocking needed
- Regex `style\s*=\s*"([^"]*)"` needs new RegExp(source, 'g') per file to reset lastIndex
- 13 new tests (total 172), build clean
- index.ts exports: added `export { twigInlineCssSkill } from "./twig-inline-css.js"`

## Task: install.ts — agent dir + hook integration
- InstallOptions gained `withHook?: boolean` field
- cli.ts install command gained `--dir` and `--with-hook` options
- generateAgentDirectory() parses brain.md for framework (regex on "Generated:" line), fileCount, navigation, quickFind
- parseBrainMd from repo-map.ts only returns modules/quickFind/topics — no framework/routes/navigation
- Hook prompt: `withHook === true` → silent, `undefined` → prompt, `false` → skip
- vi.mock('node:readline/promises') needed for tests that trigger promptHook
- vi.clearAllMocks() in beforeEach essential when testing mock call args across tests
- Dynamic imports for agent-generator and hook follow existing cli.ts lazy-load pattern

## T11: scan/update/cli integration of topic-index, freshness, agent-generator

- `computeFreshness` takes only `Topic[]` (no projectDir) — contrary to task spec
- `ScanResult.freshnessEntries?: FreshnessEntry[]` added to carry freshness to CLI
- update.ts needs its own topic discovery via `fast-glob` (no `getAllFiles` helper there)
- CLI freshness badge: `[fresh]`, `[stale]`, `[dirty]` replaces `t.status.padEnd(12)` display
- topic-index.yaml, freshness.yaml, .agent/ all generated inside `if (topics.length > 0)` block
- Existing 185 tests untouched — no test changes needed for this integration
