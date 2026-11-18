<?php
class NecromancerHero extends Hero
{
    protected const CLASS_TYPE = 'necromancer';

    public function getRole(): string { return 'Summoner'; }

    public function getAttackType(): string { return 'ranged'; }
}