<?php
class ArcherHero extends Hero
{
    protected const CLASS_TYPE = 'archer';

    public function getRole(): string { return 'Marksman'; }

    public function getAttackType(): string { return 'ranged'; }
}