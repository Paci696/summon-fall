<?php
class MageHero extends Hero
{
    protected const CLASS_TYPE = 'mage';

    public function getRole(): string { return 'Caster'; }

    public function getAttackType(): string { return 'area'; }
}