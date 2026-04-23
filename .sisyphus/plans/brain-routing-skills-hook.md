# Brain: Routing, Skills & Pre-commit Hook

## TL;DR

> **Quick Summary**: Étendre le CLI Brain avec un système de routing hybride (TypeScript + markdown), 5 skills spécialisés, un pre-commit hook, la migration `.project/` → `.projectbrain/` + `.agent/`, et la génération de prompts agents.
> 
> **Deliverables**:
> - Migration du répertoire de sortie `.project/` → `.projectbrain/`
> - Nouveau répertoire `.agent/` généré dans le projet cible (prompts, skills, cache)
> - Module de routing déterministe (mots-clés → topic → skill)
> - 5 skills hybrides (TypeScript parsing + markdown templates)
> - Commande `brain skill` pour exécuter les skills
> - Commande `brain hook` pour installer un pre-commit hook
> - Auto-génération de topic-index.yaml et freshness.yaml
> - 4 fichiers prompts agents (system-base, context-policy, output-format, task-router)
> - Format de sortie standardisé (goal, topic, files, actions, risks, next)
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Task 1 (migration) → Task 2 (types) → Task 5 (router) + Task 6 (skill runner) → Tasks 8-12 (skills) → Task 16 (integration)

---

## Context

### Original Request
Étendre le CLI Brain avec un flux complet : classifier la demande → sélectionner topics → ajouter diff/fichiers ciblés → lancer le skill approprié. Ajouter un pre-commit hook pour maintenir brain à jour automatiquement. Les différences viennent de `git diff`.

### Interview Summary
**Key Discussions**:
- Skills: approche hybride — TypeScript CLI pour parsing mécanique + markdown pour instructions agents IDE
- 5 skills: repo-map, diff-only, symfony-review, twig-inline-css, route-debug
- Pre-commit: intégré à `brain install` + commande standalone `brain hook`
- Topic index: auto-généré par `brain scan`
- Répertoires: migration `.project/` → `.projectbrain/` + nouveau `.agent/` dans projet cible
- Prompts: inclus dans MVP (system-base, context-policy, output-format, task-router)
- Tests: TDD avec Vitest
- Migration: breaking pur, pas de backward compat

**Research Findings**:
- Codebase existant: 11 fichiers TypeScript (cli, detect, discover, enrich, install, output, scan, stale, types, update, adapters)
- Déjà existant: topic clustering (discover.ts), stale detection (stale.ts), .meta.yaml, TopicStatus enum, hash-based change detection
- Adapters: Symfony, Laravel, Next.js, Generic
- Tests: 18 tests Vitest, 3 fichiers de test (adapters, discover, output)
- Dépendances: commander, fast-glob, TypeScript, Vitest

### Metis Review
**Identified Gaps** (addressed):
- Migration est le changement le plus risqué — touche toutes les commandes et références
- Codebase a déjà ~60% du nécessaire (topics, stale, freshness via .meta.yaml)
- Le nouveau travail est principalement: `brain skill`, `brain hook`, `.agent/` directory, 5 skills
- Recommandation: verrouiller la migration d'abord, puis construire sur des bases stables

---

## Work Objectives

### Core Objective
Transformer Brain d'un générateur de contexte statique en un système de gestion de contexte actif avec routing, skills exécutables, et maintenance automatique via pre-commit.

### Concrete Deliverables
- `.projectbrain/` comme nouveau répertoire de sortie (remplace `.project/`)
- `.agent/` avec prompts/, skills/, cache/ dans le projet cible
- `src/router.ts` — module de routing déterministe
- `src/skills/runner.ts` — framework d'exécution des skills
- `src/skills/repo-map.ts`, `src/skills/diff-only.ts`, `src/skills/symfony-review.ts`, `src/skills/twig-inline-css.ts`, `src/skills/route-debug.ts`
- `src/hook.ts` — gestion du pre-commit hook
- `src/topic-index.ts` — génération du topic-index.yaml
- `src/freshness.ts` — module de suivi freshness étendu
- `src/agent-generator.ts` — génération du répertoire .agent/
- Mise à jour de `src/install.ts` pour gérer .agent/ + hook

### Definition of Done
- [ ] `brain scan` génère dans `.projectbrain/` avec topic-index.yaml
- [ ] `brain skill <name>` exécute un skill TypeScript et produit un résultat structuré
- [ ] `brain hook` installe un pre-commit qui marque les topics dirty
- [ ] `brain install <ide>` installe la config + optionnellement le hook
- [ ] `.agent/` est généré avec tous les prompts et skills markdown
- [ ] `npm test` passe (tests existants + nouveaux)
- [ ] `npm run build` compile sans erreur

### Must Have
- Migration complète `.project/` → `.projectbrain/`
- 5 skills TypeScript fonctionnels (au moins sur les fixtures existantes)
- Pre-commit hook fonctionnel
- topic-index.yaml auto-généré avec routing déterministe
- 4 prompts agents générés dans .agent/prompts/
- Format de sortie standardisé pour les skills
- Tests TDD pour chaque nouveau module

### Must NOT Have (Guardrails)
- Pas d'appels LLM dans le CLI (skills = parsing local uniquement)
- Pas de rewrite des adapters existants (Symfony, Laravel, Next.js, Generic)
- Pas de changement du système de clustering de topics (discover.ts)
- Pas de backward compat avec `.project/`
- Pas de dépendance externe supplémentaire ( garder commander + fast-glob uniquement)
- Pas de sur-abstraction — un skill = un fichier plat, pas de framework complexe
- Pas de modification du format des topics enrichis existant
- Pas de cache/persist complexe — fichiers plats YAML/MD uniquement

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (Vitest, 18 tests existants)
- **Automated tests**: TDD — chaque module écrit tests d'abord
- **Framework**: Vitest

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **CLI commands**: Use Bash — run brain commands, assert exit code + output
- **File generation**: Use Bash — verify file exists, content matches expected patterns
- **TypeScript**: Use Bash — `npm run build` + `npm test` pass
- **YAML output**: Use Bash — parse YAML, verify structure

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — migration + types, SEQUENTIAL):
├── Task 1: Migration .project/ → .projectbrain/ [quick]
└── Task 2: Nouveaux types + interfaces [quick]

Wave 2 (Core modules — MAX PARALLEL):
├── Task 3: topic-index.yaml generator (depends: 2) [quick]
├── Task 4: freshness.yaml module (depends: 2) [quick]
├── Task 5: Router module (depends: 2, 3) [deep]
├── Task 6: Skill runner framework (depends: 2) [unspecified-high]
├── Task 7: Pre-commit hook command (depends: 4) [quick]
├── Task 8: Agent directory + prompt generators (depends: 2) [unspecified-high]

Wave 3 (Skills — MAX PARALLEL):
├── Task 9:  repo-map skill (depends: 6) [quick]
├── Task 10: diff-only skill (depends: 6) [quick]
├── Task 11: symfony-review skill (depends: 6) [unspecified-high]
├── Task 12: twig-inline-css skill (depends: 6) [unspecified-high]
├── Task 13: route-debug skill (depends: 6) [unspecified-high]

