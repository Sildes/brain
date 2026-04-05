<?php

namespace App\Command;

use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;

#[AsCommand(name: 'app:import-users', description: 'Import users from external source')]
class ImportCommand extends Command
{
    protected function execute(): int
    {
        return Command::SUCCESS;
    }
}
