<?php
class Healer extends Unit
{
    protected const CLASS_TYPE = 'healer';

    public function getRole(): string { return 'Support'; }

    // The "damage" stat is how much HP it restores per cast
    public function getAttackType(): string { return 'heal'; }
}