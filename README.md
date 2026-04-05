# Project Brain

[License: MIT](LICENSE)
[Node >= 18](package.json)

## Objectif

Reduire drastiquement les tokens consommes par les LLMs en structurant le contexte projet **une seule fois**, puis en le reutilisant a **chaque session**.

```
SANS BRAIN                          AVEC BRAIN

Session 1    Session 2              Setup        Session 1    Session N
+--------+   +--------+            +--------+   +--------+   +--------+
| 50k    |   | 50k    |            | 0      |   | 2k     |   | 2k     |
| tokens |   | tokens |            | tokens |   | tokens |   | tokens |
+--------+   +--------+            +--------+   +--------+   +--------+
                                   brain scan   lit brain.md lit brain.md
                                   (local)
```

**Project Brain** genere un contexte structure pour les LLMs a partir de votre code. Il detecte le framework, extrait les modules, routes, commandes, et produit des fichiers `brain.md` et `brain-prompt.md` que votre IDE charge automatiquement.

## Etapes indispensables (Topics)

Ces deux actions sont **au coeur du projet** : sans elles, les topics restent des brouillons et vous ne recupérez pas le gain de contexte ciblé sur chaque domaine fonctionnel.

Après chaque `brain scan` (ou lorsque le rapport affiche des topics `new` / `stale`) :
**Sauvegarder** chaque réponse dans `.project/brain-topics/[nom].md` (un fichier par topic enrichi).

