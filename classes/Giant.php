<?php
class Giant extends Unit
{
    protected const CLASS_TYPE = 'giant';
    public function getRole(): string { return 'Tank boss'; }
    public function getAttackType(): string { return 'melee'; }
}