Wave 4 (Integration):
├── Task 14: CLI integration — brain skill + brain hook commands (depends: 5-13) [deep]
├── Task 15: Update brain install for .agent/ + hook (depends: 8, 14) [quick]
├── Task 16: Update brain scan for topic-index + freshness + .agent/ (depends: 3, 4, 8, 14) [unspecified-high]

Wave FINAL (After ALL tasks — 4 parallel reviews):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
→ Present results → Get explicit user okay

Critical Path: T1 → T2 → T5,T6 → T11 → T14 → T16
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 5 (Wave 2)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | - | 2 | 1 |
| 2 | 1 | 3,4,5,6,7,8 | 1 |
| 3 | 2 | 5,16 | 2 |
| 4 | 2 | 7,16 | 2 |
| 5 | 2,3 | 14 | 2 |
| 6 | 2 | 9,10,11,12,13 | 2 |
| 7 | 4 | 14 | 2 |
| 8 | 2 | 15,16 | 2 |
| 9 | 6 | 14 | 3 |
| 10 | 6 | 14 | 3 |
| 11 | 6 | 14 | 3 |
| 12 | 6 | 14 | 3 |
| 13 | 6 | 14 | 3 |
| 14 | 5,6,7,9-13 | 15,16 | 4 |
| 15 | 8,14 | F1-F4 | 4 |
| 16 | 3,4,8,14 | F1-F4 | 4 |

### Agent Dispatch Summary

- **Wave 1**: 2 — T1 `quick`, T2 `quick`
- **Wave 2**: 6 — T3 `quick`, T4 `quick`, T5 `deep`, T6 `unspecified-high`, T7 `quick`, T8 `unspecified-high`
- **Wave 3**: 5 — T9-T10 `quick`, T11-T13 `unspecified-high`
- **Wave 4**: 3 — T14 `deep`, T15 `quick`, T16 `unspecified-high`
- **FINAL**: 4 — F1 `oracle`, F2 `unspecified-high`, F3 `unspecified-high`, F4 `deep`

---

## TODOs

- [x] 1. Migration `.project/` → `.projectbrain/`

  **What to do**:
  - Changer le `outputDir` par défaut de `.project` à `.projectbrain` dans toutes les commandes CLI (`scan`, `update`, `enrich`, `prompt`, `install`)
  - Mettre à jour toutes les références string `.project/` dans `output.ts` (ex: lignes 448, 459, 521, 522, 670)
  - Mettre à jour `install.ts` : tous les IDE configs référencent `.project/brain.md` → `.projectbrain/brain.md`
  - Mettre à jour `scan.ts` : `getAllFiles` ignore `.project/**` → `.projectbrain/**`
  - Mettre à jour `brain.md` format output : référence `.projectbrain/brain-topics/` au lieu de `.project/brain-topics/`
  - Exécuter les tests existants — les 18 tests doivent passer après migration
  - Exécuter `brain scan --dir tests/fixtures/symfony` pour vérifier que `.projectbrain/` est créé

  **Must NOT do**:
  - Ne pas ajouter de nouvelle fonctionnalité — migration uniquement
  - Ne pas modifier les fixtures de test
  - Ne pas ajouter de backward compat

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO — bloque tout le reste
  - **Parallel Group**: Wave 1 (sequential, before Task 2)
  - **Blocks**: Task 2
  - **Blocked By**: None

  **References**:
  - `src/cli.ts:199,276,308,332,353` — options `outputDir: ".project"` par défaut
  - `src/scan.ts:79,113` — ignore `.project/**`, default outputDir
  - `src/update.ts:57` — default outputDir
  - `src/output.ts:448,459,521,522,670` — string references to `.project/brain-topics/`
  - `src/install.ts:1269-1379` — IDE configs with brainPath references
  - `src/enrich.ts:1041` — default outputDir
  - `tests/` — existing 18 tests to verify after migration

  **Acceptance Criteria**:
  - [ ] `grep -r '\.project/' src/ --include='*.ts' | grep -v '\.projectbrain/' | grep -v node_modules` returns 0 matches
  - [ ] `npm test` passes (all 18 existing tests)
  - [ ] `npm run build` compiles
  - [ ] `brain scan --dir tests/fixtures/symfony` creates `tests/fixtures/symfony/.projectbrain/brain.md`

  **QA Scenarios**:

  ```
  Scenario: Migration complète - plus de référence à .project/
    Tool: Bash
    Preconditions: codebase à jour, dépendances installées
    Steps:
      1. grep -r '"\.project"' src/ --include='*.ts' — vérifie 0 match (sauf dans commentaires)
      2. grep -r '\.project/' src/ --include='*.ts' | grep -v projectbrain | grep -v node_modules — vérifie 0 match
      3. npm run build — compile sans erreur
      4. npm test — 18 tests passent
    Expected Result: 0 référence .project/ (non projectbrain), build OK, tests OK
    Failure Indicators: grep trouve des matches, build échoue, tests échouent
    Evidence: .sisyphus/evidence/task-1-migration.txt

  Scenario: Scan génère dans .projectbrain/
    Tool: Bash
    Preconditions: brain CLI buildé
    Steps:
      1. cd tests/fixtures/symfony && rm -rf .projectbrain .project
      2. npx tsx ../../../src/cli.ts scan
      3. ls -la .projectbrain/brain.md
      4. ls -la .projectbrain/brain-prompt.md
      5. test ! -d .project
    Expected Result: .projectbrain/brain.md existe, .project/ n'existe pas
    Failure Indicators: .project/ existe encore, ou .projectbrain/ manquant
    Evidence: .sisyphus/evidence/task-1-scan-output.txt
  ```

  **Commit**: YES
  - Message: `refactor!: migrate .project/ to .projectbrain/`
  - Files: `src/**/*.ts`
  - Pre-commit: `npm test && npm run build`

