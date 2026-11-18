<?php
class KnightHero extends Hero
{
    protected const CLASS_TYPE = 'knight';

    public function getRole(): string { return 'Tank'; }

    public function getAttackType(): string { return 'melee'; }
}