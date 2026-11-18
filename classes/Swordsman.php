<?php
class Swordsman extends Unit
{
    protected const CLASS_TYPE = 'swordsman';
    public function getRole(): string { return 'Frontline'; }
    public function getAttackType(): string { return 'melee'; }
}