- [x] 2. Nouveaux types et interfaces

  **What to do**:
  - Ajouter dans `src/types.ts` les types pour le routing et les skills:
    ```typescript
    export interface TopicIndexEntry {
      name: string;
      keywords: string[];
      paths: string[];
      defaultSkill: string;
    }

    export interface TopicIndex {
      topics: Record<string, TopicIndexEntry>;
    }

    export type FreshnessStatus = 'fresh' | 'stale' | 'dirty';

    export interface FreshnessEntry {
      topic: string;
      status: FreshnessStatus;
      lastCheck: string;
      changedFiles?: string[];
    }

    export interface FreshnessData {
      entries: Record<string, FreshnessEntry>;
      brainMdStatus: FreshnessStatus;
      lastUpdated: string;
    }

    export interface SkillConfig {
      name: string;
      description: string;
      inputType: 'topic' | 'diff' | 'error' | 'query';
      requiredTopics: string[];  // which topic types this skill applies to
    }

    export interface SkillResult {
      goal: string;
      topic: string;
      files: string[];
      actions: string[];
      risks: string[];
      next: string;
    }

    export interface RouterEntry {
      keywords: string[];
      paths: string[];
      topic: string;
      skill: string;
      score: number;
    }
    ```
  - Écrire les tests TDD d'abord pour chaque type (validation de structure)
  - Créer `src/skills/types.ts` pour les types spécifiques aux skills:
    ```typescript
    export interface SkillContext {
      projectDir: string;
      topic?: Topic;
      diff?: string;
      framework: string;
      brainData: BrainData;
    }

    export interface SkillDefinition {
      name: string;
      description: string;
      config: SkillConfig;
      execute(ctx: SkillContext): Promise<SkillResult>;
    }
    ```

  **Must NOT do**:
  - Ne pas modifier les types existants (Module, Route, Command, etc.)
  - Ne pas créer de fichiers d'implémentation — types uniquement

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 1)
  - **Parallel Group**: Wave 1 (after Task 1)
  - **Blocks**: Tasks 3, 4, 5, 6, 7, 8
  - **Blocked By**: Task 1

  **References**:
  - `src/types.ts` — types existants (Module, Route, Command, Topic, TopicMeta, TopicStatus)
  - `src/stale.ts` — TopicStatus enum, hashContent, hashFile — pattern de types freshness

  **Acceptance Criteria**:
  - [ ] `npm run build` compile avec les nouveaux types
  - [ ] Tests TDD pour la validation des types passent
  - [ ] `src/skills/types.ts` existe et exporte SkillContext, SkillDefinition

  **QA Scenarios**:

  ```
  Scenario: Nouveaux types compilent correctement
    Tool: Bash
    Steps:
      1. npm run build — compile sans erreur TypeScript
      2. grep -c 'TopicIndexEntry\|FreshnessStatus\|SkillConfig\|SkillResult\|RouterEntry' dist/types.js — vérifie présence
      3. grep -c 'SkillContext\|SkillDefinition' dist/skills/types.js — vérifie présence
    Expected Result: build OK, tous les nouveaux types présents dans dist/
    Evidence: .sisyphus/evidence/task-2-types-compile.txt

  Scenario: Tests TDD passent
    Tool: Bash
    Steps:
      1. npm test — tous les tests passent (existants + nouveaux)
      2. grep -l 'TopicIndexEntry\|SkillResult\|FreshnessStatus' tests/*.test.ts — vérifie fichiers de test
    Expected Result: 0 failures
    Evidence: .sisyphus/evidence/task-2-types-tests.txt
  ```

  **Commit**: YES (groups with Task 1 if same wave)
  - Message: `feat(types): add routing, skill, freshness, topic-index types`
  - Files: `src/types.ts`, `src/skills/types.ts`, `tests/types.test.ts`
  - Pre-commit: `npm test && npm run build`

- [x] 3. topic-index.yaml generator

  **What to do**:
  - Créer `src/topic-index.ts` avec:
    - `generateTopicIndex(topics: Topic[], framework: string): TopicIndex` — génère l'index à partir des topics détectés
    - `writeTopicIndex(outputDir: string, index: TopicIndex): Promise<string>` — écrit le YAML
    - `readTopicIndex(outputDir: string): Promise<TopicIndex | null>` — lit un index existant
    - Logique de mapping: topic.keywords → entry.keywords, topic.files → entry.paths (raccourcis aux répertoires parents)
    - `defaultSkill` déterminé par framework + keywords (ex: admin → symfony-review, twig/css → twig-inline-css)
  - La structure YAML doit matcher:
    ```yaml
    topics:
      admin:
        keywords: [admin, sonata, user, role]
        paths: [src/Admin, config/packages/sonata_admin.yaml]
        default_skill: symfony-review
      activity:
        keywords: [activity, audit, logger, subscriber]
        paths: [src/Service/UserActivityLogger.php, src/EventSubscriber]
        default_skill: symfony-review
    ```
  - TDD: écrire tests d'abord pour `generateTopicIndex` avec des topics de test

  **Must NOT do**:
  - Ne pas modifier `discover.ts` — les topics viennent tels quels
  - Ne pas appeler de LLM
  - Ne pas hardcoder les topics — le mapping est dynamique basé sur keywords

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 4, 6, 7, 8)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 5, Task 16
  - **Blocked By**: Task 2

  **References**:
  - `src/types.ts` — Topic type (name, keywords, files, routes, commands)
  - `src/discover.ts:875-980` — discoverTopics() qui produit les topics
  - `src/stale.ts:104-153` — serializeMetaYaml() comme pattern d'écriture YAML
  - `src/stale.ts:23-80` — parseSimpleYaml() comme pattern de lecture YAML

  **Acceptance Criteria**:
  - [ ] `src/topic-index.ts` existe et exporte generateTopicIndex, writeTopicIndex, readTopicIndex
  - [ ] Tests unitaires passent pour generateTopicIndex avec mock topics
  - [ ] YAML output valide et lisible par readTopicIndex (round-trip)

  **QA Scenarios**:

  ```
  Scenario: generateTopicIndex produit un index valide
    Tool: Bash
    Steps:
      1. npm test -- --grep "topic-index" — tests passent
      2. node -e "import {generateTopicIndex} from './src/topic-index.js'; console.log(JSON.stringify(generateTopicIndex([{name:'admin',keywords:['admin','sonata'],files:['src/Admin/Dashboard.php'],routes:[],commands:[],status:'new'}], 'symfony'), null, 2))"
    Expected Result: JSON avec topics.admin.keywords = ['admin','sonata'], default_skill défini
    Evidence: .sisyphus/evidence/task-3-topic-index.txt

  Scenario: Round-trip YAML write/read
    Tool: Bash
    Steps:
      1. npm test — test de round-trip writeTopicIndex → readTopicIndex passe
      2. Vérifie que le YAML produit est valide (pas de parsing errors)
    Expected Result: readTopicIndex retourne le même objet que celui écrit
    Evidence: .sisyphus/evidence/task-3-roundtrip.txt
  ```

  **Commit**: YES
  - Message: `feat(topic-index): auto-generate topic-index.yaml from discovered topics`
  - Files: `src/topic-index.ts`, `tests/topic-index.test.ts`
  - Pre-commit: `npm test`

