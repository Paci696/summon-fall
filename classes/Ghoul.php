<?php
class Ghoul extends Unit
{
    protected const CLASS_TYPE = 'ghoul';

    public function getRole(): string { return 'Assassin'; }

    public function getAttackType(): string { return 'melee'; }
}