# Summon Fall

A browser-based real-time strategy game (inspired by Stick War Legacy) built for the **OOPL Final Project**.
The web application is written in **PHP 8 (object-oriented) + MySQL (PDO)**; the game itself runs on an **HTML5 canvas** with JavaScript ES modules.

Survive endless waves of monsters, protect your statue, earn souls and gold, and grow stronger through a permanent skill tree.

## Features

**Web application (PHP / OOP)**
- Registration, login, logout with password hashing; two roles: **admin** and **player**
- CSRF protection, server-side validation with clear error messages, prepared statements only
- Admin panel with full **CRUD** and **search / sort / filter** for units, heroes, items, skills and users
- Dashboard with totals and statistics; leaderboard of best runs
- Skill tree (node graph) with permanent upgrades bought with souls
- Hero page and inventory: pick a hero, equip weapon / armor / trinket items

**Game (JavaScript canvas)**
- Endless mode on 3 maps, waves get stronger every 10 waves
- 5 unit lines (Miner, Swordsman, Archer, Mage, Healer) with Base / Elite / Godly tiers and a custom loadout
- 5 heroes: Knight, Archer, Mage, **Lycan** (werewolf shapeshifter) and **Necromancer** (raises fallen enemies as undead allies)
- Day / night cycle: zombies crawl out of the trees at night, ghouls join night waves
- Bosses: Warlord and Bone Colossus (alternate every 10 waves)
- Item drops with rarities (common to legendary) saved to your permanent inventory

## Requirements

- PHP 8.0 or higher
- MySQL / MariaDB
- Laragon, XAMPP or any equivalent local server

## Installation

1. Copy the project folder to your web root, e.g. `C:\laragon\www\summon-fall\`.
2. Start Apache and MySQL (Laragon: *Start All*).
3. Open phpMyAdmin, create a database named **`summon_fall`** (collation `utf8mb4_general_ci`).
4. Select the database, open **Import**, choose `database/summonfall_export.sql` and run it.
   The file contains the full schema (tables, keys) and sample data.
5. Check the settings in the config file (database host, name, user, password, and `BASE_URL`, which is `/summon-fall` by default).
6. Open <http://localhost/summon-fall/> in your browser.

## Default accounts

| Role   | Username | Password |
|--------|----------|----------|
| Admin  | `ADMIN_USERNAME` | `ADMIN_PASSWORD` |
| Player | `PLAYER_USERNAME` | `PLAYER_PASSWORD` |

(Replace with the real login details before submitting.)

## Controls

| Input | Action |
|-------|--------|
| Mouse drag | Select units |
| Right click | Move / attack order |
| 1 - 8 | Summon the unit in that slot |
| E | Meteor spell (after unlocking it in the skill tree) |
| R / T / Y | Hero abilities 1 / 2 / 3 |
| Space | Pause |
| F | End the run and save the score |

## Project structure

```
summon-fall/
|-- config/        database settings and constants (BASE_URL, DEBUG)
|-- classes/       PHP classes (Model, Unit and its subclasses, Hero and its subclasses,
|                  Item, Inventory, Skill, Score, User, Database, Validator, Csrf, ...)
|-- includes/      header, footer, authentication checks
|-- adm/           admin panel (CRUD pages, menu)
|-- out/           player-facing pages and JSON API (play, skills, heroes, leaderboard)
|-- assets/        css, js (game engine, ES modules), sprites
|-- database/      summonfall_export.sql (schema + sample data)
`-- index.php
```

## OOP concepts (where to find them)

| Concept | Example |
|---------|---------|
| Abstraction | `abstract class Model` (find / all / delete / save); `abstract class Unit`; `abstract class Hero` |
| Inheritance | `Unit` > `Miner`, `Swordsman`, `Archer`, `Mage`, `Healer`, `Slime`, `Goblin`, `GoblinArcher`, `Giant`, `Zombie`, `Ghoul`; `Hero` > `KnightHero`, `ArcherHero`, `MageHero`, `LycanHero`, `NecromancerHero` |
| Polymorphism | `getRole()` and `getAttackType()` overridden in every subclass; `Unit::make()` / `Hero::make()` build the right subclass from a database row |
| Encapsulation | private properties with public getters / setters (e.g. `Unit::setHp()` validates its input) |
| Constructors | every model initialises its fields in `__construct()` |
| Exception handling | `ValidationException`, `DatabaseException`; `try / catch` in the pages and API |

## Security

- Passwords hashed with `password_hash()` / `password_verify()`
- PDO prepared statements everywhere
- CSRF token on every form and AJAX request
- Server-side validation (`Validator` class), output escaped with `htmlspecialchars`
- Server-side checks on scores and item drops submitted by the game

## Known limitations

- The game logic runs in the browser, so scores are validated by plausibility checks rather than a full server simulation
- Walls and defensive towers are not implemented (future work)
- The Rogue hero was planned but not built

## Author

Solo project for OOPL, final project, November 2026.
