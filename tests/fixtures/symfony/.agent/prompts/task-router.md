# Task Router

## How It Works
1. User request comes in
2. Match keywords against topic-index.yaml
3. Select the best matching topic (max 2 if ambiguous)
4. Apply the default skill for that topic
5. If "git diff" mentioned, switch to diff-only skill

## Fallback
If no topic matches (score < 0.4):
- Use brain.md only (no topic)
- Use repo-map skill
- Ask user for clarification

## Skills Reference
| Skill | Input | Output |
|-------|-------|--------|
| repo-map | brain.md + query | Quick zone overview |
| diff-only | git diff + topic | Targeted change analysis |
| symfony-review | topic + PHP files | Conventions, risks, fixes |
| twig-inline-css | topic + Twig templates | CSS extraction/refactor |
| route-debug | error + route name | Controller, config, security |