Le CLI rappelle ces étapes à la fin du scan ; détail du workflow : section [Brain Topics](#brain-topics).

## Installation

```bash
git clone https://github.com/Sildes/brain.git
cd brain
npm install
npm run build
```

Utilisation sans installation globale :

```bash
node dist/cli.js scan
npm run dev -- scan
```

Installation globale (optionnel) :

```bash
npm install -g .
# ou
npm link
```

**Prerequis :** Node.js >= 18

## Demarrage rapide

```bash
cd votre-projet

# 1. Scanner le projet
brain scan
# -> .project/brain.md + .project/brain-prompt.md + topics detectes

# 2. Generer le prompt pour le contexte metier
brain prompt
# -> .project/brain-prompt.md (pret a copier dans le chat LLM)

# 3. Coller le prompt dans votre LLM
# -> Le LLM genere le Business Context
# -> Copier la reponse dans .project/brain.md (section "## Business Context")

# 4. (Optionnel) Enrichir les topics detectes
brain prompt --topic all            # tous les topics d'un coup
brain prompt --topic admin          # ou un par un

# 5. (Optionnel) Installer la config IDE
brain install cursor
```

## Commandes

### `brain scan`

Scanne le projet et genere les fichiers brain + topics.

```bash
brain scan                        # repertoire courant
brain scan --dir /path/to/project # autre repertoire
brain scan --output .context      # repertoire de sortie (defaut: .project)
brain scan --adapter symfony      # forcer un adapter
```

**Fichiers generes :**


| Fichier                         | Role                              |
| ------------------------------- | --------------------------------- |
| `.project/brain.md`             | Carte structurelle du projet      |
| `.project/brain-prompt.md`      | Prompt pour enrichissement LLM    |
| `.project/brain-topics/.draft/` | Topics auto-detectes (brouillons) |
|                                 |                                   |


**Frameworks supportes :**


| Framework | Detection                       | Routes             | Commandes     |
| --------- | ------------------------------- | ------------------ | ------------- |
| Symfony   | `composer.json` + `bin/console` | `debug:router`     | `bin/console` |
| Laravel   | `artisan` + `composer.json`     | `route:list`       | `artisan`     |
| Next.js   | `package.json` (`next`)         | `app/` ou `pages/` | --            |
| Generique | Arborescence                    | --                 | --            |


### `brain update`

Re-scanne le projet en preservant la section Business Context.

```bash
brain update
brain update --dir /path/to/project
brain update --output .context
```

### `brain prompt`

Genere le prompt LLM pour le contexte metier ou un topic specifique.

```bash
brain prompt                        # prompt global (Business Context)
brain prompt --dir /path/to/project # sur un autre projet
brain prompt --topic admin          # prompt pour un topic specifique
brain prompt --topic all            # prompts pour TOUS les topics d'un coup
brain prompt --topic all --stdout   # afficher sans sauvegarder
```

**Exemple de sortie :**

```
✓ Business context prompt generated
  Saved to: .project/brain-prompt.md

  Paste this prompt into your LLM chat to generate Business Context.

  Topics with pending prompts:
    - admin (48 files, 103 routes)
    - booking (21 files, 12 routes)
    - stripe (16 files, 2 routes)

  Generate topic prompts with:
    brain prompt --topic admin
    brain prompt --topic booking
    brain prompt --topic stripe
```

### `brain enrich`

Genere une instruction unique pour que le LLM traite **tous les topics d'un coup**.

```bash
brain enrich                          # genere .project/brain-enrich.md
brain enrich --dir /path/to/project   # sur un autre projet
brain enrich --topic booking          # un seul topic
brain enrich --stdout                 # afficher sans sauvegarder
brain enrich --install cursor         # installe comme regle IDE
```

**Fonctionnement :** genere un fichier `brain-enrich.md` qui liste chaque prompt de topic avec son chemin de sortie. Collez ce fichier dans votre LLM — il lira chaque prompt et ecrira les fichiers enrichis automatiquement.

### `brain install [ide]`

Installe la configuration brain dans votre IDE.

```bash
brain install cursor      # .cursorrules
brain install claude      # CLAUDE.md
brain install opencode    # .opencode/rules.md
brain install windsurf    # .windsurfrules
brain install zed         # .zed/rules.md
brain install all
brain install             # interactif
```

## Brain Topics

`brain scan` detecte automatiquement des **domaines fonctionnels** (authentication, payments, etc.) par co-occurrence de termes dans les fichiers, routes et commandes.

**Priorité :** une fois les fichiers générés, l’étape **LLM + sauvegarde dans `brain-topics/[nom].md`** est aussi importante que le scan lui-même — voir [Etapes indispensables (Topics)](#etapes-indispensables-topics).

### Workflow

```
1. brain scan
   -> Detecte les topics (nouveaux / a jour / perimes)

2. INDISPENSABLE — Copiez .project/brain-topics-prompt.md vers votre LLM
   -> Le LLM enrichit chaque topic (domaine métier documenté pour les sessions)

3. INDISPENSABLE — Sauvegardez chaque reponse dans .project/brain-topics/[nom].md
   -> Les sessions suivantes s’appuient sur ces guides ; sans cela, les topics restent vides
```

### Statuts des topics


| Statut       | Description                  | Prompt genere ? |
| ------------ | ---------------------------- | --------------- |
| `new`        | Detecte, jamais enrichi      | Oui             |
| `up_to_date` | Meme fichiers, meme contenu  | Non             |
| `stale`      | Fichiers ou contenu modifies | Oui             |
| `orphaned`   | Enrichi mais plus detecte    | Non             |


### Exemple de sortie

```
✓ Scan complete!
  Framework: Symfony
  Modules: 15
  Routes: 412
  Commands: 39
  Files: 362

  Topics:
     + booking              new          21 files, 12 routes
     + stripe               new          16 files, 2 routes
     + admin                new          48 files, 103 routes
     + security             new          17 files, 0 routes
     + matching             new          12 files, 6 routes
     + instagram            new          11 files, 20 routes

  Prompts generated:
    - .project/brain-topics-prompt.md
    - .project/brain-topics/admin-prompt.md
    - .project/brain-topics/ckeditor-prompt.md
    ...

  Next steps:
    1. Copy .project/brain-topics-prompt.md to your LLM
    2. Save each topic response to .project/brain-topics/[name].md
```

(Ces deux lignes du rapport correspondent aux [etapes indispensables](#etapes-indispensables-topics) décrites plus haut.)

## Schema de fonctionnement

```
CODE SOURCE                    BRAIN                        LLM
+----------+                +----------+                +----------+
| src/     |  brain scan    | brain.md |  lit           |          |
| config/  | -------------> |          | ------------> | IDE      |
| tests/   |                |          |               |          |
+----------+  brain prompt  | prompt.md| <------------ |          |
               brain update  | topics/  |  ecrit         |          |
                (preserve     |          |  Business      +----------+
                 Business     |          |  Context
                 Context)     +----------+
```

### Flux complet

```
+--------------------------------------------------------------------+
|                        VOTRE PROJET                                 |
|  src/  config/  tests/  composer.json  ...                         |
+-------------------------------+------------------------------------+
                                |
    +-----------+---------------+---------------+
    |           |                               |
    v           v                               v
+--------+  +--------+                    +---------+
|  scan  |  | update |                    | install |
+---+----+  +---+----+                    +----+----+
    |           |                               |
    |           | preserve Business Context      |
    v           v                               v
+------------------------------+    +---------------------------+
|      .project/               |    |       IDE Rules           |
|  brain.md        Structural  |    |  .cursorrules / CLAUDE.md |
|  brain-prompt.md Key files   |    |  .opencode/rules.md  ...  |
|  brain-topics/   Domaines    |    +---------------------------+
|  brain-topics-prompt.md      |                 |
+------------------------------+                 |
                                                 |
                   +-----------------------------+
                   | lit brain.md au demarrage
                   v
+--------------------------------------------------------------------+
|                        LLM DANS L'IDE                               |
|                                                                     |
|  1. Lit .project/brain.md (contexte structurel)                    |
|  2. Lit .project/brain-prompt.md (fichiers cles)                  |
|  3. Genere Business Context                                        |
|  4. Ecrit dans brain.md sous "## Business Context"                 |
+--------------------------------------------------------------------+
```

### Structure des fichiers generes

```
votre-projet/
+-- .project/
|   +-- brain.md                  Contexte structure (modules, routes, commandes)
|   |   +-- At a Glance           Resume rapide
|   |   +-- Modules               Modules detectes
|   |   +-- Routes                Routes metier (filtrees)
|   |   +-- Navigation (CLI)      Commandes utiles
|   |   +-- Quick Find            Tableau "ou chercher quoi"
|   |   +-- Topics                Domaines detectes automatiquement
|   |   +-- Business Context      Section remplie par le LLM
|   |   +-- Meta                  Metadonnees
|   |
|   +-- brain-prompt.md           Fichiers cles + instructions LLM
|  
|   +-- brain-enrich.md           Instruction d'enrichissement de tous les topics
|   +-- brain-topics/
|       +-- .draft/               Brouillons auto-generes
|       +-- .meta.yaml            Suivi des statuts
|       +-- *-prompt.md           Prompts individuels par topic
|
+-- .cursorrules                  (si brain install cursor)
+-- src/ ... (votre code)
```

### Economie de tokens


| Mecanisme                 | Effet                                                                |
| ------------------------- | -------------------------------------------------------------------- |
| **brain.md comme hub**    | Contexte structure et compact au lieu d'une exploration from scratch |
| **Scan en local**         | Arborescence, framework, routes/commandes produits sans tokens LLM   |
| **brain-prompt.md borne** | Petit ensemble de fichiers cles, taille limitee                      |
| **Quick Find**            | Moins d'essais/erreurs pour trouver ou vit une fonctionnalite        |
| **Topics**                | Domaines pre-identifies, prompts cibles par sujet                    |


## Outils complementaires

Project Brain structure le **contexte projet** (fichiers `.project/`). Vous pouvez le combiner avec d'autres outils orientes **sortie shell** ou **empaquetage de code** pour limiter encore la taille du contexte :


| Outil                       | Description                                                                                                                                                                                                                                      | Depot / site                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| **RTK** (Rust Token Killer) | Proxy CLI qui filtre, groupe et tronque les sorties des commandes courantes (`git`, tests, `docker`, `grep`, etc.) avant qu'elles n'entrent dans le contexte du LLM ; prise en charge de nombreux outils d'IA (Cursor, Claude Code, Copilot, …). | [github.com/rtk-ai/rtk](https://github.com/rtk-ai/rtk) · [rtk-ai.app](https://www.rtk-ai.app) |
| **Repomix**                 | Empaquete un depot en un fichier (ou une archive) texte avec arborescence et regles d'inclusion / exclusion, pratique pour un prompt ponctuel « tout le repo ».                                                                                  | [github.com/yamadashy/repomix](https://github.com/yamadashy/repomix)                          |
| **Gitingest**               | Transforme une URL de depot Git en extrait texte (fichiers + tree) utilisable comme contexte pour un LLM.                                                                                                                                        | [gitingest.com](https://gitingest.com)                                                        |


**Astuce :** Brain pour la carte vivante du projet ; RTK pour ce qui transite par le terminal ; Repomix ou Gitingest quand vous avez besoin d'un dump complet ponctuel.

## Developpement

```bash
git clone https://github.com/Sildes/brain.git
cd brain
npm install
npm run build
npm run dev -- scan --dir /path/to/project
```

- `npm run build` -- compile vers `dist/`
- `npm run dev` -- execute `src/cli.ts` via `tsx`

### Ajouter un adapter

Creer un fichier dans `src/adapters/` implementant l'interface `Adapter` :

```typescript
import { Adapter, AdapterMatch, BrainData } from "../types.js";

export const monAdapter: Adapter = {
  name: "mon-framework",
  priority: 10,
  async detect(dir: string): Promise<AdapterMatch> { ... },
  async extract(dir: string): Promise<BrainData> { ... },
};
```

Puis l'enregistrer dans `src/cli.ts`.

## Licence

MIT