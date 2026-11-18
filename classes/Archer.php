<?php
class Archer extends Unit
{
    protected const CLASS_TYPE = 'archer';
    public function getRole(): string { return 'Ranged damage'; }
    public function getAttackType(): string { return 'ranged'; }
}