<?php
class Goblin extends Unit
{
    protected const CLASS_TYPE = 'goblin';
    public function getRole(): string { return 'Rusher'; }
    public function getAttackType(): string { return 'melee'; }
}