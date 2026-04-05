<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class ProcessUsers extends Command
{
    protected $signature = 'users:process {--force}';
    protected $description = 'Process pending users';
}
