# LLM Context Prompt

TASK: analyze codebase → explain business context

## Project

| Property | Value |
|----------|-------|
| Framework | Generic |
| Modules | 10 |
| Routes | 0 |
| Commands | 0 |

### Modules
- Cli.ts: `src/cli.ts`
- Detect.ts: `src/detect.ts`
- Discover.ts: `src/discover.ts`
- Install.ts: `src/install.ts`
- Output.ts: `src/output.ts`
- Scan.ts: `src/scan.ts`
- Stale.ts: `src/stale.ts`
- Types.ts: `src/types.ts`
- Update.ts: `src/update.ts`
- Adapters: `src/adapters`

## Key Files

### README.md
```markdown
# Project Brain

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](package.json)

## 🎯 Objectif / Goal

**FR —** Réduire drastiquement les tokens consommés par les LLMs en structurant le contexte projet **une seule fois**, puis en le réutilisant à **chaque session**.

**EN —** Drastically reduce LLM token usage by structuring project context **once**, then reusing it **every session**.

---

## Comment ça marche / How It Works

### Économie de tokens (FR)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     SANS PROJECT BRAIN (coût répété)                         │
│                                                                              │
│  Session 1          Session 2          Session 3          Session N         │
│  ┌─────────┐        ┌─────────┐        ┌─────────┐        ┌─────────┐       │
│  │ 50k     │        │ 50k     │        │ 50k     │        │ 50k     │       │
│  │ tokens  │        │ tokens  │        │ tokens  │        │ tokens  │       │
│  └─────────┘        └─────────┘        └─────────┘        └─────────┘       │
│                                                                              │
│  → Exploration depuis zéro à chaque session                                  │
│  → Fichiers entiers envoyés au LLM                                          │
│  → Pas de mémoire entre sessions                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                     AVEC PROJECT BRAIN (coût unique)                         │
│                                                                              │
│  Setup (local)      Session 1          Session 2          Session N         │
│  ┌─────────┐        ┌─────────┐        ┌─────────┐        ┌─────────┐       │
│  │  0      │        │  2k     │        │  2k     │        │  2k     │       │
│  │ tokens  │        │ tokens  │        │ tokens  │        │ tokens  │       │
│  │ (local) │        │         │        │         │        │         │       │
│  └─────────┘        └─────────┘        └─────────┘        └─────────┘       │
│       │                   ▲                  ▲                  ▲             │
│       │                   │                  │                  │             │
│   brain scan          lit brain.md       lit brain.md       lit brain.md     │
│   brain update        (réutilisation)    (réutilisation)    (réutilisation)  │
│                                                                              │
│  → Même carte projet ; données fraîches via commandes ciblées (routes, etc.)  │
└─────────────────────────────────────────────────────────────────────────────┘
```

**EN —** The same diagram applies: without Brain, each session pays a large “full discovery” cost; with Brain, **local** `brain scan` / `brain update` refreshes structure, and each session reuses compact **`brain.md`** instead of re-reading the whole tree.

---

**FR —** *Project Brain* génère un contexte projet structuré pour les LLMs à partir de votre code. Il fonctionne avec n’importe quel IDE : scan du dépôt, règle légère dans l’IDE, puis enrichissement du contexte métier via un prompt.

**EN —** *Project Brain* generates structured, LLM-ready project context from your codebase. Use it with any IDE: scan the repo, install a small rule file, then let the model fill in business context from a prompt.

