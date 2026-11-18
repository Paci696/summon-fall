<?php
class Slime extends Unit
{
    protected const CLASS_TYPE = 'slime';
    public function getRole(): string { return 'Swarm'; }
    public function getAttackType(): string { return 'melee'; }
}