- [x] 4. freshness.yaml module

  **What to do**:
  - Créer `src/freshness.ts` avec:
    - `computeFreshness(topics: Topic[], projectDir: string): Promise<FreshnessData>` — calcule le statut freshness de chaque topic
    - `updateFreshnessFromDiff(stagedFiles: string[], freshness: FreshnessData, topicIndex: TopicIndex): FreshnessData` — met à jour freshness à partir de `git diff --cached`
    - `writeFreshness(outputDir: string, data: FreshnessData): Promise<string>` — écrit freshness.yaml
    - `readFreshness(outputDir: string): Promise<FreshnessData | null>` — lit freshness.yaml
  - Logique: pour chaque fichier stagé, trouver le topic correspondant via topic-index, marquer `dirty`
  - Si brain.md a été modifié → `brainMdStatus: 'dirty'`
  - Étendre les types existants de `stale.ts` (TopicStatus, TopicStaleReason) — ne pas dupliquer
  - TDD: tester updateFreshnessFromDiff avec des fichiers de test

  **Must NOT do**:
  - Ne pas dupliquer la logique de stale.ts — freshness est un complément, pas un remplacement
  - Ne pas exécuter `git diff` directement dans ce module — les fichiers changés sont passés en paramètre

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 3, 5, 6, 8)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 7, Task 16
  - **Blocked By**: Task 2

  **References**:
  - `src/types.ts` — FreshnessStatus, FreshnessEntry, FreshnessData (ajoutés dans Task 2)
  - `src/stale.ts:185-253` — detectStaleTopics() comme pattern de détection de changements
  - `src/stale.ts:8-16` — hashContent, hashFile pour le hash-based change detection

  **Acceptance Criteria**:
  - [ ] `src/freshness.ts` existe et exporte les 4 fonctions
  - [ ] Tests unitaires: updateFreshnessFromDiff marque les bons topics dirty
  - [ ] YAML round-trip fonctionne

  **QA Scenarios**:

  ```
  Scenario: updateFreshnessFromDiff marque les bons topics
    Tool: Bash
    Steps:
      1. npm test -- --grep "freshness" — tests passent
      2. Vérifier que src/Admin/Dashboard.php dans staged files → admin topic marqué dirty
      3. Vérifier que README.md dans staged files → aucun topic marqué dirty
    Expected Result: Tests passent, mapping correct fichier→topic
    Evidence: .sisyphus/evidence/task-4-freshness.txt

  Scenario: YAML round-trip
    Tool: Bash
    Steps:
      1. npm test — test writeFreshness → readFreshness round-trip passe
    Expected Result: readFreshness retourne les mêmes données
    Evidence: .sisyphus/evidence/task-4-freshness-roundtrip.txt
  ```

  **Commit**: YES
  - Message: `feat(freshness): add freshness.yaml tracking module`
  - Files: `src/freshness.ts`, `tests/freshness.test.ts`
  - Pre-commit: `npm test`

- [x] 5. Router module

  **What to do**:
  - Créer `src/router.ts` avec:
    - `routeTask(input: string, topicIndex: TopicIndex, framework: string): RouterEntry | null` — routing déterministe
    - Table de correspondance built-in pour les frameworks supportés (Symfony, Laravel, Next.js)
    - Logique:
      1. Extraire mots-clés de l'input (même normalizeTerm que discover.ts)
      2. Matcher contre topicIndex keywords
      3. Matcher contre topicIndex paths
      4. Calculer score = keyword_matches * 0.4 + path_matches * 0.6
      5. Si score > 0.7 → retourner le meilleur match
      6. Si score < 0.7 → retourner null (fallback LLM côté agent)
    - Boost: si l'input contient "diff" ou "git diff" → boost skill "diff-only"
    - Framework-specific defaults:
      - Symfony: admin→symfony-review, twig/css→twig-inline-css, route→route-debug
      - Laravel: controller→symfony-review (réutilise), route→route-debug
      - Next.js: page→repo-map, api→repo-map
      - Generic: tout→repo-map
  - TDD: écrire tests d'abord pour chaque cas de routing

  **Must NOT do**:
  - Ne pas appeler de LLM dans le router — déterministe uniquement
  - Ne pas modifier discover.ts

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []
    - Reason: logique de routing avec scoring, nécessite réflexion sur les cas limites

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 4, 6, 7, 8)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 14
  - **Blocked By**: Task 2, Task 3

  **References**:
  - `src/types.ts` — RouterEntry type
  - `src/discover.ts:584-618` — normalizeTerm(), splitTerms() — réutiliser cette logique
  - `src/discover.ts:560-558` — EXPANSIONS map
  - `src/adapters/symfony.ts`, `src/adapters/laravel.ts`, `src/adapters/nextjs.ts` — patterns de détection par framework

  **Acceptance Criteria**:
  - [ ] `src/router.ts` existe et exporte routeTask
  - [ ] Tests: "admin sonata user" → { topic: "admin", skill: "symfony-review" }
  - [ ] Tests: "twig inline css template" → { topic: "asset", skill: "twig-inline-css" }
  - [ ] Tests: "route 404 controller" → { topic: "security", skill: "route-debug" }
  - [ ] Tests: input ambigu → null (fallback)
  - [ ] Tests: "git diff" dans input → boost diff-only

  **QA Scenarios**:

  ```
  Scenario: Routing déterministe correct
    Tool: Bash
    Steps:
      1. npm test -- --grep "router" — tous les tests de routing passent
      2. Vérifier cas nominaux: admin→symfony-review, twig→twig-inline-css, route→route-debug
      3. Vérifier cas fallback: input vague retourne null
    Expected Result: Tous les cas de routing passent
    Evidence: .sisyphus/evidence/task-5-router.txt

  Scenario: Diff boost
    Tool: Bash
    Steps:
      1. npm test — vérifie que "check this git diff for admin" boost diff-only + admin
    Expected Result: diff-only est dans les résultats, admin topic détecté
    Evidence: .sisyphus/evidence/task-5-router-diff.txt
  ```

  **Commit**: YES
  - Message: `feat(router): add deterministic task router with keyword matching`
  - Files: `src/router.ts`, `tests/router.test.ts`
  - Pre-commit: `npm test`

- [x] 6. Skill runner framework

  **What to do**:
  - Créer `src/skills/runner.ts` avec:
    - Interface `SkillDefinition` (déjà dans types.ts): name, description, config, execute(ctx)
    - `registerSkill(skill: SkillDefinition): void` — registre des skills
    - `runSkill(name: string, ctx: SkillContext): Promise<SkillResult>` — exécute un skill
    - `listSkills(): SkillConfig[]` — liste les skills disponibles
    - `createSkillContext(options: { projectDir: string; topicName?: string; diff?: string }): Promise<SkillContext>` — factory
  - Créer `src/skills/index.ts` qui importe et enregistre tous les skills
  - Validation: vérifier que le skill demandé existe avant exécution
  - Error handling: skill non trouvé → erreur claire, skill qui échoue → SkillResult avec risks[]
  - TDD: tester registerSkill, runSkill avec un mock skill

  **Must NOT do**:
  - Ne pas implémenter de skills concrets — framework uniquement
  - Ne pas ajouter de dépendance externe
  - Ne pas créer de système de plugin complexe — simple registre

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 3, 4, 5, 7, 8)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 9, 10, 11, 12, 13
  - **Blocked By**: Task 2

  **References**:
  - `src/skills/types.ts` — SkillContext, SkillDefinition (ajouté dans Task 2)
  - `src/types.ts` — SkillConfig, SkillResult
  - `src/adapters/index.ts:1-26` — pattern de registre (registerAdapter, getAdapters) — copier ce pattern

  **Acceptance Criteria**:
  - [ ] `src/skills/runner.ts` existe et exporte registerSkill, runSkill, listSkills, createSkillContext
  - [ ] `src/skills/index.ts` existe
  - [ ] Tests: register + run d'un mock skill produit un SkillResult
  - [ ] Tests: runSkill avec nom invalide → erreur claire

  **QA Scenarios**:

  ```
  Scenario: Framework de skills fonctionne
    Tool: Bash
    Steps:
      1. npm test -- --grep "skill runner" — tests passent
      2. Vérifier registerSkill + runSkill + listSkills
    Expected Result: Mock skill exécuté, SkillResult retourné, listSkills retourne les skills enregistrés
    Evidence: .sisyphus/evidence/task-6-skill-runner.txt

  Scenario: Error handling
    Tool: Bash
    Steps:
      1. npm test — vérifie erreur pour skill non trouvé
    Expected Result: Message d'erreur clair "Skill 'unknown' not found. Available: ..."
    Evidence: .sisyphus/evidence/task-6-skill-error.txt
  ```

  **Commit**: YES
  - Message: `feat(skills): add skill runner framework with registry`
  - Files: `src/skills/runner.ts`, `src/skills/index.ts`, `tests/skills/runner.test.ts`
  - Pre-commit: `npm test`

