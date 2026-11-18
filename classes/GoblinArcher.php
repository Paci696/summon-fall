<?php
class GoblinArcher extends Unit
{
    protected const CLASS_TYPE = 'goblin_archer';
    public function getRole(): string { return 'Skirmisher'; }
    public function getAttackType(): string { return 'ranged'; }
}