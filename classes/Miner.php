<?php
class Miner extends Unit
{
    protected const CLASS_TYPE = 'miner';
    public function getRole(): string { return 'Gatherer'; }
    public function getAttackType(): string { return 'gather'; }
}