- [x] 7. Pre-commit hook command

  **What to do**:
  - Créer `src/hook.ts` avec:
    - `installHook(projectDir: string): Promise<void>` — installe `.git/hooks/pre-commit`
    - `uninstallHook(projectDir: string): Promise<void>` — supprime le hook
    - `runPreCheck(projectDir: string): Promise<FreshnessData>` — logique exécutée par le hook
  - Template du hook pre-commit (script shell généré):
    ```bash
    #!/bin/sh
    # Brain pre-commit hook - marks dirty topics
    brain _hook-check
    ```
  - Logique `runPreCheck`:
    1. Lire `git diff --cached --name-only`
    2. Charger topic-index.yaml
    3. Appeler `updateFreshnessFromDiff`
    4. Écrire freshness.yaml
    5. Afficher les topics marqués dirty (informatif, pas bloquant en mode soft)
  - TDD: tester avec des fichiers stagés mock

  **Must NOT do**:
  - Ne pas appeler de LLM dans le hook
  - Ne pas bloquer le commit — mode informatif uniquement
  - Ne pas régénérer brain.md automatiquement — juste marquer dirty

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 3, 5, 6, 8)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 14
  - **Blocked By**: Task 2, Task 4

  **References**:
  - `src/freshness.ts` — updateFreshnessFromDiff (Task 4)
  - `src/types.ts` — FreshnessData, FreshnessEntry
  - `src/cli.ts:186-270` — pattern de commande CLI avec Commander

  **Acceptance Criteria**:
  - [ ] `src/hook.ts` existe et exporte installHook, uninstallHook, runPreCheck
  - [ ] Tests: runPreCheck avec fichiers mock marque les bons topics dirty
  - [ ] Tests: installHook crée `.git/hooks/pre-commit` exécutable

  **QA Scenarios**:

  ```
  Scenario: Hook installation
    Tool: Bash
    Steps:
      1. npm test — tests de hook passent
      2. cd tests/fixtures/symfony && npx tsx ../../../src/cli.ts hook
      3. cat .git/hooks/pre-commit — vérifie contenu
      4. test -x .git/hooks/pre-commit — vérifie exécutable
    Expected Result: pre-commit hook installé et exécutable
    Failure Indicators: fichier non créé, non exécutable
    Evidence: .sisyphus/evidence/task-7-hook-install.txt

  Scenario: Hook check marque dirty topics
    Tool: Bash
    Steps:
      1. npm test — test runPreCheck avec fichiers stagés mock
      2. Vérifie admin topic marqué dirty quand src/Admin/ est stagé
      3. Vérifie aucun topic dirty quand seul README.md est stagé
    Expected Result: Topics correctement marqués dirty
    Evidence: .sisyphus/evidence/task-7-hook-check.txt
  ```

  **Commit**: YES
  - Message: `feat(hook): add pre-commit hook for freshness tracking`
  - Files: `src/hook.ts`, `tests/hook.test.ts`
  - Pre-commit: `npm test`

- [x] 8. Agent directory + prompt generators

  **What to do**:
  - Créer `src/agent-generator.ts` avec:
    - `generateAgentDir(projectDir: string, framework: string, brainData: BrainData): Promise<string[]>` — génère tout `.agent/`
  - Templates markdown générés:
    - `.agent/prompts/system-base.md` — règles stables de l'assistant (ordre de chargement, format de sortie, limites de contexte)
    - `.agent/prompts/context-policy.md` — budget de contexte (1 topic par défaut, 2 max, max 3 fichiers complets)
    - `.agent/prompts/output-format.md` — format standardisé (goal, topic, files, actions, risks, next)
    - `.agent/prompts/task-router.md` — description du routeur + comment l'utiliser
  - `.agent/cache/` — créer le répertoire vide (ou avec last-topic.txt vide)
  - Templates doivent inclure des placeholders dynamiques: `{framework}`, `{brainPath}`, `{topicsList}`
  - TDD: tester que generateAgentDir crée tous les fichiers attendus

  **Must NOT do**:
  - Ne pas générer les skills markdown ici — c'est séparé (générés lors de l'install)
  - Ne pas hardcoder les chemins de topics — utiliser les données dynamiques

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 3, 4, 5, 6, 7)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 15, 16
  - **Blocked By**: Task 2

  **References**:
  - `src/install.ts:1269-1379` — IDE configs comme pattern de génération de contenu template
  - `src/types.ts` — BrainData, conventions, quickFind
  - `src/output.ts:18-172` — formatBrainMd() comme pattern de génération markdown structuré

  **Acceptance Criteria**:
  - [ ] `src/agent-generator.ts` existe et exporte generateAgentDir
  - [ ] Tests: generateAgentDir crée 4 fichiers dans .agent/prompts/
  - [ ] Tests: chaque fichier contient les placeholders résolus ({framework} remplacé)
  - [ ] Tests: .agent/cache/ directory exists

  **QA Scenarios**:

  ```
  Scenario: Agent directory generation complète
    Tool: Bash
    Steps:
      1. npm test — tests passent
      2. Vérifier que 4 fichiers sont créés: system-base.md, context-policy.md, output-format.md, task-router.md
      3. Vérifier que {framework} est remplacé par la valeur réelle
      4. Vérifier que .agent/cache/ existe
    Expected Result: Tous les fichiers et répertoires créés
    Evidence: .sisyphus/evidence/task-8-agent-dir.txt

  Scenario: Templates contiennent les sections attendues
    Tool: Bash
    Steps:
      1. npm test — vérifie contenu de chaque template
      2. system-base.md contient "Read .projectbrain/brain.md"
      3. context-policy.md contient "1 topic" et "2 max"
      4. output-format.md contient "goal", "topic", "files", "actions", "risks", "next"
    Expected Result: Chaque template a les sections minimales
    Evidence: .sisyphus/evidence/task-8-templates.txt
  ```

  **Commit**: YES
  - Message: `feat(agent): add .agent/ directory generation with prompt templates`
  - Files: `src/agent-generator.ts`, `tests/agent-generator.test.ts`
  - Pre-commit: `npm test`

