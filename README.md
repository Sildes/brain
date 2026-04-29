# Project Brain

Génère un contexte structuré pour les LLMs à partir de votre code. Un scan local produit des fichiers que votre IDE charge automatiquement pour donner à votre assistant une compréhension parfaite de votre projet.

## Architecture

```
+-------------------+      +------------------+      +-------------------+
|                   |      |                  |      |                   |
|   Codebase        | ---> |   brain scan     | ---> |  Fichiers context |
|                   |      |                  |      |                   |
+-------------------+      +------------------+      +-------------------+
                                                        |
                                                        v
                                                +-------------------+
                                                |                   |
                                                |   Chargement      |
                                                |   automatique     |
                                                |   par IDE         |
                                                |                   |
                                                +-------------------+
```

**Comment ça marche :**
1. Brain scanne votre codebase et détecte sa structure
2. Il génère des fichiers de contexte structurés
3. Votre IDE (Cursor, Claude Code, Opencode, Windsurf, Zed) les charge automatiquement
4. Le LLM connait maintenant votre projet sans que vous ayez à l'expliquer

## Pipeline complet

```
+------------------------------------------+       +-----------+       +----------+
|                                          |       |           |       |          |
|              brain scan                  |  -->  |  ENRICH   |  -->  | INSTALL  |
|                                          |       |           |       |          |
+------------------------------------------+       +-----------+       +----------+
  |        |         |         |                |                   |
  v        v         v         v                v                   v
brain.md  topics   prompts  .agent/      LLM enrichit        Config IDE
          drafts   (auto)              les topics avec     + .agent/
                                        contexte métier
```

**Étape 1 - SCAN** (`brain scan`)
- Détecte le framework (Symfony, Laravel, Next.js, générique)
- Extrait les modules, routes et commandes
- Découvre les topics (clusters de code liés)
- Génère `.projectbrain/brain.md`, les drafts, les prompts d'enrichissement, `.agent/`

**Étape 2 - ENRICH** (via votre LLM)
- Le prompt global est déjà généré par le scan (`brain-topics-prompt.md`)
- Copiez-le dans votre chat LLM
- Le LLM met à jour les topics avec des descriptions enrichies
- Sauvegardez les réponses dans `.projectbrain/brain-topics/[name].md`

**Étape 3 - INSTALL** (`brain install cursor`)
- Génère les fichiers de config spécifiques à votre IDE
- Cursor → `.cursorrules`
- Claude Code → `CLAUDE.md`
- Opencode → `.opencode/rules.md`
- Windsurf → `.windsurfrules`
- Zed → `.zed/rules.md`
- Crée `.agent/` avec les prompts système

> **Plus tard, si le hook marque des topics stale :** `brain prompt --topic auth`
> régénère le prompt pour un topic spécifique.

## Hook de fraîcheur

```
+-------------------+       +-------------------+
|                   |       |                   |
|   Commit git      |  -->  |   Hook déclenché  |
|                   |       |                   |
+-------------------+       +-------------------+
                                     |
                                     v
                             +-------------------+
                             |                   |
                             |  Topics impactés  |
                             |  marqués stal     |
                             |                   |
                             +-------------------+
```

Le hook pre-commit marque automatiquement les topics impactés comme obsolètes quand les fichiers changent. Vous savez exactement quand ré-enrichir le contexte.

## Démarrage rapide

```bash
npm install -g project-brain
cd votre-projet

# 1. Scanner le projet (génère brain.md, topics, prompts, .agent/)
brain scan

# 2. Enrichir (collez les prompts générés dans votre LLM, sauvegardez les réponses)
#    Les prompts sont dans .projectbrain/brain-topics/[name]-prompt.md

# 3. Configurer votre IDE
brain install cursor      # ou: claude, opencode, windsurf, zed, all
```

**Prérequis :** Node.js >= 18, Git

## Commandes

### brain scan
```bash
brain scan [--dir path] [--adapter nom]
```
Scanne le projet et génère la structure de base.

**Options :**
- `--dir path` : Cible un autre projet
- `--adapter nom` : Force un adaptateur (symfony, laravel, nextjs, generic)

