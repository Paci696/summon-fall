<?php
class Mage extends Unit
{
    protected const CLASS_TYPE = 'mage';
    public function getRole(): string { return 'Area damage'; }
    public function getAttackType(): string { return 'area'; }
}