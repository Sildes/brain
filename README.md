# Project Brain

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](package.json)

**Project Brain** génère un contexte projet structuré pour les LLM (fichiers « brain ») à partir de votre code. Il fonctionne avec n’importe quel IDE : vous scannez le dépôt, vous installez une règle légère dans l’IDE, puis le modèle enrichit le contexte métier à partir d’un prompt fourni.

## Sommaire

- [Installation](#installation)
- [Démarrage rapide](#démarrage-rapide)
- [Commandes](#commandes)
- [Frameworks pris en charge](#frameworks-pris-en-charge)
- [Fonctionnement](#fonctionnement)
- [Développement](#développement)
- [Licence](#licence)

## Installation

Publication npm (`package.json` : `project-brain`) :

```bash
npm install -g project-brain
```

Exécution sans installation globale :

```bash
npx project-brain scan
```

## Démarrage rapide

```bash
cd votre-projet
brain scan                        # Génère .project/brain.md + .project/brain-prompt.md
brain install cursor              # Configure l’IDE et affiche le prompt à coller dans le chat
# Coller le prompt dans le chat Cursor (ou autre IDE configuré)
# Le LLM met à jour .project/brain.md (section contexte métier)
```

### Ce que vous obtenez

- **Détection de framework** (Symfony, Laravel, Next.js ou générique)
- **Modules** déduits de l’arborescence
- **Routes** utiles (filtrage des routes « métier » vs techniques)
- **Commandes CLI** extraites des fichiers de commandes
- **Conventions** lues dans les fichiers de configuration
- **Repères pour retrouver** les bons dossiers rapidement
- **Contexte factorisé** : une lecture du `brain.md` remplace de nombreuses recherches

## Commandes

### `brain scan`

Analyse le projet courant et génère :

| Fichier | Rôle |
|---------|------|
| `.project/brain.md` | Carte structurelle du projet |
| `.project/brain-prompt.md` | Prompt prêt pour le LLM |

Options :

```bash
brain scan --output .context       # Répertoire de sortie (défaut : .project)
brain scan --adapter symfony       # Forcer un adaptateur (symfony, laravel, nextjs, generic)
```

### `brain install [ide]`

Installe la configuration « brain » pour votre IDE (section marquée, mise à jour sans écraser le reste du fichier quand c’est possible).

```bash
brain install cursor      # Cursor (.cursorrules)
brain install claude      # Claude Code (CLAUDE.md)
brain install opencode    # Opencode (.opencode/rules.md)
brain install windsurf    # Windsurf (.windsurfrules)
brain install zed         # Zed (.zed/rules.md)
brain install all         # Tous les IDE supportés
brain install             # Choix interactif
```

Options :

```bash
brain install cursor --output .context   # Même répertoire que pour scan
```

### Après l’installation

Copiez le prompt affiché dans le chat de l’IDE. Le LLM :

1. Lit `.project/brain-prompt.md`
2. Produit le contexte métier
3. Écrit dans `.project/brain.md` sous la section **Business Context**

## Frameworks pris en charge

| Framework | Détection | Routes | Commandes |
|-----------|-----------|--------|-----------|
| Symfony | `composer.json` + `bin/console` | `debug:router` | `bin/console` |
| Laravel | `artisan` + `composer.json` | `php artisan route:list` | `artisan` |
| Next.js | `package.json` (dép. `next`) | structure `app/` ou `pages/` | — |
| Générique | Arborescence | — | — |

## Fonctionnement

```
┌─────────────────────────────────────────┐
│          Projet utilisateur             │
└─────────────────┬───────────────────────┘
                  │
                  ▼
           ┌──────────────┐
           │  brain scan  │
           └──────┬───────┘
                  │
     ┌────────────┼────────────┐
     │ Détection  │  Extraction │
     │ framework  │  données    │
     └────────────┴────────────┘
                  │
     ┌────────────┴────────────┐
     │ .project/brain.md       │
     │ .project/brain-prompt.md │
     └────────────┬────────────┘
                  │
                  ▼
           ┌──────────────┐
           │ brain install│
           └──────┬───────┘
                  │
        ┌─────────┴─────────┐
        │ Règle IDE + prompt │
        │ pour le LLM        │
        └─────────┬─────────┘
                  ▼
           ┌──────────────┐
           │  LLM (IDE)   │
           └──────────────┘
```

## Exemple (extrait)

### `.cursorrules` (après `brain install`)

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

### `.project/brain.md`

Aperçu typique : modules, routes métier, commandes, conventions, tableau « où chercher quoi », métadonnées (framework, nombre de fichiers, date de génération).

## Développement

Prérequis : **Node.js ≥ 18**.

```bash
git clone https://github.com/Sildes/brain.git
cd brain
npm install
npm run build          # compile vers dist/
npm run dev -- scan    # exécuter le CLI via tsx sans build global
```

- `npm run build` — compilation TypeScript  
- `npm run dev` — lance `src/cli.ts` (ex. `npm run dev -- scan`)

## Licence

MIT — voir le fichier [LICENSE](LICENSE).
