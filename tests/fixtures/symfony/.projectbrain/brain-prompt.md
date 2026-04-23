# LLM Context Prompt

TASK: analyze codebase → explain business context

## Project

| Property | Value |
|----------|-------|
| Framework | Symfony |
| Modules | 0 |
| Routes | 0 |
| Commands | 1 |

## Key Files

### src/Controller/UserController.php
```php
<?php

namespace App\Controller;

use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\HttpFoundation\Response;

class UserController
{
    #[Route('/api/users', name: 'api_users_list', methods: ['GET'])]
    public function list(): Response
    {
        return new Response('users');
    }

    #[Route('/api/users/{id}', name: 'api_users_show', methods: ['GET'])]
    public function show(int $id): Response
    {
        return new Response('user ' . $id);
    }
}

```

### composer.json
```json
{"require": {"symfony/framework-bundle": "^6.0"}}

```

### config/services.yaml
```yaml
services:

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