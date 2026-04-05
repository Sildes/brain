# Project Brain

Genere un contexte structure pour les LLMs a partir de votre code. Un scan local produit des fichiers que votre IDE charge automatiquement.

## Demarrage rapide

```bash
npm install -g .
cd votre-projet

# 1. Scanner le projet
brain scan

# 2. Enrichir les topics detectes
brain prompt --topic all

# 3. Configurer votre IDE
brain install cursor      # cursor, claude, opencode, windsurf, zed, all
```

**Prerequis :** Node.js >= 18, Git

## Commandes

| Commande | Description |
|----------|-------------|
| `brain scan [--dir path]` | Scan le projet, genere brain.md + topics |
| `brain update [--dir path]` | Re-scan en preservant le Business Context |
| `brain prompt [--topic name\|all]` | Genere les prompts d'enrichissement |
| `brain enrich [--topic name]` | Instruction unique pour traiter tous les topics |
| `brain install [ide]` | Installe la config dans l'IDE |

Toutes les commandes acceptent `--dir path` pour cibler un autre projet.

 `--stdout` affiche sans sauvegarder.

## Frameworks supportes

| Framework | Detection | Routes | Commandes |
|-----------|-----------|--------|-----------|
| Symfony | `composer.json` + `bin/console` | `debug:router` | `bin/console` |
| Laravel | `artisan` + `composer.json` | `route:list` | `artisan` |
| Next.js | `package.json` (`next`) | `app/` ou `pages/` | — |
| Generique | Arborescence `src/` | — | — |

## Fichiers generes

```
votre-projet/
└── .project/
    ├── brain.md              Carte structurelle
    ├── brain-prompt.md       Fichiers cles + instructions LLM
    ├── brain-enrich.md       Instruction d'enrichissement globale
    └── brain-topics/
        ├── .draft/           Brouillons auto-generes
        ├── .meta.yaml        Statuts des topics
        ├── *-prompt.md       Prompts (a supprimer apres enrichment)
        └── [name].md         Topics enrichis par le LLM
```

## Installation

```bash
git clone https://github.com/Sildes/brain.git
cd brain && npm install && npm run build && npm install -g .
```

Ou sans installation globale :

```bash
node dist/cli.js scan
npm run dev -- scan --dir /path/to/project
```

## Developpement

```bash
npm test          # 18 tests (vitest)
npm run build     # compile vers dist/
```

## Licence

MIT