- [x] 9. Skill: repo-map

  **What to do**:
  - Créer `src/skills/repo-map.ts` implémentant SkillDefinition:
    - `execute(ctx: SkillContext): Promise<SkillResult>`
    - Lit brain.md du projet cible
    - Parse les sections: modules, routes, topics
    - Retourne une vue structurée des zones utiles du repo
    - Output: SkillResult avec:
      - goal: "Localize repo zones from brain.md"
      - topic: "global" ou le topic demandé
      - files: liste des fichiers clés du topic
      - actions: ["Read brain.md", "Check topic-index.yaml", "Review module structure"]
      - risks: risques identifiés (modules sans routes, topics sans fichiers)
      - next: action minimale suivante
  - Générer le markdown template `.agent/skills/repo-map.md` (instructions pour l'agent IDE)
  - TDD

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 10, 11, 12, 13)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 14
  - **Blocked By**: Task 6

  **References**:
  - `src/skills/types.ts` — SkillDefinition, SkillContext, SkillResult
  - `src/types.ts` — BrainData, Module, Topic
  - `src/scan.ts:112-226` — scanProject() comme pattern d'extraction de données

  **Acceptance Criteria**:
  - [ ] `src/skills/repo-map.ts` existe et exporte un SkillDefinition
  - [ ] Tests: execute retourne un SkillResult valide
  - [ ] `.agent/skills/repo-map.md` template existe

  **QA Scenarios**:

  ```
  Scenario: repo-map retourne une vue structurée
    Tool: Bash
    Steps:
      1. npm test -- --grep "repo-map"
      2. Vérifier SkillResult avec goal, topic, files non vides
    Expected Result: SkillResult valide avec les sections du brain parsées
    Evidence: .sisyphus/evidence/task-9-repo-map.txt
  ```

  **Commit**: YES
  - Message: `feat(skill): add repo-map skill`
  - Files: `src/skills/repo-map.ts`, `tests/skills/repo-map.test.ts`
  - Pre-commit: `npm test`

- [x] 10. Skill: diff-only

  **What to do**:
  - Créer `src/skills/diff-only.ts` implémentant SkillDefinition:
    - Prend un diff (string) en entrée via SkillContext.diff
    - Parse le diff: fichiers modifiés, ajoutés, supprimés
    - Mappe les fichiers aux topics via topic-index
    - Retourne SkillResult avec:
      - files: fichiers du diff uniquement (pas tout le repo)
      - actions: analyse ciblée par fichier
      - risks: fichiers qui touchent plusieurs topics (coupling)
  - Pas de diff fourni → erreur SkillResult avec message "No diff provided"
  - Générer `.agent/skills/diff-only.md`
  - TDD

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 9, 11, 12, 13)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 14
  - **Blocked By**: Task 6

  **References**:
  - `src/skills/types.ts` — SkillContext.diff
  - `src/topic-index.ts` — readTopicIndex pour mapper fichiers→topics

  **Acceptance Criteria**:
  - [ ] `src/skills/diff-only.ts` existe
  - [ ] Tests: diff avec fichiers admin → topic admin dans le résultat
  - [ ] Tests: diff vide → erreur claire

  **QA Scenarios**:

  ```
  Scenario: diff-only analyse ciblée
    Tool: Bash
    Steps:
      1. npm test -- --grep "diff-only"
      2. Diff mock avec "src/Admin/Dashboard.php" → topic admin détecté
    Expected Result: SkillResult avec files = fichiers du diff, topic = admin
    Evidence: .sisyphus/evidence/task-10-diff-only.txt
  ```

  **Commit**: YES
  - Message: `feat(skill): add diff-only skill`
  - Files: `src/skills/diff-only.ts`, `tests/skills/diff-only.test.ts`
  - Pre-commit: `npm test`

- [x] 11. Skill: symfony-review

  **What to do**:
  - Créer `src/skills/symfony-review.ts` implémentant SkillDefinition:
    - Prend un topic en entrée via SkillContext.topic
    - Pour chaque fichier PHP du topic:
      - Extrait les services définis (regex: service_name: class, ou #[Autoconfigure])
      - Extrait les définitions de formulaire (regex: class.*Type extends AbstractType)
      - Extrait les repository methods (regex: public function.*Repository)
      - Vérifie les conventions Symfony basiques (naming, structure)
    - Retourne SkillResult avec:
      - files: fichiers analysés
      - actions: violations de conventions trouvées
      - risks: anti-patterns détectés
  - Framework check: ne s'active que si framework === 'symfony' ou 'laravel'
  - Générer `.agent/skills/symfony-review.md` avec instructions pour l'agent IDE
  - TDD: tester avec les fixtures Symfony existantes dans `tests/fixtures/symfony/`

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 9, 10, 12, 13)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 14
  - **Blocked By**: Task 6

  **References**:
  - `tests/fixtures/symfony/` — fixtures Symfony existantes pour les tests
  - `src/adapters/symfony.ts` — Symfony adapter, patterns de détection
  - `src/types.ts` — Topic (files, routes, commands)

  **Acceptance Criteria**:
  - [ ] `src/skills/symfony-review.ts` existe
  - [ ] Tests: analyse des fixtures Symfony retourne SkillResult
  - [ ] Tests: framework non-Symfony → retour "Skill not applicable for framework X"

  **QA Scenarios**:

  ```
  Scenario: Symfony review sur fixtures
    Tool: Bash
    Steps:
      1. npm test -- --grep "symfony-review"
      2. Exécuter sur tests/fixtures/symfony/ — vérifie SkillResult non vide
    Expected Result: Violations et suggestions détectées dans les fixtures
    Evidence: .sisyphus/evidence/task-11-symfony-review.txt

  Scenario: Non-Symfony framework
    Tool: Bash
    Steps:
      1. npm test — vérifie que framework "nextjs" retourne "not applicable"
    Expected Result: SkillResult avec risks = ["Not applicable for Next.js"]
    Evidence: .sisyphus/evidence/task-11-symfony-review-skip.txt
  ```

  **Commit**: YES
  - Message: `feat(skill): add symfony-review skill`
  - Files: `src/skills/symfony-review.ts`, `tests/skills/symfony-review.test.ts`
  - Pre-commit: `npm test`

