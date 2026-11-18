<?php
class Zombie extends Unit
{
    protected const CLASS_TYPE = 'zombie';

    public function getRole(): string { return 'Tank'; }

    public function getAttackType(): string { return 'melee'; }
}