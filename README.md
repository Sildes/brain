# Project Brain

Génère un contexte structuré pour les LLMs à partir de votre code. Un scan local produit des fichiers que votre IDE charge automatiquement.

## Démarrage rapide

```bash
npm install -g .
cd votre-projet

# 1. Scanner le projet
brain scan

# 2. Enrichir les topics détectés
brain prompt --topic all

# 3. Configurer votre IDE
brain install cursor      # cursor, claude, opencode, windsurf, zed, all
```

**Prérequis :** Node.js >= 18, Git

## Commandes

| Commande | Description |
|----------|-------------|
| `brain scan [--dir path] [--adapter nom]` | Scan le projet, génère brain.md, topics, topic-index.yaml, freshness.yaml, .agent/ |
| `brain update [--dir path]` | Re-scan en préservant le Business Context |
| `brain prompt [--topic nom\|all] [--stdout]` | Génère les prompts d'enrichissement |
| `brain enrich [--topic nom] [--install ide] [--stdout]` | Instruction d'enrichissement pour traiter les topics |
| `brain install [ide] [--with-hook] [--dir path]` | Installe la config IDE + .agent/ + optionnellement le hook |
| `brain skill [nom] [--topic nom] [--diff texte] [--query texte] [--json]` | Exécute un skill |
| `brain hook [--uninstall] [--dir path]` | Installe ou supprime le hook pre-commit |

IDE supportés : `cursor`, `claude`, `opencode`, `windsurf`, `zed`, `all`.

Toutes les commandes acceptent `--dir path` pour cibler un autre projet. `--stdout` affiche sans sauvegarder.

## Frameworks supportés

| Framework | Détection | Routes | Commandes |
|-----------|-----------|--------|-----------|
| Symfony | `composer.json` + `bin/console` | `debug:router` | `bin/console` |
| Laravel | `artisan` + `composer.json` | `route:list` | `artisan` |
| Next.js | `package.json` (`next`) | `app/` ou `pages/` | — |
| Générique | Arborescence `src/` | — | — |

## Skills

Cinq skills TypeScript, exécutables via `brain skill <nom>`.

| Skill | Rôle |
|-------|------|
| `repo-map` | Vue structurelle du repo depuis brain.md |
| `diff-only` | Analyse ciblée d'un diff git |
| `symfony-review` | Vérification des conventions Symfony |
| `twig-inline-css` | Extraction CSS inline des templates Twig |
| `route-debug` | Recherche et diagnostic de routes |

Sans argument, `brain skill` liste les skills disponibles. L'option `--json` retourne la sortie en JSON structuré.

## Fichiers générés

```
votre-projet/
├── .projectbrain/
│   ├── brain.md                  Carte structurelle
│   ├── brain-prompt.md           Fichiers clés + instructions LLM
│   ├── brain-enrich.md           Instruction d'enrichissement globale
│   └── brain-topics/
│       ├── .draft/               Brouillons auto-générés
│       ├── .meta.yaml            Statuts des topics
│       ├── topic-index.yaml      Index des topics détectés
│       ├── freshness.yaml        État de fraîcheur des topics
│       ├── *-prompt.md           Prompts (à supprimer après enrichissement)
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

## Hook pre-commit

Le hook marque les topics impactés comme obsolètes à chaque commit.

```bash
brain hook                    # Installe le hook
brain hook --uninstall        # Supprime le hook
brain install cursor --with-hook  # Installe IDE config + hook en une commande
```

## Installation

```bash
git clone https://github.com/Sildes/brain.git
cd brain && npm install && npm run build && npm install -g .
```

Sans installation globale :

```bash
node dist/cli.js scan
npm run dev -- scan --dir /path/to/project
```

## Développement

```bash
npm test          # 185 tests (vitest)
npm run build     # compile vers dist/
```

Dépendances : `commander`, `fast-glob`. DevDeps : `typescript`, `vitest`, `tsx`, `@types/node`.

## Licence

MIT