- [x] 12. Skill: twig-inline-css

  **What to do**:
  - Créer `src/skills/twig-inline-css.ts` implémentant SkillDefinition:
    - Scanne les templates Twig (.html.twig) du topic
    - Détecte les styles inline (regex: `style="..."` dans les templates)
    - Supporte 4 modes (via SkillContext options):
      - `analyze` — liste les templates avec styles inline, count par fichier
      - `generate-css` — extrait les styles inline et propose des classes CSS
      - `apply` — génère les remplacements (fichier → diff proposé)
      - `dry-run` — montre ce qui serait changé sans modifier
    - Retourne SkillResult avec:
      - files: templates avec styles inline
      - actions: étapes proposées selon le mode
      - risks: templates trop complexes pour extraction automatique
  - Générer `.agent/skills/twig-inline-css.md`
  - TDD: tester avec des templates Twig mock avec styles inline

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 9, 10, 11, 13)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 14
  - **Blocked By**: Task 6

  **References**:
  - `src/types.ts` — Topic.files pour trouver les .html.twig
  - `src/adapters/symfony.ts` — détection des templates Twig

  **Acceptance Criteria**:
  - [ ] `src/skills/twig-inline-css.ts` existe
  - [ ] Tests: mode analyze détecte les styles inline dans un template mock
  - [ ] Tests: mode generate-css propose des classes CSS
  - [ ] Tests: template sans style inline → files vide

  **QA Scenarios**:

  ```
  Scenario: Analyze détecte styles inline
    Tool: Bash
    Steps:
      1. npm test -- --grep "twig-inline-css"
      2. Template mock avec '<div style="color: red">' détecté
    Expected Result: SkillResult.files contient le template, actions propose extraction
    Evidence: .sisyphus/evidence/task-12-twig-inline.txt
  ```

  **Commit**: YES
  - Message: `feat(skill): add twig-inline-css skill`
  - Files: `src/skills/twig-inline-css.ts`, `tests/skills/twig-inline-css.test.ts`
  - Pre-commit: `npm test`

- [x] 13. Skill: route-debug

  **What to do**:
  - Créer `src/skills/route-debug.ts` implémentant SkillDefinition:
    - Prend une erreur ou route attendue en entrée (SkillContext.query)
    - Analyse:
      1. Charge les routes depuis brainData.routes
      2. Cherche la route par nom, path, ou contrôleur
      3. Si trouvé: vérifie le contrôleur, les méthodes, le path
      4. Si non trouvé: suggère des routes proches (fuzzy match)
    - Retourne SkillResult avec:
      - files: fichiers contrôleur liés
      - actions: vérifications à faire
      - risks: config manquante, route non enregistrée
  - Générer `.agent/skills/route-debug.md`
  - TDD: tester avec les routes des fixtures Symfony

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 9, 10, 11, 12)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 14
  - **Blocked By**: Task 6

  **References**:
  - `src/types.ts` — Route (name, path, methods, controller, file)
  - `tests/fixtures/symfony/` — fixtures avec routes

  **Acceptance Criteria**:
  - [ ] `src/skills/route-debug.ts` existe
  - [ ] Tests: recherche par nom de route trouve la bonne route
  - [ ] Tests: recherche par path trouve la bonne route
  - [ ] Tests: route non trouvée → suggestions proches

  **QA Scenarios**:

  ```
  Scenario: Route trouvée par nom
    Tool: Bash
    Steps:
      1. npm test — route existante trouvée par nom
    Expected Result: SkillResult avec file = contrôleur, actions = vérifications
    Evidence: .sisyphus/evidence/task-13-route-debug.txt

  Scenario: Route non trouvée avec suggestions
    Tool: Bash
    Steps:
      1. npm test — route inexistante retourne suggestions
    Expected Result: risks contient "Route not found", actions propose alternatives
    Evidence: .sisyphus/evidence/task-13-route-debug-suggest.txt
  ```

  **Commit**: YES
  - Message: `feat(skill): add route-debug skill`
  - Files: `src/skills/route-debug.ts`, `tests/skills/route-debug.test.ts`
  - Pre-commit: `npm test`

- [x] 14. CLI integration — `brain skill` + `brain hook` commands

  **What to do**:
  - Ajouter dans `src/cli.ts` les commandes:
    - `brain skill <name>` — exécute un skill
      - Options: `--topic <name>`, `--diff <string>`, `--dir <path>`, `--json`
      - Crée un SkillContext, exécute le skill via runSkill, affiche le résultat
      - Format stdout: markdown par défaut, JSON si `--json`
    - `brain hook` — installe le pre-commit hook
      - Options: `--uninstall`, `--dir <path>`
      - Appelle installHook/uninstallHook de hook.ts
    - `brain _hook-check` — commande interne appelée par le hook pre-commit
      - Appelle runPreCheck de hook.ts, affiche les résultats
  - Mettre à jour les imports dans cli.ts
  - TDD: tester les commandes via execFile

  **Must NOT do**:
  - Ne pas modifier les commandes existantes (scan, update, install, enrich, prompt)
  - Ne pas casser les tests existants

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO — dépend de Tasks 5-13
  - **Parallel Group**: Wave 4
  - **Blocks**: Tasks 15, 16
  - **Blocked By**: Tasks 5, 6, 7, 9, 10, 11, 12, 13

  **References**:
  - `src/cli.ts:186-443` — pattern de commandes Commander existantes
  - `src/skills/runner.ts` — runSkill, listSkills, createSkillContext (Task 6)
  - `src/hook.ts` — installHook, runPreCheck (Task 7)
  - `src/router.ts` — routeTask (Task 5)

  **Acceptance Criteria**:
  - [ ] `brain skill repo-map --dir tests/fixtures/symfony` produit un SkillResult
  - [ ] `brain skill --json` produit du JSON valide
  - [ ] `brain hook` installe le pre-commit
  - [ ] `npm test` passe (existants + nouveaux)

  **QA Scenarios**:

  ```
  Scenario: brain skill exécute un skill
    Tool: Bash
    Steps:
      1. cd tests/fixtures/symfony && npx tsx ../../../src/cli.ts skill repo-map
      2. Vérifier stdout contient "goal:", "topic:", "files:"
    Expected Result: SkillResult affiché en markdown
    Evidence: .sisyphus/evidence/task-14-skill-cli.txt

  Scenario: brain skill --json output
    Tool: Bash
    Steps:
      1. cd tests/fixtures/symfony && npx tsx ../../../src/cli.ts skill repo-map --json
      2. Pipe vers jq, vérifier .goal, .topic, .files existent
    Expected Result: JSON valide parsable par jq
    Evidence: .sisyphus/evidence/task-14-skill-json.txt

  Scenario: brain hook installe
    Tool: Bash
    Steps:
      1. cd tests/fixtures/symfony && npx tsx ../../../src/cli.ts hook
      2. test -f .git/hooks/pre-commit
    Expected Result: Hook installé
    Evidence: .sisyphus/evidence/task-14-hook-cli.txt
  ```

  **Commit**: YES
  - Message: `feat(cli): add brain skill + brain hook commands`
  - Files: `src/cli.ts`, `tests/cli-skills.test.ts`
  - Pre-commit: `npm test && npm run build`

