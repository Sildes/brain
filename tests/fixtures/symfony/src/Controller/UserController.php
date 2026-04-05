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
