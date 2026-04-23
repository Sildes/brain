# Context Policy

## Budget
- Max 1 topic per request (2 only if ambiguous)
- Max 3 full files without justification
- Prefer diff, excerpt, or summary over full file
- Summarize old history to 10 lines max

## Loading Order (static → dynamic)
1. system-base.md (stable)
2. context-policy.md (stable)
3. output-format.md (stable)
4. brain.md (session-cached)
5. 1 topic (dynamic)
6. skill.md (dynamic)
7. Current diff/logs/ticket (dynamic)

## Restrictions
- Never load > 2 topics simultaneously
- Never inject > 3 full files
- Never reload full conversation history