**Génère :**
- `.projectbrain/brain.md` : Carte structurelle
- `.projectbrain/brain-topics/` : Topics détectés
- `.projectbrain/topic-index.yaml` : Index des topics
- `.projectbrain/freshness.yaml` : État de fraîcheur
- `.agent/` : Prompts système

### brain update
```bash
brain update [--dir path]
```
Re-scanne le projet en préservant le Business Context enrichi.

**Utile quand :**
- Vous avez ajouté du code
- Vous voulez mettre à jour la structure
- Vous ne voulez pas perdre vos enrichissements métier

### brain prompt
```bash
brain prompt [--topic nom|all] [--stdout]
```
Régénère les prompts d'enrichissement pour les topics new/stale.

**Quand l'utiliser :** après qu'un hook pre-commit ait marqué des topics comme stale, ou pour cibler un topic spécifique.

> Les prompts sont déjà générés par `brain scan`. Cette commande sert à les régénérer.

**Options :**
- `--topic nom` : Prompt pour un topic spécifique
- `--topic all` : Prompts pour tous les topics new/stale
- `--stdout` : Affiche sans sauvegarder

### brain enrich
```bash
brain enrich [--topic nom] [--install ide] [--stdout]
```
Instruction d'enrichissement globale pour traiter les topics.

**Utile pour :**
- Donner l'instruction principale au LLM
- Combiner avec l'installation de l'IDE

### brain install
```bash
brain install [ide] [--with-hook] [--dir path]
```
Installe la configuration de l'IDE.

**IDE supportés :** `cursor`, `claude`, `opencode`, `windsurf`, `zed`, `all`

**Options :**
- `--with-hook` : Installe aussi le hook pre-commit
- `--dir path` : Cible un autre projet

**Exemples :**
```bash
brain install cursor              # Cursor uniquement
brain install all                 # Tous les IDEs
brain install cursor --with-hook  # Cursor + hook
```

**Fichiers générés :**
- Cursor : `.cursorrules`
- Claude Code : `CLAUDE.md`
- Opencode : `.opencode/rules.md`
- Windsurf : `.windsurfrules`
- Zed : `.zed/rules.md`

### brain skill
```bash
brain skill [nom] [--topic nom] [--diff texte] [--query texte] [--json]
```
Exécute un skill spécifique.

**Sans argument :** Liste les skills disponibles

**Skills disponibles :**
- `repo-map` : Vue structurelle du repo
- `diff-only` : Analyse ciblée d'un diff
- `symfony-review` : Vérification Symfony
- `twig-inline-css` : Extraction CSS inline
- `route-debug` : Diagnostic de routes
- `architecture` : Prompt pour schéma d'architecture

**Options :**
- `--topic nom` : Topic cible
- `--diff texte` : Diff git à analyser
- `--query texte` : Requête spécifique
- `--json` : Sortie en JSON structuré

### brain hook
```bash
brain hook [--uninstall] [--dir path]
```
Gère le hook pre-commit.

**Actions :**
- `brain hook` : Installe le hook
- `brain hook --uninstall` : Supprime le hook

**Le hook fait :**
- Détecte les fichiers modifiés
- Identifie les topics impactés
- Marque les topics comme stale dans `freshness.yaml`

**Combinaison utile :**
```bash
brain install cursor --with-hook  # IDE config + hook en une commande
```

## Frameworks supportés

| Framework | Détection | Routes | Commandes |
|-----------|-----------|--------|-----------|
| Symfony | `composer.json` + `bin/console` | `debug:router` | `bin/console` |
| Laravel | `artisan` + `composer.json` | `route:list` | `artisan` |
| Next.js | `package.json` (`next`) | `app/` ou `pages/` | — |
| Générique | Arborescence `src/` | — | — |

**Détection automatique :**
Brain détecte automatiquement le framework et utilise l'adaptateur approprié. Pas de configuration nécessaire.

## Skills

Six skills TypeScript pour automatiser les analyses courantes.

| Skill | Rôle |
|-------|------|
| `repo-map` | Vue structurelle du repo depuis brain.md |
| `diff-only` | Analyse ciblée d'un diff git |
| `symfony-review` | Vérification des conventions Symfony |
| `twig-inline-css` | Extraction CSS inline des templates Twig |
| `route-debug` | Recherche et diagnostic de routes |
| `architecture` | Prompt LLM pour schéma d'architecture (Mermaid + ASCII) |