**[Français](#français)** · **[English](#english)**

---

## Français

### Sommaire (FR)

- [Installation (FR)](#installation-fr)
- [Démarrage rapide (FR)](#démarrage-rapide-fr)
- [Commandes (FR)](#commandes-fr)
- [Frameworks pris en charge (FR)](#frameworks-pris-en-charge-fr)
- [Mécanismes d'économie de tokens (FR)](#mécanismes-déconomie-de-tokens-fr)
- [Fonctionnement (FR)](#fonctionnement-fr)
- [Exemple (FR)](#exemple-fr)
- [Développement (FR)](#développement-fr)
- [Licence (FR)](#licence-fr)

### Installation (FR)

Le paquet **n’est pas publié sur npm** pour l’instant. Installez-le **depuis le dépôt** :

```bash
git clone https://github.com/Sildes/brain.git
cd brain
npm install
npm run build
```

Utilisation **sans** installation sur le profil (commande `brain` absente du PATH) :

```bash
node dist/cli.js scan
# ou, pendant le développement
npm run dev -- scan
```

**Optionnel — rendre la commande `brain` disponible sur votre profil** (binaire npm global, selon votre préfixe Node, souvent sous le répertoire utilisateur) — après `npm run build`, à la racine du dépôt :

```bash
npm install -g .
```

Alternative équivalente pour un lien symbolique vers votre clone (pratique pour développer) :

```bash
npm link
```

### Démarrage rapide (FR)

```bash
cd votre-projet
brain scan                        # .project/brain.md + .project/brain-prompt.md
brain install cursor              # IDE + prompt à coller dans le chat
# Coller le prompt dans le chat (Cursor ou autre IDE configuré)
# Le LLM met à jour .project/brain.md (contexte métier)
```

**Ce que vous obtenez**

- Détection de framework (Symfony, Laravel, Next.js ou générique)
- Modules déduits de l’arborescence
- Routes utiles (métier vs techniques)
- Commandes CLI extraites des fichiers de commandes
- Conventions lues dans la configuration
- Repères pour retrouver les bons dossiers
- Un `brain.md` qui centralise le contexte

### Mécanismes d'économie de tokens (FR)

Project Brain réduit surtout ce que vous envoyez au modèle **à chaque session**, en évitant de redécouvrir tout le dépôt dans le chat.

| Mécanisme | Effet |
|-----------|--------|
| **`brain.md` comme hub** | Contexte **structuré et court** (modules, repères, commandes utiles) à la place d’une exploration « from scratch » et de nombreux fichiers entiers. |
| **Scan en local** | Arborescence, framework, routes/commandes listées, etc. sont produits **sans** consommation de tokens LLM. |
| **`brain-prompt.md` limité** | Le générateur ne retient qu’un **petit ensemble de fichiers clés** et borne la taille du prompt d’analyse métier, au lieu de coller le repo au hasard. |
| **Règle IDE + commandes CLI** | Pour les données à jour (routes, services…), on privilégie une **commande ciblée** et une sortie courte plutôt que d’empiler du code ou du vendor dans le contexte. |
| **Tableau « Quick Find »** | Moins d’essais/erreurs et de lectures en rafale pour trouver où vit une fonctionnalité. |

**À retenir :** l’économie est **récurrente** (chaque conversation). Il reste un coût ponctuel : `brain scan` après des changements majeurs, et parfois une passe avec `brain-prompt.md` quand le métier évolue — sinon le contexte peut se périmérer.

### Commandes (FR)

#### `brain scan`

| Fichier | Rôle |
|---------|------|
| `.project/brain.md` | Carte structurelle |
| `.project/brain-prompt.md` | Prompt pour le LLM |

```bash
brain scan --output .context       # défaut : .project
brain scan --adapter symfony       # symfony | laravel | nextjs | generic
```

#### `brain update`

Re-scanne le projet et met à jour les fichiers brain, **en préservant la section Business Context** si elle existe.

```bash
brain update                      # met à jour .project/brain.md + brain-prompt.md
brain update --output .context    # répertoire personnalisé
```

Utilisez `brain update` après des changements de structure (nouveaux modules, routes) pour rafraîchir le contexte sans perdre le travail métier ajouté par le LLM.

#### Brain Topics (FR)

`brain scan` détecte automatiquement des **domaines** (authentication, payments, etc.) par co-occurrence de termes dans les fichiers, routes et commandes.

```
brain scan
# Génère :
#   .project/brain-topics/.draft/*.md       — Brouillons auto-détectés
#   .project/brain-topics/*.md              — Fichiers enrichis (après LLM)
#   .project/brain-topics-prompt.md         — Prompt global
#   .project/brain-topics/[topic]-prompt.md — Prompts individuels
```

**Workflow :**
1. `brain scan` — détecte les topics nouveaux/périmés
2. Copiez le prompt généré vers votre LLM
3. Collez la réponse dans les fichiers topic
4. Les futures sessions LLM utilisent les topics comme guides

**Statuts des topics :**

| Statut | Description | Prompt généré ? |
|--------|-------------|-----------------|
| NEW | Détecté, jamais enrichi | Oui |
| UP_TO_DATE | Mêmes fichiers, même contenu | Non |
| STALE | Fichiers ou contenu modifiés | Oui |
| ORPHANED | Enrichi mais plus détecté | Avertissement |

#### `brain install [ide]`

Installe la configuration brain (section marquée ; le reste du fichier est préservé quand c’est possible).

```bash
brain install cursor      # .cursorrules
brain install claude      # CLAUDE.md
brain install opencode    # .opencode/rules.md
brain install windsurf    # .windsurfrules
brain install zed         # .zed/rules.md
brain install all
brain install             # interactif
```

```bash
brain install cursor --output .context
```

Après installation : coller le prompt dans le chat. Le LLM lit `brain-prompt.md`, produit le contexte métier et l’écrit dans `brain.md` sous **Business Context**.

### Frameworks pris en charge (FR)

| Framework | Détection | Routes | Commandes |
|-----------|-----------|--------|-----------|
| Symfony | `composer.json` + `bin/console` | `debug:router` | `bin/console` |
| Laravel | `artisan` + `composer.json` | `php artisan route:list` | `artisan` |
| Next.js | `package.json` (`next`) | `app/` ou `pages/` | — |
| Générique | Arborescence | — | — |

### Fonctionnement (FR)

#### Workflow complet

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           PROJET UTILISATEUR                             │
│  src/  config/  tests/  composer.json  ...                               │
└─────────────────────────────────┬────────────────────────────────────────┘
                                  │
    ┌─────────────────────────────┼─────────────────────────────┐
    │                             │                             │
    ▼                             ▼                             ▼
┌────────┐                 ┌────────┐                 ┌────────┐
│  scan  │                 │ update │                 │install │
└───┬────┘                 └───┬────┘                 └───┬────┘
    │                          │                          │
    │  ┌───────────────────────┘                          │
    │  │ preserve Business Context                        │
    ▼  ▼                                                  ▼
┌─────────────────────────────────┐        ┌──────────────────────────────┐
│      .project/                  │        │       IDE Rules              │
│  ├── brain.md        Structural│        │  .cursorrules / CLAUDE.md    │
│  └── brain-prompt.md  Key files │        │  .opencode/rules.md  ...     │
└─────────────┬───────────────────┘        └──────────────┬───────────────┘
              │                                           │
              │  ┌────────────────────────────────────────┘
              │  │ lit brain.md au démarrage
              ▼  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           LLM DANS L'IDE                                 │
│                                                                          │
│  1. Lit .project/brain.md (contexte structurel)                         │
│  2. Lit .project/brain-prompt.md (fichiers clés)                        │
│  3. Génère Business Context                                              │
│  4. Écrit dans brain.md sous "## Business Context"                       │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Structure des fichiers générés

```
votre-projet/
├── .project/
│   ├── brain.md              ← Contexte structuré (modules, routes, commandes)
│   │   ├── At a Glance       ← Résumé rapide
│   │   ├── Modules           ← Liste des modules détectés
│   │   ├── Routes            ← Routes métier (filtrées)
│   │   ├── Navigation (CLI)  ← Commandes utiles
│   │   ├── Quick Find        ← Tableau "où chercher quoi"
│   │   ├── Topics            ← Domaines détectés automatiquement
│   │   ├── Business Context  ← Section remplie par le LLM ✓
│   │   └── Meta              ← Métadonnées
│   │
│   ├── brain-prompt.md       ← Fichiers clés + instructions pour le LLM
│   │
│   ├── brain-topics/         ← Topics (guides par domaine)
│   │   ├── .draft/           ← Brouillons auto-générés
│   │   ├── .meta.yaml        ← Suivi des statuts
│   │   └── *.md              ← Topics enrichis (LLM)
│   │
│   └── brain-topics-prompt.md ← Prompt pour enrichir les topics
│
├── .cursorrules              ← Règle IDE (si install cursor)
│   └── "Read .project/brain.md first..."
│
└── src/ ... (votre code)
```

#### Scan vs Update

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           brain scan                                     │
│  - Crée .project/brain.md from scratch                                   │
│  - Écrase tout le contenu existant                                       │
│  - Utiliser pour: setup initial, reset complet                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                           brain update                                   │
│  - Re-scanne le projet                                                   │
│  - PRÉSERVE la section "## Business Context"                            │
│  - Utiliser pour: rafraîchir après changements de structure              │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Flux de données

```
     CODE SOURCE                    BRAIN                      LLM
    ┌─────────┐                  ┌─────────┐               ┌─────────┐
    │ src/    │    scan/update   │brain.md │   read        │         │
    │ config/ │ ───────────────► │         │ ────────────► │  IDE    │
    │ tests/  │                  │         │               │         │
    └─────────┘                  │prompt.md│ ◄──────────── │         │
                                 │         │  write        │         │
                                 │         │ Business      │         │
                                 │         │ Context       └─────────┘
                                 └─────────┘
```

### Exemple (FR)

`.cursorrules` après `brain install` :

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

`.project/brain.md` : modules, routes métier, commandes, conventions, « où chercher quoi », métadonnées.

### Développement (FR)

Prérequis : **Node.js ≥ 18**.

```bash
git clone https://github.com/Sildes/brain.git
cd brain
npm install
npm run build
npm run dev -- scan
```

### Licence (FR)

MIT — [LICENSE](LICENSE).

---

## English

### Table of contents (EN)

- [Installation (EN)](#installation-en)
- [Quick start (EN)](#quick-start-en)
- [Commands (EN)](#commands-en)
- [Supported frameworks (EN)](#supported-frameworks-en)
- [LLM token savings (EN)](#llm-token-savings-en)
- [How it works (EN)](#how-it-works-en)
- [Example (EN)](#example-en)
- [Development (EN)](#development-en)
- [License (EN)](#license-en)

### Installation (EN)

The package is **not published on npm** yet. Install **from the repository**:

```bash
git clone https://github.com/Sildes/brain.git
cd brain
npm install
npm run build
```

Run **without** installing to your user profile (no `brain` on `PATH`):

```bash
node dist/cli.js scan
# or, while hacking on the tool
npm run dev -- scan
```

**Optional — install the `brain` command for your user** (npm global bin, typically under your Node prefix / home directory) — after `npm run build`, from the repo root:

```bash
npm install -g .
```

Equivalent symlink workflow while you work on the clone:

```bash
npm link
```

### Quick start (EN)

```bash
cd your-project
brain scan                        # .project/brain.md + .project/brain-prompt.md
brain install cursor              # IDE rule + prompt to paste in chat
# Paste the prompt in your IDE chat
# The LLM updates .project/brain.md (business context)
```

**What you get**

- Framework detection (Symfony, Laravel, Next.js, or generic)
- Modules from the directory layout
- Useful routes (business vs technical noise)
- CLI commands from command files
- Conventions from config
- Pointers for where to look in the codebase
- One `brain.md` as a single context hub

### LLM token savings (EN)

Project Brain mainly reduces what you send to the model **every session** by avoiding rediscovering the whole repo in chat.

| Mechanism | Effect |
|-----------|--------|
| **`brain.md` as a hub** | **Structured, compact** context (modules, pointers, useful commands) instead of “from scratch” exploration and many full files. |
| **Local scan** | Tree, framework, route/command lists, etc. are produced **without** LLM token usage. |
| **Bounded `brain-prompt.md`** | The generator keeps only a **small set of key files** and caps the business-analysis prompt size, instead of pasting the repo blindly. |
| **IDE rule + CLI commands** | For live data (routes, services…), prefer a **targeted command** and short output over stuffing code or vendor files into context. |
| **“Quick Find” table** | Fewer wrong turns and fewer bulk file reads to locate features. |

**Takeaway:** savings are **ongoing** (each conversation). There is still occasional cost: `brain scan` after major changes, and sometimes a `brain-prompt.md` pass when business logic shifts — otherwise context can go stale.

### Commands (EN)

#### `brain scan`

| File | Role |
|------|------|
| `.project/brain.md` | Structural map |
| `.project/brain-prompt.md` | LLM prompt |

```bash
brain scan --output .context       # default: .project
brain scan --adapter symfony       # symfony | laravel | nextjs | generic
```

#### `brain update`

Re-scans the project and updates brain files, **preserving the Business Context section** if it exists.

```bash
brain update                      # updates .project/brain.md + brain-prompt.md
brain update --output .context    # custom directory
```

Use `brain update` after structural changes (new modules, routes) to refresh context without losing the business context added by the LLM.

#### Brain Topics (EN)

`brain scan` automatically detects **domains** (authentication, payments, etc.) via term co-occurrence in files, routes, and commands.

```
brain scan
# Generates:
#   .project/brain-topics/.draft/*.md       — Auto-detected drafts
#   .project/brain-topics/*.md              — Enriched files (after LLM)
#   .project/brain-topics-prompt.md         — Global prompt
#   .project/brain-topics/[topic]-prompt.md — Individual prompts
```

**Workflow:**
1. `brain scan` — detects new/stale topics
2. Copy the generated prompt to your LLM
3. Paste the response into topic files
4. Future LLM sessions use topics as navigation guides

**Topic statuses:**

| Status | Description | Prompt Generated? |
|--------|-------------|-------------------|
| NEW | Detected, never enriched | Yes |
| UP_TO_DATE | Same files, same content | No |
| STALE | Files or content changed | Yes |
| ORPHANED | Enriched but no longer detected | Warning only |

#### `brain install [ide]`

Installs Brain snippets (marked section; existing content is preserved when possible).

```bash
brain install cursor      # .cursorrules
brain install claude      # CLAUDE.md
brain install opencode    # .opencode/rules.md
brain install windsurf    # .windsurfrules
brain install zed         # .zed/rules.md
brain install all
brain install             # interactive
```

```bash
brain install cursor --output .context
```

After install: paste the prompt into chat. The LLM reads `brain-prompt.md`, writes business context into `brain.md` under **Business Context**.

### Supported frameworks (EN)

| Framework | Detection | Routes | Commands |
|-----------|-----------|--------|----------|
| Symfony | `composer.json` + `bin/console` | `debug:router` | `bin/console` |
| Laravel | `artisan` + `composer.json` | `php artisan route:list` | `artisan` |
| Next.js | `package.json` (`next`) | `app/` or `pages/` | — |
| Generic | Directory layout | — | — |

### How it works (EN)

#### Complete Workflow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           YOUR PROJECT                                    │
│  src/  config/  tests/  composer.json  ...                               │
└─────────────────────────────────┬────────────────────────────────────────┘
                                  │
    ┌─────────────────────────────┼─────────────────────────────┐
    │                             │                             │
    ▼                             ▼                             ▼
┌────────┐                 ┌────────┐                 ┌────────┐
│  scan  │                 │ update │                 │install │
└───┬────┘                 └───┬────┘                 └───┬────┘
    │                          │                          │
    │  ┌───────────────────────┘                          │
    │  │ preserves Business Context                       │
    ▼  ▼                                                  ▼
┌─────────────────────────────────┐        ┌──────────────────────────────┐
│      .project/                  │        │       IDE Rules              │
│  ├── brain.md        Structural│        │  .cursorrules / CLAUDE.md    │
│  └── brain-prompt.md  Key files │        │  .opencode/rules.md  ...     │
└─────────────┬───────────────────┘        └──────────────┬───────────────┘
              │                                           │
              │  ┌────────────────────────────────────────┘
              │  │ reads brain.md on startup
              ▼  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           LLM IN YOUR IDE                                │
│                                                                          │
│  1. Reads .project/brain.md (structural context)                        │
│  2. Reads .project/brain-prompt.md (key files)                          │
│  3. Generates Business Context                                           │
│  4. Writes to brain.md under "## Business Context"                      │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Generated File Structure

```
your-project/
├── .project/
│   ├── brain.md              ← Structured context (modules, routes, commands)
│   │   ├── At a Glance       ← Quick summary
│   │   ├── Modules           ← Detected modules
│   │   ├── Routes            ← Business routes (filtered)
│   │   ├── Navigation (CLI)  ← Useful commands
│   │   ├── Quick Find        ← "where to find what" table
│   │   ├── Topics            ← Auto-detected domains
│   │   ├── Business Context  ← Section filled by LLM ✓
│   │   └── Meta              ← Metadata
│   │
│   ├── brain-prompt.md       ← Key files + instructions for LLM
│   │
│   ├── brain-topics/         ← Topics (domain guides)
│   │   ├── .draft/           ← Auto-generated drafts
│   │   ├── .meta.yaml        ← Status tracking
│   │   └── *.md              ← Enriched topics (LLM)
│   │
│   └── brain-topics-prompt.md ← Prompt for enriching topics
├── .cursorrules              ← IDE rule (if you installed cursor)
│   └── "Read .project/brain.md first..."
└── src/ ... (your code)
```

#### Scan vs Update

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           brain scan                                     │
│  - Creates .project/brain.md from scratch                                │
│  - Overwrites all existing content                                       │
│  - Use for: initial setup, full reset                                    │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                           brain update                                   │
│  - Re-scans the project                                                  │
│  - PRESERVES "## Business Context" section                               │
│  - Use for: refresh after structural changes                             │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Data Flow

```
     SOURCE CODE                     BRAIN                      LLM
    ┌─────────┐                  ┌─────────┐               ┌─────────┐
    │ src/    │    scan/update   │brain.md │   read        │         │
    │ config/ │ ───────────────► │         │ ────────────► │  IDE    │
    │ tests/  │                  │         │               │         │
    └─────────┘                  │prompt.md│ ◄──────────── │         │
                                 │         │  write        │         │
                                 │         │ Business      │         │
                                 │         │ Context       └─────────┘
                                 └─────────┘
```

### Example (EN)

`.cursorrules` after `brain install`:

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

`.project/brain.md` typically includes modules, business routes, commands, conventions, a “where to look” table, and metadata.

### Development (EN)

Requires **Node.js ≥ 18**.

```bash
git clone https://github.com/Sildes/brain.git
cd brain
npm install
npm run build
npm run dev -- scan
```

- `npm run build` — compile to `dist/`
- `npm run dev` — run `src/cli.ts` via `tsx`

### License (EN)

MIT — see [LICENSE](LICENSE).

```

### package.json
```json
{
  "name": "project-brain",
  "version": "0.1.0",
  "description": "Generate project context for LLMs - works with any IDE",
  "type": "module",
  "bin": {
    "brain": "./dist/cli.js"
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/cli.ts",
    "scan": "tsx src/cli.ts scan",
    "prepublishOnly": "npm run build"
  },
  "keywords": [
    "llm",
    "ai",
    "context",
    "cursor",
    "claude",
    "ide",
    "project"
  ],
  "author": "",
  "license": "MIT",
  "dependencies": {
    "commander": "^13.1.0",
    "fast-glob": "^3.3.3"
  },
  "devDependencies": {
    "@types/node": "^22.13.10",
    "tsx": "^4.19.3",
    "typescript": "^5.8.2"
  },
  "engines": {
    "node": ">=18"
  }
}

```

### src/cli.ts
```typescript
#!/usr/bin/env node
import { program } from "commander";
import { scanProject } from "./scan.js";
import { updateProject } from "./update.js";
import { installIde } from "./install.js";
import { registerAdapter } from "./adapters/index.js";
import { symfonyAdapter } from "./adapters/symfony.js";
import { laravelAdapter } from "./adapters/laravel.js";
import { nextjsAdapter } from "./adapters/nextjs.js";
import { genericAdapter } from "./adapters/generic.js";

// Register all adapters
registerAdapter(symfonyAdapter);
registerAdapter(laravelAdapter);
registerAdapter(nextjsAdapter);
registerAdapter(genericAdapter);

program
  .name("brain")
  .description("Generate project context for LLMs - works with any IDE")
  .version("0.1.0");

program
  .command("scan")
  .description("Scan the project and generate brain files")
  .option("-o, --output <dir>", "Output directory", ".project")
  .option("-a, --adapter <name>", "Force specific adapter")
  .action(async (options) => {
    try {
      const result = await scanProject({
        dir: process.cwd(),
        outputDir: options.output,
        adapter: options.adapter,
      });
      
      console.log("\n✓ Scan complete!");
      console.log(`  Framework: ${result.framework}`);
      console.log(`  Modules: ${result.moduleCount}`);
      console.log(`  Routes: ${result.routeCount}`);
      console.log(`  Commands: ${result.commandCount}`);
      console.log(`  Files: ${result.fileCount}`);

      if (result.topics.length > 0) {
        console.log("\n  Topics:");
        const byStatus = new Map<string, typeof result.topics>();
        for (const t of result.topics) {
          const group = t.status;
          if (!byStatus.has(group)) byStatus.set(group, []);
          byStatus.get(group)!.push(t);
        }

        const statusOrder = ['new', 'stale', 'up_to_date', 'orphaned'];
        for (const status of statusOrder) {
          const group = byStatus.get(status);
          if (!group) continue;
          for (const t of group) {
            const icon =
              t.status === 'up_to_date' ? '  OK' :
              t.status === 'new' ? '   +' :
              t.status === 'stale' ? '   !' :
              '   ?';

            let detail = `${t.fileCount} files, ${t.routeCount} routes`;
            if (t.staleReason === 'files_changed' && t.staleDetails) {
              const parts: string[] = [];
              if (t.staleDetails.added?.length) parts.push(`+${t.staleDetails.added.length} files`);
              if (t.staleDetails.removed?.length) parts.push(`-${t.staleDetails.removed.length} files`);
              detail += ` (${parts.join(', ')})`;
            } else if (t.staleReason === 'content_changed' && t.staleDetails?.modified?.length) {
              detail += ` (${t.staleDetails.modified.length} modified)`;
            }

            console.log(`  ${icon} ${t.name.padEnd(20)} ${t.status.padEnd(12)} ${detail}`);
          }
        }
      }

      if (result.promptFiles.length > 0) {
        console.log("\n  Prompts generated:");
        for (const f of result.promptFiles) {
          console.log(`    - ${f}`);
        }
        console.log("\n  Next steps:");
        console.log("    1. Copy brain-topics-prompt.md to your LLM");
        console.log("    2. Save each topic response to brain-topics/[name].md");
      } else if (result.topics.length > 0) {
        console.log("\n  All topics up to date.");
      }

      console.log(`\n  Generated: ${result.brainPath}`);
      console.log(`  Prompt: ${result.promptPath}`);
    } catch (error: any) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

program
  .command("update")
  .description("Update brain files while preserving Business Context")
  .option("-o, --output <dir>", "Output directory", ".project")
  .option("-a, --adapter <name>", "Force specific adapter")
  .action(async (options) => {
    try {
      const result = await updateProject({
        dir: process.cwd(),
        outputDir: options.output,
        adapter: options.adapter,
      });
      
      console.log("\n✓ Update complete!");
      console.log(`  Framework: ${result.framework}`);
      console.log(`  Modules: ${result.moduleCount}`);
      console.log(`  Routes: ${result.routeCount}`);
      console.log(`  Commands: ${result.commandCount}`);
      console.log(`  Files: ${result.fileCount}`);
      if (result.contextPreserved) {
        console.log(`  Business Context: preserved`);
      }
      console.log(`\n  Updated: ${result.brainPath}`);
      console.log(`  Updated: ${result.promptPath}`);
    } catch (error: any) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

program
  .command("install")
  .description("Install brain configuration for your IDE")
  .argument("[ide]", "Target IDE (cursor, claude, opencode, windsurf, zed, all)")
  .option("-o, --output <dir>", "Output directory", ".project")
  .action(async (ide, options) => {
    try {
      await installIde({
        dir: process.cwd(),
        ide: ide,
        brainPath: `${options.output}/brain.md`,
        promptPath: `${options.output}/brain-prompt.md`,
      });
    } catch (error: any) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

program.parse();

```

### src/detect.ts
```typescript
import { detectFramework, getAdapters } from "./adapters/index.js";

export async function findBestAdapter(dir: string): Promise<{
  adapter: import("./types.ts").Adapter;
  match: import("./types.ts").AdapterMatch;
} | null> {
  const result = await detectFramework(dir);
  if (result) {
    return result;
  }

  // Fallback to generic adapter
  const adapters = getAdapters();
  const generic = adapters.find((a) => a.name === "generic");
  if (generic) {
    const match = await generic.detect(dir);
    return { adapter: generic, match };
  }

  return null;
}

```

### src/discover.ts
```typescript
import type { BrainData, Route, Command, Topic } from "./types.js";
import { TopicStatus } from "./types.js";

const GENERIC_TERMS = new Set([
  'service', 'controller', 'repository', 'entity', 'model', 'manager', 'handler',
  'factory', 'builder', 'provider', 'helper', 'util', 'utils', 'wrapper', 'adapter',
  'app', 'src', 'lib', 'bundle', 'component', 'module', 'interface', 'abstract', 'base',
  'api', 'http', 'request', 'response', 'json', 'xml', 'config', 'test', 'tests', 'spec',
  'index', 'main', 'default', 'types', 'type', 'class', 'const', 'enum',
]);

const EXPANSIONS: Record<string, string> = {
  'auth': 'authentication',
  'authz': 'authorization',
  'pay': 'payments',
  'usr': 'users',
  'notif': 'notifications',
  'msg': 'messaging',
  'inv': 'inventory',
  'rpt': 'reporting',
};

interface TermInfo {
  term: string;
  source: string;
  weight: number;
  files: Set<string>;
  totalScore: number;
}

function splitTerms(input: string): string[] {
  return input
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_\-./\\]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function normalizeTerm(term: string): string {
  let t = term.toLowerCase();
  if (t.endsWith('s') && t.length > 2) {
    t = t.slice(0, -1);
  }
  if (t.endsWith('ies') && t.length > 4) {
    t = t.slice(0, -3) + 'y';
  }
  return t;
}

function isBlacklisted(term: string): boolean {
  return GENERIC_TERMS.has(term);
}

function extractTermsFromPath(filePath: string): string[] {
  const parts = filePath.replace(/\.[^.]+$/, '').split(/[/\\]/);
  const terms: string[] = [];
  for (const part of parts) {
    const split = splitTerms(part);
    for (const raw of split) {
      const normalized = normalizeTerm(raw);
      if (normalized.length > 1 && !isBlacklisted(normalized)) {
        terms.push(normalized);
      }
    }
  }
  return terms;
}

function extractTermsFromName(name: string): string[] {
  const terms: string[] = [];
  const split = splitTerms(name);
  for (const raw of split) {
    const normalized = normalizeTerm(raw);
    if (normalized.length > 1 && !isBlacklisted(normalized)) {
      terms.push(normalized);
    }
  }
  return terms;
}

function addTerms(
  terms: string[],
  source: string,
  weight: number,
  file: string,
  occurrences: Map<string, TermInfo>,
): void {
  for (const term of terms) {
    if (!occurrences.has(term)) {
      occurrences.set(term, {
        term,
        source,
        weight,
        files: new Set(),
        totalScore: 0,
      });
    }
    const info = occurrences.get(term)!;
    info.files.add(file);
    info.totalScore += weight;
  }
}

function filterTerms(
  occurrences: Map<string, TermInfo>,
  allFiles: string[],
  minOccurrences: number,
  maxCoverage: number,
): Map<string, TermInfo> {
  const totalFileCount = allFiles.length || 1;
  const filtered = new Map<string, TermInfo>();
  for (const [term, info] of occurrences) {
    if (info.files.size < minOccurrences) continue;
    const coverage = info.files.size / totalFileCount;
    if (coverage > maxCoverage) continue;
    filtered.set(term, info);
  }
  return filtered;
}

function buildCooccurrenceMatrix(
  terms: Map<string, TermInfo>,
  allFiles: string[],
): Map<string, Map<string, number>> {
  const fileTerms = new Map<string, Set<string>>();
  for (const [term, info] of terms) {
    for (const file of info.files) {
      if (!fileTerms.has(file)) {
        fileTerms.set(file, new Set());
      }
      fileTerms.get(file)!.add(term);
    }
  }

  const matrix = new Map<string, Map<string, number>>();
  for (const [, termSet] of fileTerms) {
    const termList = [...termSet];
    for (let i = 0; i < termList.length; i++) {
      for (let j = i + 1; j < termList.length; j++) {
        const a = termList[i];
        const b = termList[j];
        if (!matrix.has(a)) matrix.set(a, new Map());
        if (!matrix.has(b)) matrix.set(b, new Map());
        matrix.get(a)!.set(b, (matrix.get(a)!.get(b) || 0) + 1);
        matrix.get(b)!.set(a, (matrix.get(b)!.get(a) || 0) + 1);
      }
    }
  }
  return matrix;
}

function findConnectedComponents(
  matrix: Map<string, Map<string, number>>,
  threshold: number,
): string[][] {
  const visited = new Set<string>();
  const components: string[][] = [];

  for (const node of matrix.keys()) {
    if (visited.has(node)) continue;
    const component: string[] = [];
    const stack = [node];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      component.push(current);
      const neighbors = matrix.get(current);
      if (neighbors) {
        for (const [neighbor, count] of neighbors) {
          if (count >= threshold && !visited.has(neighbor)) {
            stack.push(neighbor);
          }
        }
      }
    }
    if (component.length > 0) {
      components.push(component);
    }
  }

  return components;
}

function nameCluster(cluster: string[], termScores: Map<string, TermInfo>): string {
  let bestTerm = cluster[0];
  let bestScore = 0;
  for (const term of cluster) {
    const info = termScores.get(term);
    const score = info ? info.totalScore : 0;
    if (score > bestScore) {
      bestScore = score;
      bestTerm = term;
    }
  }
  return EXPANSIONS[bestTerm] || bestTerm;
}

function assignFilesToTopics(
  allFiles: string[],
  topics: Topic[],
): void {
  for (const file of allFiles) {
    const fileTerms = extractTermsFromPath(file);
    const termSet = new Set(fileTerms);
    for (const topic of topics) {
      const hasMatch = topic.keywords.some((k) => termSet.has(k));
      if (hasMatch) {
        topic.files.push(file);
      }
    }
  }
}

function assignRoutesToTopics(
  routes: Route[],
  topics: Topic[],
): void {
  for (const route of routes) {
    const routeTerms = [
      ...extractTermsFromPath(route.path),
      ...extractTermsFromName(route.name),
    ];
    const termSet = new Set(routeTerms);
    for (const topic of topics) {
      const hasMatch = topic.keywords.some((k) => termSet.has(k));
      if (hasMatch) {
        topic.routes.push(route);
      }
    }
  }
}

function assignCommandsToTopics(
  commands: Command[],
  topics: Topic[],
): void {
  for (const command of commands) {
    const cmdTerms = extractTermsFromName(command.name);
    const termSet = new Set(cmdTerms);
    for (const topic of topics) {
      const hasMatch = topic.keywords.some((k) => termSet.has(k));
      if (hasMatch) {
        topic.commands.push(command);
      }
    }
  }
}

export function discoverTopics(data: BrainData, allFiles: string[]): Topic[] {
  const occurrences = new Map<string, TermInfo>();

  for (const route of data.routes) {
    const pathTerms = extractTermsFromPath(route.path);
    const nameTerms = extractTermsFromName(route.name);
    const controllerTerms = route.controller
      ? extractTermsFromName(route.controller)
      : [];

    const file = route.file || route.path;
    addTerms(pathTerms, 'route-path', 2.5, file, occurrences);
    addTerms(nameTerms, 'route-name', 2.0, file, occurrences);
    addTerms(controllerTerms, 'controller', 1.5, file, occurrences);
  }

  for (const command of data.commands) {
    const nameTerms = extractTermsFromName(command.name);
    addTerms(nameTerms, 'command', 2.0, command.name, occurrences);
  }

  for (const mod of data.modules) {
    const nameTerms = extractTermsFromName(mod.name);
    const pathTerms = extractTermsFromPath(mod.path);
    addTerms(nameTerms, 'module', 3.0, mod.path, occurrences);
    addTerms(pathTerms, 'module-path', 3.0, mod.path, occurrences);
  }

  for (const keyFile of data.keyFiles) {
    const fileTerms = extractTermsFromPath(keyFile.path);
    addTerms(fileTerms, 'keyfile', 1.0, keyFile.path, occurrences);
  }

  for (const file of allFiles) {
    const fileTerms = extractTermsFromPath(file);
    addTerms(fileTerms, 'file', 1.0, file, occurrences);
  }

  const significantTerms = filterTerms(occurrences, allFiles, 3, 0.4);

  if (significantTerms.size === 0) {
    return [{
      name: 'general',
      keywords: [],
      files: [...allFiles],
      routes: [...data.routes],
      commands: [...data.commands],
      status: TopicStatus.New,
    }];
  }

  const cooccurrence = buildCooccurrenceMatrix(significantTerms, allFiles);

  const clusters = findConnectedComponents(cooccurrence, 2);

  const standaloneTerms: string[] = [];
  const significantKeys = new Set(significantTerms.keys());
  const clusteredTerms = new Set(clusters.flat());
  for (const term of significantKeys) {
    if (!clusteredTerms.has(term)) {
      standaloneTerms.push(term);
    }
  }
  for (const term of standaloneTerms) {
    clusters.push([term]);
  }

  const topics: Topic[] = clusters
    .map((cluster) => ({
      name: nameCluster(cluster, significantTerms),
      keywords: [...cluster],
      files: [] as string[],
      routes: [] as Route[],
      commands: [] as Command[],
      status: TopicStatus.New,
    }))
    .filter((topic) => topic.keywords.length > 0);

  assignFilesToTopics(allFiles, topics);
  assignRoutesToTopics(data.routes, topics);
  assignCommandsToTopics(data.commands, topics);

  const finalTopics = topics.filter((t) => t.files.length > 0);

  if (finalTopics.length === 0 && allFiles.length > 0) {
    return [{
      name: 'general',
      keywords: [],
      files: [...allFiles],
      routes: [...data.routes],
      commands: [...data.commands],
      status: TopicStatus.New,
    }];
  }

  return finalTopics;
}

export function mergeOverlappingTopics(topics: Topic[], threshold: number = 0.6): Topic[] {
  if (topics.length <= 1) return topics;

  const merged: boolean[] = new Array(topics.length).fill(false);
  const result: Topic[] = [];

  for (let i = 0; i < topics.length; i++) {
    if (merged[i]) continue;

    const current = { ...topics[i] };
    current.files = [...topics[i].files];
    current.routes = [...topics[i].routes];
    current.commands = [...topics[i].commands];
    current.keywords = [...topics[i].keywords];

    for (let j = i + 1; j < topics.length; j++) {
      if (merged[j]) continue;

      const filesA = new Set(current.files);
      const filesB = new Set(topics[j].files);
      const intersection = [...filesA].filter((f) => filesB.has(f)).length;
      const union = new Set([...current.files, ...topics[j].files]).size;

      if (union > 0 && intersection / union >= threshold) {
        const newKeywords = new Set([...current.keywords, ...topics[j].keywords]);
        current.keywords = [...newKeywords];
        current.files = [...new Set([...current.files, ...topics[j].files])];
        current.routes = [...new Map([...current.routes, ...topics[j].routes].map((r) => [r.name, r])).values()];
        current.commands = [...new Map([...current.commands, ...topics[j].commands].map((c) => [c.name, c])).values()];
        merged[j] = true;
      }
    }

    result.push(current);
  }

  return result;
}

```

### src/install.ts
```typescript
import { writeFile, readFile, stat, mkdir } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

export interface InstallOptions {
  dir: string;
  ide?: string;
  brainPath: string;
  promptPath: string;
}

interface IdeConfig {
  name: string;
  file: string;
  content: (brainPath: string) => string;
  commentStyle: 'hash' | 'html' | 'markdown';
  generatePrompt: (promptPath: string, brainPath: string) => string;
}

const MARKER_START = 'BRAIN:START';
const MARKER_END = 'BRAIN:END';

function getMarkerRegex(commentStyle: 'hash' | 'html' | 'markdown'): RegExp {
  if (commentStyle === 'hash') {
    return new RegExp(
      `#\\s*===\\s*${MARKER_START}\\s*===[\\s\\S]*?#\\s*===\\s*${MARKER_END}\\s*===`,
      'g'
    );
  }
  return new RegExp(
    `<!--\\s*${MARKER_START}[\\s\\S]*?${MARKER_END}\\s*-->`,
    'g'
  );
}

function wrapWithMarkers(content: string, commentStyle: 'hash' | 'html' | 'markdown'): string {
  if (commentStyle === 'hash') {
    return `# === ${MARKER_START} ===
${content}
# === ${MARKER_END} ===`;
  }
  return `<!-- ${MARKER_START} -->
${content}
<!-- ${MARKER_END} -->`;
}

const IDE_CONFIGS: Record<string, IdeConfig> = {
  cursor: {
    name: "Cursor",
    file: ".cursorrules",
    commentStyle: 'hash',
    content: (brainPath) => `Read ${brainPath} first for project context.
Use navigation commands listed there for live data.

Quick commands:
- Routes: php bin/console debug:router
- Services: php bin/console debug:container
- Tests: php bin/phpunit`,
    generatePrompt: (promptPath, brainPath) => 
`Read ${promptPath} and generate the business context for this project.

Then write your response to ${brainPath} under the "## Business Context" section.

Format your response as:
## Business Context

### Purpose
<1-2 sentences>

### Flows
<key business flows>

### Concepts
<domain terms>

### Gotchas
<surprising behaviors>

### Decisions
<architecture choices>`,
  },
  claude: {
    name: "Claude Code",
    file: "CLAUDE.md",
    commentStyle: 'markdown',
    content: (brainPath) => `Read \`${brainPath}\` first for project context.

Use navigation commands listed there for live data.

### Quick Commands
- Routes: \`php bin/console debug:router\`
- Services: \`php bin/console debug:container\`
- Tests: \`php bin/phpunit\``,
    generatePrompt: (promptPath, brainPath) => 
`Read ${promptPath} and generate the business context for this project.

Then write your response to ${brainPath} under the "## Business Context" section.

Format your response as:
## Business Context

### Purpose
<1-2 sentences>

### Flows
<key business flows>

### Concepts
<domain terms>

### Gotchas
<surprising behaviors>

### Decisions
<architecture choices>`,
  },
  opencode: {
    name: "Opencode",
    file: ".opencode/rules.md",
    commentStyle: 'markdown',
    content: (brainPath) => `Read \`${brainPath}\` first for project context.

Use navigation commands listed there for live data.

### Quick Commands
- Routes: \`php bin/console debug:router\`
- Services: \`php bin/console debug:container\`
- Tests: \`php bin/phpunit\``,
    generatePrompt: (promptPath, brainPath) => 
`Read ${promptPath} and generate the business context for this project.

Then write your response to ${brainPath} under the "## Business Context" section.`,
  },
  windsurf: {
    name: "Windsurf",
    file: ".windsurfrules",
    commentStyle: 'hash',
    content: (brainPath) => `Read ${brainPath} first for project context.
Use navigation commands listed there for live data.`,
    generatePrompt: (promptPath, brainPath) => 
`Read ${promptPath} and generate the business context for this project.

Then write your response to ${brainPath} under the "## Business Context" section.`,
  },
  zed: {
    name: "Zed",
    file: ".zed/rules.md",
    commentStyle: 'markdown',
    content: (brainPath) => `Read \`${brainPath}\` first for project context.

Use navigation commands listed there for live data.`,
    generatePrompt: (promptPath, brainPath) => 
`Read ${promptPath} and generate the business context for this project.

Then write your response to ${brainPath} under the "## Business Context" section.`,
  },
};

const AVAILABLE_IDES = Object.keys(IDE_CONFIGS);

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function promptIde(): Promise<string> {
  const rl = createInterface({ input, output });
  
  console.log("\nSelect your IDE:\n");
  AVAILABLE_IDES.forEach((ide, i) => {
    console.log(`  ${i + 1}. ${IDE_CONFIGS[ide].name}`);
  });
  console.log(`  ${AVAILABLE_IDES.length + 1}. All (install for every IDE)\n`);
  
  const answer = await rl.question("Choice [1-" + (AVAILABLE_IDES.length + 1) + "]: ");
  rl.close();
  
  const choice = parseInt(answer, 10);
  if (choice >= 1 && choice <= AVAILABLE_IDES.length) {
    return AVAILABLE_IDES[choice - 1];
  }
  if (choice === AVAILABLE_IDES.length + 1) {
    return "all";
  }
  
  throw new Error("Invalid choice");
}

async function installForIde(dir: string, ideKey: string, brainPath: string): Promise<void> {
  const config = IDE_CONFIGS[ideKey];
  if (!config) {
    throw new Error(`Unknown IDE: ${ideKey}`);
  }
  
  const filePath = path.join(dir, config.file);
  const newContent = wrapWithMarkers(config.content(brainPath), config.commentStyle);
  
  // Ensure directory exists for nested paths
  const dirPath = path.dirname(filePath);
  await mkdir(dirPath, { recursive: true }).catch(() => {});
  
  // Check if file exists
  const exists = await fileExists(filePath);
  
  if (!exists) {
    await writeFile(filePath, newContent, "utf8");
    console.log(`  ✓ Created ${config.file}`);
    return;
  }
  
  // Read existing content
  const existingContent = await readFile(filePath, "utf8");
  const markerRegex = getMarkerRegex(config.commentStyle);
  
  if (markerRegex.test(existingContent)) {
    const updatedContent = existingContent.replace(markerRegex, newContent);
    await writeFile(filePath, updatedContent, "utf8");
    console.log(`  ✓ Updated brain section in ${config.file}`);
  } else {
    const separator = config.commentStyle === 'hash' ? '\n\n' : '\n\n---\n\n';
    const updatedContent = existingContent.trimEnd() + separator + newContent + '\n';
    await writeFile(filePath, updatedContent, "utf8");
    console.log(`  ✓ Appended brain section to ${config.file}`);
  }
}

function printGeneratePrompt(ideKey: string, promptPath: string, brainPath: string): void {
  const config = IDE_CONFIGS[ideKey];
  if (!config) return;
  
  const prompt = config.generatePrompt(promptPath, brainPath);
  
  console.log("\n" + "━".repeat(60));
  console.log("📋 Copy this prompt to your IDE's chat:");
  console.log("━".repeat(60) + "\n");
  console.log(prompt);
  console.log("\n" + "━".repeat(60));
  console.log("After pasting, the LLM will update " + brainPath);
  console.log("━".repeat(60));
}

export async function installIde(options: InstallOptions): Promise<void> {
  const { dir, ide, brainPath, promptPath } = options;
  
  // Validate brain.md exists
  const brainFile = path.join(dir, brainPath);
  if (!await fileExists(brainFile)) {
    throw new Error(`Brain file not found: ${brainPath}. Run 'brain scan' first.`);
  }
  
  let targetIde = ide?.toLowerCase();
  
  // If no IDE specified, prompt user
  if (!targetIde) {
    targetIde = await promptIde();
  }
  
  console.log("\nInstalling brain configuration...\n");
  
  if (targetIde === "all") {
    for (const ideKey of AVAILABLE_IDES) {
      await installForIde(dir, ideKey, brainPath);
    }
  } else if (IDE_CONFIGS[targetIde]) {
    await installForIde(dir, targetIde, brainPath);
    
    // Show the generate prompt for single IDE install
    printGeneratePrompt(targetIde, promptPath, brainPath);
  } else {
    throw new Error(`Unknown IDE: ${targetIde}. Available: ${AVAILABLE_IDES.join(", ")}, all`);
  }
  
  console.log("\n✓ Done!");
}

```

### src/output.ts
```typescript
import type { BrainData, Module, Route, Command, Topic, TopicMetadata, TopicMeta } from "./types.js";
import { TopicStatus } from "./types.js";
import { readFile, stat, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { hashFile } from "./stale.js";

const MAX_FILES = 10;
const MAX_TOKENS = 20000;

function estimateTokens(content: string): number {
  return Math.ceil(content.length / 4);
}

function formatDate(date: Date): string {
  return date.toISOString().split(".")[0] + "Z";
}

export function formatBrainMd(data: BrainData, dir: string, businessContext?: string, topics?: Topic[]): string {
  const lines: string[] = [];

  // Header
  lines.push(`# 🧠 Project Brain`);
  lines.push(`> Generated: ${formatDate(new Date())} · ${data.framework} · ${data.fileCount} files`);
  lines.push("");

  // At a Glance
  lines.push("## At a Glance");
  lines.push(`- **Modules**: ${data.modules.map((m) => m.name).join(", ") || "none detected"}`);
  lines.push(`- **Routes**: ${data.routes.length} HTTP endpoints`);
  lines.push(`- **Commands**: ${data.commands.length} CLI commands`);
  lines.push(`- **Key Files**: ${data.keyFiles.length} identified`);
  lines.push("");

  // Modules
  if (data.modules.length > 0) {
    lines.push("## Modules");
    lines.push("");
    for (const mod of data.modules) {
      lines.push(`### ${mod.name}`);
      lines.push(`- **Path**: \`${mod.path}\``);
      if (mod.dependsOn.length > 0) {
        lines.push(`- **Depends on**: ${mod.dependsOn.map((d) => `\`${d}\``).join(", ")}`);
      }
      lines.push("");
    }
  }

  // Routes (filtered, grouped by module)
  const businessRoutes = data.routes.filter((r) => !r.name.startsWith("_") && !r.name.startsWith("_wdt") && !r.name.startsWith("_profiler"));
  const technicalRoutes = data.routes.length - businessRoutes.length;
  
  if (businessRoutes.length > 0) {
    lines.push("## Routes");
    lines.push("");
    lines.push(`Total: ${data.routes.length} (${businessRoutes.length} business, ${technicalRoutes} technical)`);
    lines.push("");
    
    // Group by module
    const routesByModule = new Map<string, typeof businessRoutes>();
    const routesNoModule: typeof businessRoutes = [];
    
    for (const route of businessRoutes) {
      if (route.module) {
        if (!routesByModule.has(route.module)) {
          routesByModule.set(route.module, []);
        }
        routesByModule.get(route.module)!.push(route);
      } else {
        routesNoModule.push(route);
      }
    }
    
    // Output routes by module
    for (const [mod, routes] of routesByModule) {
      const modName = mod.charAt(0).toUpperCase() + mod.slice(1);
      lines.push(`### ${modName}`);
      lines.push("");
      lines.push("| Route | Method | Path |");
      lines.push("|-------|--------|------|");
      for (const r of routes.slice(0, 20)) {
        const method = r.methods?.[0] || "GET";
        const shortName = r.name.length > 30 ? r.name.substring(0, 27) + "..." : r.name;
        lines.push(`| ${shortName} | ${method} | \`${r.path}\` |`);
      }
      if (routes.length > 20) {
        lines.push(`| ... | ... | _+${routes.length - 20} more_ |`);
      }
      lines.push("");
    }
    
    // Routes without module
    if (routesNoModule.length > 0 && routesNoModule.length <= 30) {
      lines.push(`### Other`);
      lines.push("");
      lines.push("| Route | Method | Path |");
      lines.push("|-------|--------|------|");
      for (const r of routesNoModule.slice(0, 20)) {
        const method = r.methods?.[0] || "GET";
        lines.push(`| ${r.name} | ${method} | \`${r.path}\` |`);
      }
      if (routesNoModule.length > 20) {
        lines.push(`| ... | ... | _+${routesNoModule.length - 20} more_ |`);
      }
      lines.push("");
    }
    
    lines.push(`CLI: \`php bin/console debug:router\` for full list`);
    lines.push("");
  }

  // Navigation
  lines.push("## Navigation (CLI)");
  lines.push("```bash");
  for (const nav of data.conventions.navigation || []) {
    lines.push(`# ${nav.description}`);
    lines.push(nav.command);
    lines.push("");
  }
  lines.push("```");
  lines.push("");

  // Conventions
  if (data.conventions.standards.length > 0 || data.conventions.notes.length > 0) {
    lines.push("## Conventions");
    if (data.conventions.standards.length > 0) {
      lines.push(`- **Standards**: ${data.conventions.standards.join(", ")}`);
    }
    for (const note of data.conventions.notes) {
      lines.push(`- ${note}`);
    }
    lines.push("");
  }

  // Quick Find
  lines.push("## Quick Find");
  lines.push("");
  lines.push("| I need to... | Look in... |");
  lines.push("|-------------|------------|");
  for (const mapping of data.quickFind) {
    lines.push(`| ${mapping.task} | \`${mapping.location}\` |`);
  }
  lines.push("");

  // Business Context (if provided - preserved from update)
  if (businessContext) {
    lines.push(businessContext);
    lines.push("");
  }

  // Topics
  if (topics && topics.length > 0) {
    const topicsSection = formatTopicsSection(topics);
    if (topicsSection) {
      lines.push(topicsSection);
    }
  }

  // Meta
  lines.push("## Meta");
  lines.push("");
  lines.push("| Property | Value |");
  lines.push("|----------|-------|");
  lines.push(`| Framework | ${data.framework} |`);
  lines.push(`| Files scanned | ${data.fileCount} |`);
  lines.push(`| Generated | ${formatDate(new Date())} |`);
  lines.push("");
  lines.push("### When to Refresh");
  lines.push("- **Re-run `brain scan`** when: adding/removing modules, major refactoring");
  lines.push("- **Re-run `brain prompt`** when: business logic changes significantly");

  return lines.join("\n");
}

export async function formatBrainPromptMd(data: BrainData, dir: string): Promise<string> {
  const lines: string[] = [];

  lines.push("# LLM Context Prompt");
  lines.push("");
  lines.push("TASK: analyze codebase → explain business context");
  lines.push("");
  lines.push("## Project");
  lines.push("");
  lines.push(`| Property | Value |`);
  lines.push(`|----------|-------|`);
  lines.push(`| Framework | ${data.framework} |`);
  lines.push(`| Modules | ${data.modules.length} |`);
  lines.push(`| Routes | ${data.routes.length} |`);
  lines.push(`| Commands | ${data.commands.length} |`);
  lines.push("");

  if (data.modules.length > 0) {
    lines.push("### Modules");
    for (const mod of data.modules.slice(0, 10)) {
      lines.push(`- ${mod.name}: \`${mod.path}\``);
    }
    lines.push("");
  }

  // Select key files for prompt
  const selectedFiles = await selectKeyFiles(data, dir);

  if (selectedFiles.length > 0) {
    lines.push("## Key Files");
    lines.push("");

    for (const file of selectedFiles) {
      lines.push(`### ${file.relativePath}`);
      lines.push("```" + inferLanguage(file.relativePath));
      lines.push(file.content);
      lines.push("```");
      lines.push("");
    }
  }

  lines.push("---");
  lines.push("");
  lines.push("## Instructions");
  lines.push("");
  lines.push("OUTPUT: markdown section for brain.md");
  lines.push("");
  lines.push("PROVIDE:");
  lines.push("```md");
  lines.push("## Business Context");
  lines.push("");
  lines.push("### Purpose");
  lines.push("<1-2 sentences: what system does>");
  lines.push("");
  lines.push("### Flows");
  lines.push("<key business flows: step → class/service>");
  lines.push("");
  lines.push("### Concepts");
  lines.push("<domain terms: term = definition>");
  lines.push("");
  lines.push("### Gotchas");
  lines.push("<surprising behaviors, edge cases>");
  lines.push("");
  lines.push("### Decisions");
  lines.push("<architecture choices: why X>");
  lines.push("```");
  lines.push("");
  lines.push("STYLE:");
  lines.push("- keywords > sentences");
  lines.push("- bullet points > paragraphs");
  lines.push("- code references: `ClassName::method`");
  lines.push("- be concise, token-efficient");

  return lines.join("\n");
}

async function selectKeyFiles(
  data: BrainData,
  dir: string
): Promise<Array<{ relativePath: string; content: string }>> {
  const files: Array<{ relativePath: string; content: string; priority: number }> = [];
  let totalTokens = 0;

  // Prioritize: controllers, services, domain models
  const priorityPatterns = [
    { pattern: /Controller/, priority: 10 },
    { pattern: /Service/, priority: 9 },
    { pattern: /Repository/, priority: 8 },
    { pattern: /Entity/, priority: 7 },
    { pattern: /Model/, priority: 6 },
  ];

  for (const keyFile of data.keyFiles.slice(0, MAX_FILES * 2)) {
    if (files.length >= MAX_FILES) break;

    const filePath = path.join(dir, keyFile.path);
    try {
      await stat(filePath);
      const content = await readFile(filePath, "utf8");
      const tokens = estimateTokens(content);

      if (totalTokens + tokens > MAX_TOKENS) continue;

      // Calculate priority
      let priority = 5;
      for (const { pattern, priority: p } of priorityPatterns) {
        if (pattern.test(keyFile.path) || pattern.test(keyFile.role)) {
          priority = p;
          break;
        }
      }

      files.push({ relativePath: keyFile.path, content, priority });
      totalTokens += tokens;
    } catch {
      // File doesn't exist or can't be read
    }
  }

  // Sort by priority and return
  return files
    .sort((a, b) => b.priority - a.priority)
    .slice(0, MAX_FILES);
}

function inferLanguage(filePath: string): string {
  const ext = path.extname(filePath);
  const langMap: Record<string, string> = {
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".php": "php",
    ".py": "python",
    ".rb": "ruby",
    ".go": "go",
    ".rs": "rust",
    ".java": "java",
    ".json": "json",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".md": "markdown",
  };
  return langMap[ext] || "";
}

export function formatDraftTopicMd(topic: Topic): string {
  const lines: string[] = [];
  lines.push(`# ${topic.name}`);
  lines.push(`> DRAFT — Auto-generated, may be incomplete`);
  lines.push("");

  lines.push("## Keywords");
  lines.push(topic.keywords.map((k) => `\`${k}\``).join(", "));
  lines.push("");

  lines.push(`## Files (${topic.files.length})`);
  for (const f of topic.files) {
    lines.push(`- \`${f}\``);
  }
  lines.push("");

  if (topic.routes.length > 0) {
    lines.push(`## Routes (${topic.routes.length})`);
    lines.push("| Method | Path | Name |");
    lines.push("|--------|------|------|");
    for (const r of topic.routes) {
      const method = r.methods?.[0] || "GET";
      lines.push(`| ${method} | ${r.path} | ${r.name} |`);
    }
    lines.push("");
  }

  if (topic.commands.length > 0) {
    lines.push(`## Commands (${topic.commands.length})`);
    for (const cmd of topic.commands) {
      const desc = cmd.description ? ` — ${cmd.description}` : "";
      lines.push(`- \`${cmd.name}\`${desc}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

async function ensureDir(dir: string): Promise<void> {
  try {
    await mkdir(dir, { recursive: true });
  } catch (error: any) {
    if (error.code !== "EEXIST") throw error;
  }
}

export async function writeDraftTopics(topicsDir: string, topics: Topic[]): Promise<void> {
  const draftDir = path.join(topicsDir, ".draft");
  await ensureDir(draftDir);

  for (const topic of topics) {
    const filePath = path.join(draftDir, `${topic.name}.md`);
    const content = formatDraftTopicMd(topic);
    await writeFile(filePath, content, "utf8");
  }
}

function getFilePriority(p: string): number {
  if (/Controller/.test(p)) return 10;
  if (/Service/.test(p)) return 9;
  if (/(Entity|Model)/.test(p)) return 8;
  if (/Repository/.test(p)) return 7;
  if (/config/i.test(p)) return 6;
  if (/test/i.test(p)) return 3;
  return 5;
}

interface KeyFileContent {
  relativePath: string;
  content: string;
}

async function selectKeyFilesForTopic(
  topic: Topic,
  projectDir: string,
  maxTokens: number,
): Promise<KeyFileContent[]> {
  const candidates = topic.files
    .map((f) => ({
      path: f,
      priority: getFilePriority(f),
    }))
    .sort((a, b) => b.priority - a.priority);

  const selected: KeyFileContent[] = [];
  let tokens = 0;

  for (const candidate of candidates.slice(0, 10)) {
    const fullPath = path.join(projectDir, candidate.path);
    try {
      const content = await readFile(fullPath, "utf8");
      const fileTokens = estimateTokens(content);
      if (tokens + fileTokens > maxTokens) continue;
      selected.push({ relativePath: candidate.path, content });
      tokens += fileTokens;
    } catch {
      continue;
    }
  }

  return selected;
}

export async function formatTopicPromptMd(
  topics: Topic[],
  projectDir: string,
  data: BrainData,
): Promise<string> {
  const lines: string[] = [];

  lines.push("# Paste this into your LLM");
  lines.push("");
  lines.push("You are enriching auto-generated \"topic\" files for a codebase.");
  lines.push("These topics help future LLM sessions quickly find relevant files.");
  lines.push("");

  lines.push(`## Project: ${data.framework}`);
  lines.push("");
  lines.push("| Property | Value |");
  lines.push("|----------|-------|");
  lines.push(`| Framework | ${data.framework} |`);
  lines.push(`| Files | ${data.fileCount} |`);
  lines.push(`| Routes | ${data.routes.length} |`);
  lines.push("");

  lines.push("## Instructions");
  lines.push("");
  lines.push("For each topic draft below:");
  lines.push("");
  lines.push("1. **Validate** — Remove files that aren't actually relevant");
  lines.push("2. **Complete** — Add missing files (check imports, dependencies)");
  lines.push("3. **Organize** — Split into \"Core Files\" (essential) and \"Related Files\"");
  lines.push("4. **Summarize** — Add a brief overview of how this domain works");
  lines.push("5. **Flow** — Document key flows if applicable (login, payment, etc.)");
  lines.push("6. **Gotchas** — Note any non-obvious details");
  lines.push("");

  const staleNew = topics.filter(
    (t) => t.status === TopicStatus.New || t.status === TopicStatus.Stale,
  );

  for (let i = 0; i < staleNew.length; i++) {
    const topic = staleNew[i];
    lines.push(`## Topic ${i + 1}/${staleNew.length}: ${topic.name}`);
    lines.push("");
    lines.push("### Draft");
    lines.push("| Property | Value |");
    lines.push("|----------|-------|");
    lines.push(`| Keywords | ${topic.keywords.join(", ")} |`);
    lines.push(`| Files | ${topic.files.length} |`);
    lines.push(`| Routes | ${topic.routes.length} |`);
    lines.push(`| Commands | ${topic.commands.length} |`);
    lines.push("");

    if (topic.files.length > 0) {
      lines.push("**Files detected:**");
      for (const f of topic.files) {
        lines.push(`- \`${f}\``);
      }
      lines.push("");
    }

    if (topic.routes.length > 0) {
      lines.push("**Routes detected:**");
      lines.push("| Method | Path | Name |");
      lines.push("|--------|------|------|");
      for (const r of topic.routes) {
        lines.push(`| ${r.methods?.[0] || "GET"} | ${r.path} | ${r.name} |`);
      }
      lines.push("");
    }

    const keyFiles = await selectKeyFilesForTopic(topic, projectDir, 5000);
    if (keyFiles.length > 0) {
      lines.push("### Key Files Content");
      lines.push("");
      for (const kf of keyFiles) {
        lines.push(`#### ${kf.relativePath}`);
        lines.push("```" + inferLanguage(kf.relativePath));
        lines.push(kf.content);
        lines.push("```");
        lines.push("");
      }
    }
  }

  lines.push("## Output Format");
  lines.push("");
  lines.push("Separate each topic with `---TOPIC---`:");
  lines.push("");
  lines.push("---TOPIC---");
  lines.push(`# [topic-name]`);
  lines.push("");
  lines.push("## Overview");
  lines.push("<Brief description of this domain>");
  lines.push("");
  lines.push("## Core Files");
  lines.push("| File | Role |");
  lines.push("|------|------|");
  lines.push("| ... | ... |");
  lines.push("");
  lines.push("## Related Files");
  lines.push("| File | Role |");
  lines.push("|------|------|");
  lines.push("| ... | ... |");
  lines.push("");
  lines.push("## Flow");
  lines.push("<key flows if applicable>");
  lines.push("");
  lines.push("## Routes");
  lines.push("| Method | Path | Description |");
  lines.push("|--------|------|-------------|");
  lines.push("| ... | ... | ... |");
  lines.push("");
  lines.push("## Commands");
  lines.push("- `command:name` — description");
  lines.push("");
  lines.push("## Gotchas");
  lines.push("<non-obvious details, edge cases>");
  lines.push("---TOPIC---");

  return lines.join("\n");
}

export async function formatSingleTopicPromptMd(
  topic: Topic,
  projectDir: string,
  data: BrainData,
): Promise<string> {
  const lines: string[] = [];

  lines.push("# Paste this into your LLM");
  lines.push("");
  lines.push("You are enriching an auto-generated \"topic\" file for a codebase.");
  lines.push("This topic helps future LLM sessions quickly find relevant files.");
  lines.push("");

  lines.push(`## Project: ${data.framework} (${data.fileCount} files)`);
  lines.push("");

  lines.push("## Instructions");
  lines.push("");
  lines.push("1. **Validate** — Remove files that aren't actually relevant");
  lines.push("2. **Complete** — Add missing files (check imports, dependencies)");
  lines.push("3. **Organize** — Split into \"Core Files\" and \"Related Files\"");
  lines.push("4. **Summarize** — Add overview of how this domain works");
  lines.push("5. **Flow** — Document key flows if applicable");
  lines.push("6. **Gotchas** — Note non-obvious details");
  lines.push("");

  lines.push(`## Topic: ${topic.name}`);
  lines.push("");
  lines.push("| Property | Value |");
  lines.push("|----------|-------|");
  lines.push(`| Keywords | ${topic.keywords.join(", ")} |`);
  lines.push(`| Files | ${topic.files.length} |`);
  lines.push(`| Routes | ${topic.routes.length} |`);
  lines.push(`| Commands | ${topic.commands.length} |`);
  lines.push("");

  if (topic.files.length > 0) {
    lines.push("**Files detected:**");
    for (const f of topic.files) {
      lines.push(`- \`${f}\``);
    }
    lines.push("");
  }

  const keyFiles = await selectKeyFilesForTopic(topic, projectDir, 5000);
  if (keyFiles.length > 0) {
    lines.push("### Key Files Content");
    lines.push("");
    for (const kf of keyFiles) {
      lines.push(`#### ${kf.relativePath}`);
      lines.push("```" + inferLanguage(kf.relativePath));
      lines.push(kf.content);
      lines.push("```");
      lines.push("");
    }
  }

  lines.push("## Output Format");
  lines.push("");
  lines.push("---TOPIC---");
  lines.push(`# ${topic.name}`);
  lines.push("");
  lines.push("## Overview");
  lines.push("<Brief description>");
  lines.push("");
  lines.push("## Core Files");
  lines.push("| File | Role |");
  lines.push("|------|------|");
  lines.push("");
  lines.push("## Related Files");
  lines.push("| File | Role |");
  lines.push("|------|------|");
  lines.push("");
  lines.push("## Flow");
  lines.push("<key flows>");
  lines.push("");
  lines.push("## Routes");
  lines.push("| Method | Path | Description |");
  lines.push("|--------|------|-------------|");
  lines.push("");
  lines.push("## Commands");
  lines.push("- `command:name` — description");
  lines.push("");
  lines.push("## Gotchas");
  lines.push("<non-obvious details>");
  lines.push("---TOPIC---");

  return lines.join("\n");
}

export async function writeTopicPrompts(
  outputDir: string,
  topicsDir: string,
  topics: Topic[],
  projectDir: string,
  data: BrainData,
): Promise<string[]> {
  const staleNew = topics.filter(
    (t) => t.status === TopicStatus.New || t.status === TopicStatus.Stale,
  );

  const written: string[] = [];

  if (staleNew.length === 0) return written;

  const globalPrompt = await formatTopicPromptMd(staleNew, projectDir, data);
  const globalPromptPath = path.join(outputDir, "brain-topics-prompt.md");
  await writeFile(globalPromptPath, globalPrompt, "utf8");
  written.push(globalPromptPath);

  await ensureDir(topicsDir);
  for (const topic of staleNew) {
    const singlePrompt = await formatSingleTopicPromptMd(topic, projectDir, data);
    const promptPath = path.join(topicsDir, `${topic.name}-prompt.md`);
    await writeFile(promptPath, singlePrompt, "utf8");
    written.push(promptPath);
  }

  return written;
}

export function formatTopicsSection(topics: Topic[]): string {
  if (topics.length === 0) return "";

  const lines: string[] = [];
  lines.push("## Topics");
  lines.push("");

  for (const topic of topics) {
    const statusIcon =
      topic.status === TopicStatus.UpToDate ? "OK" :
      topic.status === TopicStatus.New ? "+" :
      topic.status === TopicStatus.Stale ? "!" :
      "?";
    lines.push(`- **${topic.name}** [${statusIcon}] — ${topic.files.length} files, ${topic.routes.length} routes`);
  }

  lines.push("");
  lines.push("See `.project/brain-topics/` for topic details.");
  lines.push("");

  return lines.join("\n");
}

```

---

## Instructions

OUTPUT: markdown section for brain.md

PROVIDE:
```md
## Business Context

### Purpose
<1-2 sentences: what system does>

### Flows
<key business flows: step → class/service>

### Concepts
<domain terms: term = definition>

### Gotchas
<surprising behaviors, edge cases>

### Decisions
<architecture choices: why X>
```

STYLE:
- keywords > sentences
- bullet points > paragraphs
- code references: `ClassName::method`
- be concise, token-efficient