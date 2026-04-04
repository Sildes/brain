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
│   │   ├── Business Context  ← Section remplie par le LLM ✓
│   │   └── Meta              ← Métadonnées
│   │
│   └── brain-prompt.md       ← Fichiers clés + instructions pour le LLM
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
│   │   ├── Business Context  ← Section filled by LLM ✓
│   │   └── Meta              ← Metadata
│   │
│   └── brain-prompt.md       ← Key files + instructions for LLM
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
