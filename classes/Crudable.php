<?php
interface Crudable
{
    public function save(): bool;
    public function delete(): bool;
}