**Utilisation :**
```bash
brain skill repo-map                 # Aperçu structurel
brain skill diff-only --diff "..."   # Analyse de diff
brain skill route-debug --query "login"  # Recherche route
brain skill architecture             # Prompt global → .projectbrain/architecture-prompt.md
brain skill architecture --query auth    # Prompt pour un topic spécifique
```

**Sortie JSON :**
```bash
brain skill repo-map --json  # Pour intégration CI/CD
```

## Fichiers générés

```
votre-projet/
├── .projectbrain/
│   ├── brain.md                  Carte structurelle du projet
│   ├── brain-prompt.md           Fichiers clés + instructions LLM
│   ├── brain-enrich.md           Instruction d'enrichissement globale
│   ├── architecture-prompt.md   Prompt pour schéma d'architecture (généré par le skill)
│   ├── architecture.md           Schéma d'architecture (réponse du LLM)
│   └── brain-topics/
│       ├── .draft/               Brouillons auto-générés
│       ├── .meta.yaml            Statuts des topics (enrichi/stale)
│       ├── topic-index.yaml      Index des topics détectés
│       ├── freshness.yaml        État de fraîcheur par topic
│       ├── *-prompt.md           Prompts à supprimer après enrichissement
│       └── [name].md             Topics enrichis par le LLM
└── .agent/
    ├── prompts/
    │   ├── system-base.md        Instructions de base + framework + topics
    │   ├── context-policy.md     Règles de chargement du contexte
    │   ├── output-format.md      Format de sortie standardisé
    │   └── task-router.md        Routage des requêtes vers les skills
    └── cache/
        ├── last-topic.txt        Dernier topic actif
        └── recent-context.md     Contexte récent
```

**Flux des fichiers :**
1. `brain.md` → Utilisé par `repo-map` et `architecture` skills
2. `brain-topics/*.md` → Injectés dans `system-base.md`
3. `.agent/prompts/` → Chargés automatiquement par l'IDE
4. `freshness.yaml` → Mis à jour par le hook pre-commit
5. `architecture-prompt.md` → Généré par `brain skill architecture`, coller dans le LLM
6. `architecture.md` → Réponse du LLM, schéma final

## Hook pre-commit

Le hook maintient votre contexte à jour automatiquement.

**Fonctionnement :**
```
Commit
   |
   v
Hook détecte fichiers modifiés
   |
   v
Identifie topics impactés
   |
   v
Marque topics comme stale
   |
   v
freshness.yaml mis à jour
```

**Commandes :**
```bash
brain hook                    # Installe le hook
brain hook --uninstall        # Supprime le hook
brain install cursor --with-hook  # IDE config + hook
```

**Workflow de mise à jour :**
1. Le commit modifie des fichiers
2. Le hook marque les topics impactés
3. Vous lancez `brain prompt --topic auth` pour le topic stale
4. L'enrichissement rafraichit le contexte

## Installation

### Installation globale
```bash
git clone https://github.com/Sildes/brain.git
cd brain && npm install && npm run build && npm install -g .
```

### Sans installation globale
```bash
node dist/cli.js scan
npm run dev -- scan --dir /path/to/project
```

## Développement

```bash
npm test          # Exécute les tests (vitest)
npm run build     # Compile TypeScript vers dist/
```

**Dépendances :**
- `commander` : Parsing CLI
- `fast-glob` : Recherche fichiers
- `typescript` : Compilation
- `vitest` : Tests
- `tsx` : Exécution TypeScript

**Structure du code :**
```
src/
├── cli.ts              Point d'entrée CLI
├── scan.ts             Logique de scan
├── detect.ts           Détection de framework
├── discover.ts         Découverte des topics
├── enrich.ts           Enrichissement
├── install.ts          Installation IDE
├── output.ts           Génération des fichiers
├── hook.ts             Hook pre-commit
├── types.ts            Types TypeScript
├── adapters/           Frameworks (symfony, laravel, nextjs, generic)
└── skills/             Skills TypeScript (6 skills)
```

## Licence

MIT