- [x] 15. Update `brain install` for .agent/ + hook

  **What to do**:
  - Modifier `src/install.ts`:
    - `brain install <ide>` génère aussi `.agent/` (appelle generateAgentDir)
    - Proposer l'installation du hook: "Also install pre-commit hook? [Y/n]"
    - Ajouter option `--with-hook` pour installation non-interactive
    - Mettre à jour les IDE configs pour référencer `.projectbrain/brain.md` et `.agent/prompts/`
    - Installer les skills markdown dans `.agent/skills/` (templates copiés depuis src/skills/templates/)
  - Mettre à jour les contenus IDE pour mentionner:
    - `.projectbrain/brain.md` comme lecture initiale
    - `.agent/prompts/` pour les instructions agent
    - `.agent/skills/` pour les procédures spécialisées

  **Must NOT do**:
  - Ne pas casser les installs existantes pour les 5 IDEs
  - Ne pas ajouter de dépendance

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Tasks 8, 14)
  - **Parallel Group**: Wave 4
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 8, 14

  **References**:
  - `src/install.ts:1269-1379` — IDE_CONFIGS pour cursor, claude, opencode, windsurf, zed
  - `src/install.ts:1415-1501` — installForIde() et installIde()
  - `src/agent-generator.ts` — generateAgentDir (Task 8)

  **Acceptance Criteria**:
  - [ ] `brain install claude` génère `.agent/` + propose hook
  - [ ] `brain install claude --with-hook` installe tout sans prompt
  - [ ] CLAUDE.md généré référence `.projectbrain/brain.md` et `.agent/`
  - [ ] Skills markdown copiés dans `.agent/skills/`

  **QA Scenarios**:

  ```
  Scenario: Install génère .agent/ + hook
    Tool: Bash
    Steps:
      1. cd tests/fixtures/symfony && npx tsx ../../../src/cli.ts install claude --with-hook
      2. test -f .agent/prompts/system-base.md
      3. test -f .agent/skills/repo-map.md
      4. test -f .git/hooks/pre-commit
      5. grep -c "projectbrain" CLAUDE.md
    Expected Result: .agent/ créé, hook installé, CLAUDE.md mis à jour
    Evidence: .sisyphus/evidence/task-15-install.txt
  ```

  **Commit**: YES
  - Message: `feat(install): update brain install to generate .agent/ and offer hook`
  - Files: `src/install.ts`, `tests/install.test.ts`
  - Pre-commit: `npm test`

- [x] 16. Update `brain scan` for topic-index + freshness + .agent/

  **What to do**:
  - Modifier `src/scan.ts`:
    - Après la découverte des topics, appeler `generateTopicIndex` et écrire topic-index.yaml dans `.projectbrain/brain-topics/`
    - Appeler `computeFreshness` et écrire freshness.yaml dans `.projectbrain/brain-topics/`
    - Appeler `generateAgentDir` pour créer/mettre à jour `.agent/`
    - Afficher les topics et leur statut freshness dans la sortie console
  - Modifier `src/update.ts`:
    - Même logique de mise à jour pour topic-index et freshness
    - Préserver les overrides manuels du topic-index si existants (merge)
  - Output console enrichi:
    ```
    Topics:
      admin    [dirty]  5 files, 2 routes
      activity [fresh]  3 files, 0 routes
      asset    [stale]  4 files, 1 route
    
    Generated:
      .projectbrain/brain.md
      .projectbrain/brain-topics/topic-index.yaml
      .projectbrain/brain-topics/freshness.yaml
      .agent/prompts/system-base.md
    ```

  **Must NOT do**:
  - Ne pas modifier la logique de discovery/clustering (discover.ts)
  - Ne pas casser les tests existants de scan

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Tasks 3, 4, 8, 14)
  - **Parallel Group**: Wave 4
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 3, 4, 8, 14

  **References**:
  - `src/scan.ts:112-226` — scanProject() principal
  - `src/topic-index.ts` — generateTopicIndex, writeTopicIndex (Task 3)
  - `src/freshness.ts` — computeFreshness, writeFreshness (Task 4)
  - `src/agent-generator.ts` — generateAgentDir (Task 8)

  **Acceptance Criteria**:
  - [ ] `brain scan --dir tests/fixtures/symfony` crée topic-index.yaml, freshness.yaml, .agent/
  - [ ] Console output affiche les statuts freshness par topic
  - [ ] `brain update --dir tests/fixtures/symfony` met à jour topic-index + freshness
  - [ ] Tests existants passent encore

  **QA Scenarios**:

  ```
  Scenario: Scan génère tous les artefacts
    Tool: Bash
    Steps:
      1. cd tests/fixtures/symfony && rm -rf .projectbrain .agent
      2. npx tsx ../../../src/cli.ts scan
      3. test -f .projectbrain/brain.md
      4. test -f .projectbrain/brain-topics/topic-index.yaml
      5. test -f .projectbrain/brain-topics/freshness.yaml
      6. test -f .agent/prompts/system-base.md
    Expected Result: Tous les artefacts générés
    Evidence: .sisyphus/evidence/task-16-scan-full.txt

  Scenario: Update préserve les données existantes
    Tool: Bash
    Steps:
      1. npx tsx ../../../src/cli.ts scan (premier passage)
      2. npx tsx ../../../src/cli.ts update (deuxième passage)
      3. Vérifier topic-index.yaml toujours valide
    Expected Result: Update ne perd pas de données
    Evidence: .sisyphus/evidence/task-16-update.txt

  Scenario: Console output affiche freshness
    Tool: Bash
    Steps:
      1. npx tsx ../../../src/cli.ts scan 2>&1 | grep -E '\[fresh\]|\[stale\]|\[dirty\]'
    Expected Result: Au moins un topic avec statut entre crochets
    Evidence: .sisyphus/evidence/task-16-freshness-output.txt
  ```

  **Commit**: YES
  - Message: `feat(scan): integrate topic-index, freshness, and .agent/ generation`
  - Files: `src/scan.ts`, `src/update.ts`, `tests/scan-integration.test.ts`
  - Pre-commit: `npm test && npm run build`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `npm run build` + `npm test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high`
  Start from clean state. Execute EVERY QA scenario from EVERY task. Test: `brain scan` generates `.projectbrain/` + `.agent/`, `brain skill repo-map` produces output, `brain hook` installs pre-commit, `brain install claude` references correct paths. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1. Check "Must NOT do" compliance. Detect cross-task contamination. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | VERDICT`

---

## Commit Strategy

- **Wave 1**: `refactor!: migrate .project/ to .projectbrain/` — all files
- **Wave 2**: `feat(core): add router, skill runner, topic-index, freshness, hook, agent-generator` — src/*.ts
- **Wave 3**: `feat(skills): add 5 skills (repo-map, diff-only, symfony-review, twig-inline-css, route-debug)` — src/skills/*.ts
- **Wave 4**: `feat(cli): integrate skill + hook commands, update scan and install` — src/cli.ts, src/scan.ts, src/install.ts
- Each commit: `npm test && npm run build` must pass

---

## Success Criteria

### Verification Commands
```bash
npm run build          # Expected: compiles without errors
npm test               # Expected: all tests pass (18+ existing + new)
brain scan --dir tests/fixtures/symfony  # Expected: generates .projectbrain/ + .agent/
brain skill repo-map   # Expected: structured output with goal, topic, files, actions, risks, next
brain hook             # Expected: installs pre-commit in .git/hooks/
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] `.projectbrain/` replaces `.project/` completely
- [ ] `.agent/` generated with prompts, skills, cache
- [ ] Pre-commit hook detects dirty topics
- [ ] Skills produce standardized output format
