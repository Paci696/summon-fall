<?php
class LycanHero extends Hero
{
    protected const CLASS_TYPE = 'lycan';

    public function getRole(): string { return 'Shapeshifter'; }

    public function getAttackType(): string { return 'ranged'; }
}