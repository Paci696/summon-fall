-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Nov 20, 2026 at 07:08 PM
-- Server version: 8.4.3
-- PHP Version: 8.3.33

SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `summon_fall`
--
CREATE DATABASE IF NOT EXISTS `summon_fall` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `summon_fall`;

-- --------------------------------------------------------

--
-- Table structure for table `heroes`
--

DROP TABLE IF EXISTS `heroes`;
CREATE TABLE `heroes` (
  `id` int NOT NULL,
  `name` varchar(40) COLLATE utf8mb4_general_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
  `hp` int NOT NULL,
  `damage` int NOT NULL,
  `speed` int NOT NULL,
  `attack_range` int NOT NULL,
  `attack_cooldown` int NOT NULL,
  `sprite_key` varchar(30) COLLATE utf8mb4_general_ci NOT NULL,
  `revive_sec` int NOT NULL DEFAULT '30',
  `is_active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `heroes`
--

INSERT INTO `heroes` (`id`, `name`, `description`, `hp`, `damage`, `speed`, `attack_range`, `attack_cooldown`, `sprite_key`, `revive_sec`, `is_active`) VALUES
(1, 'Knight', 'Armoured front-liner who holds the line.', 420, 30, 72, 30, 650, 'hero_knight', 30, 1),
(2, 'Archer', 'Fast marksman who strikes from far away.', 240, 24, 82, 190, 600, 'hero_archer', 30, 1),
(3, 'Mage', 'Fragile caster with area spells.', 210, 38, 68, 150, 1400, 'hero_mage', 35, 1),
(4, 'Lycan', 'A cursed hunter. Shoots a crossbow, then turns into a werewolf that tears through enemies and drinks their life.', 300, 26, 80, 150, 800, 'hero_lycan', 32, 1),
(5, 'Necromancer', 'Master of the dead. Enemies that fall near him can rise as weaker undead allies. His skill tree decides how many rise, how often, and how strong they are.', 220, 30, 72, 170, 900, 'hero_necromancer', 34, 1);

-- --------------------------------------------------------

--
-- Table structure for table `hero_abilities`
--

DROP TABLE IF EXISTS `hero_abilities`;
CREATE TABLE `hero_abilities` (
  `id` int NOT NULL,
  `hero_id` int NOT NULL,
  `slot` tinyint NOT NULL,
  `name` varchar(40) COLLATE utf8mb4_general_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
  `cooldown_sec` int NOT NULL,
  `power` int NOT NULL,
  `ability_type` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `radius` int NOT NULL DEFAULT '0',
  `duration_sec` int NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `hero_abilities`
--

INSERT INTO `hero_abilities` (`id`, `hero_id`, `slot`, `name`, `description`, `cooldown_sec`, `power`, `ability_type`, `radius`, `duration_sec`) VALUES
(1, 1, 1, 'Charge', 'Dash forward and hit enemies in the way.', 10, 60, 'dash', 30, 0),
(2, 1, 2, 'Bulwark', 'Take less damage for a few seconds.', 16, 50, 'shield', 0, 5),
(3, 1, 3, 'War Cry', 'Allies nearby deal more damage.', 24, 30, 'buff', 120, 8),
(4, 2, 1, 'Piercing Shot', 'A long arrow through a line of enemies.', 9, 90, 'line', 14, 0),
(5, 2, 2, 'Arrow Rain', 'Arrows fall on an area.', 15, 70, 'area', 60, 2),
(6, 2, 3, 'Rapid Fire', 'Shoot much faster for a while.', 22, 60, 'buff', 0, 6),
(7, 3, 1, 'Fireball', 'Explosive ball at the target spot.', 8, 110, 'area', 48, 0),
(8, 3, 2, 'Frost Nova', 'Slow and damage enemies around the Mage.', 16, 60, 'nova', 80, 3),
(9, 3, 3, 'Arcane Surge', 'Heal allies nearby.', 26, 80, 'heal', 100, 0),
(16, 4, 1, 'Feral Leap', 'Leap to the cursor, striking enemies where you land.', 10, 70, 'dash', 30, 0),
(17, 4, 2, 'Howl', 'A terrifying howl damages and slows nearby enemies.', 18, 50, 'nova', 90, 3),
(18, 4, 3, 'Shapeshift', 'Become a werewolf: faster, melee, much stronger, steals life. Heals on transform.', 30, 0, 'shift', 0, 14),
(19, 5, 1, 'Bone Spear', 'Hurl a spear of bone that pierces every enemy in a line.', 8, 65, 'line', 18, 0),
(20, 5, 2, 'Soul Burst', 'A wave of death energy damages and slows nearby enemies.', 16, 45, 'nova', 100, 2),
(21, 5, 3, 'Dark Ritual', 'Raise every fresh corpse around you as undead (no dice roll, caps still apply).', 35, 0, 'raise', 220, 0);

-- --------------------------------------------------------

--
-- Table structure for table `hero_equipment`
--

DROP TABLE IF EXISTS `hero_equipment`;
CREATE TABLE `hero_equipment` (
  `user_id` int UNSIGNED NOT NULL,
  `hero_id` int NOT NULL,
  `slot` enum('weapon','armor','trinket') COLLATE utf8mb4_general_ci NOT NULL,
  `player_item_id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `hero_equipment`
--

INSERT INTO `hero_equipment` (`user_id`, `hero_id`, `slot`, `player_item_id`) VALUES
(1, 4, 'trinket', 1),
(1, 4, 'weapon', 18),
(1, 4, 'armor', 26);

-- --------------------------------------------------------

--
-- Table structure for table `hero_xp`
--

DROP TABLE IF EXISTS `hero_xp`;
CREATE TABLE `hero_xp` (
  `user_id` int NOT NULL,
  `hero_id` int NOT NULL,
  `xp` int NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `hero_xp`
--

INSERT INTO `hero_xp` (`user_id`, `hero_id`, `xp`) VALUES
(1, 4, 39);

-- --------------------------------------------------------

--
-- Table structure for table `items`
--

DROP TABLE IF EXISTS `items`;
CREATE TABLE `items` (
  `id` int NOT NULL,
  `name` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `slot` enum('weapon','armor','trinket') COLLATE utf8mb4_general_ci NOT NULL,
  `rarity` enum('common','uncommon','rare','epic','legendary','mythical') COLLATE utf8mb4_general_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
  `hp_pct` int NOT NULL DEFAULT '0',
  `damage_pct` int NOT NULL DEFAULT '0',
  `speed_pct` int NOT NULL DEFAULT '0',
  `cdr_pct` int NOT NULL DEFAULT '0',
  `lifesteal_pct` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `items`
--

INSERT INTO `items` (`id`, `name`, `slot`, `rarity`, `description`, `hp_pct`, `damage_pct`, `speed_pct`, `cdr_pct`, `lifesteal_pct`, `is_active`) VALUES
(1, 'Rusty Blade', 'weapon', 'common', '', 0, 5, 0, 0, 0, 1),
(2, 'Iron Sword', 'weapon', 'uncommon', '', 0, 10, 0, 0, 0, 1),
(3, 'Knight Edge', 'weapon', 'rare', '', 0, 16, 0, 0, 0, 1),
(4, 'Dread Cleaver', 'weapon', 'epic', '', 0, 24, 0, 0, 0, 1),
(5, 'Soulreaver', 'weapon', 'legendary', 'Drinks the life of the fallen.', 0, 35, 0, 0, 8, 1),
(6, 'Patched Vest', 'armor', 'common', '', 8, 0, 0, 0, 0, 1),
(7, 'Leather Coat', 'armor', 'uncommon', '', 15, 0, 0, 0, 0, 1),
(8, 'Chain Mail', 'armor', 'rare', '', 24, 0, 0, 0, 0, 1),
(9, 'Plate of Ages', 'armor', 'epic', '', 35, 0, 0, 0, 0, 1),
(10, 'Dragonscale', 'armor', 'legendary', 'Scales older than the kingdom.', 50, 0, 5, 0, 0, 1),
(11, 'Wooden Charm', 'trinket', 'common', '', 0, 0, 0, 4, 0, 1),
(12, 'Silver Ring', 'trinket', 'uncommon', '', 0, 0, 0, 8, 0, 1),
(13, 'Glowstone', 'trinket', 'rare', '', 0, 0, 0, 12, 0, 1),
(14, 'Moon Amulet', 'trinket', 'epic', '', 0, 0, 0, 16, 0, 1),
(15, 'Heart of Summon', 'trinket', 'legendary', 'Power flows faster through you.', 0, 0, 0, 22, 0, 1),
(16, 'Hunting Knife', 'weapon', 'common', 'Quick but small.', 0, 4, 2, 0, 0, 1),
(17, 'Splintered Club', 'weapon', 'common', '', 0, 6, 0, 0, 0, 1),
(18, 'Steel Saber', 'weapon', 'uncommon', '', 0, 9, 3, 0, 0, 1),
(19, 'Hunter\'s Fang', 'weapon', 'uncommon', 'Bites back.', 0, 8, 0, 0, 2, 1),
(20, 'Frostbrand', 'weapon', 'rare', 'Cold to the touch.', 0, 14, 4, 0, 0, 1),
(21, 'Stormcaller Blade', 'weapon', 'rare', 'Crackles before every swing.', 0, 13, 0, 6, 0, 1),
(22, 'Voidpiercer', 'weapon', 'epic', 'Cuts through the dark.', 0, 22, 0, 0, 4, 1),
(23, 'Emberfang', 'weapon', 'epic', 'Still warm from the forge.', 6, 25, 0, 0, 0, 1),
(24, 'Sunforged Edge', 'weapon', 'legendary', 'Forged in the heart of a star.', 0, 32, 0, 10, 0, 1),
(25, 'Eclipse, Blade of the Last Dawn', 'weapon', 'mythical', 'The light of a dying sun, made steel.', 0, 48, 0, 8, 10, 1),
(26, 'Worldsplitter Aeon', 'weapon', 'mythical', 'It remembers every war.', 0, 55, 6, 0, 6, 1),
(27, 'Torn Tunic', 'armor', 'common', '', 6, 0, 1, 0, 0, 1),
(28, 'Scout\'s Cloak', 'armor', 'uncommon', 'Light and quiet.', 8, 0, 5, 0, 0, 1),
(29, 'Studded Jerkin', 'armor', 'uncommon', '', 13, 0, 2, 0, 0, 1),
(30, 'Runed Hauberk', 'armor', 'rare', 'Runes hum when you fight.', 20, 0, 0, 5, 0, 1),
(31, 'Warden\'s Brigandine', 'armor', 'rare', '', 26, 3, 0, 0, 0, 1),
(32, 'Obsidian Plate', 'armor', 'epic', '', 32, 6, 0, 0, 0, 1),
(33, 'Shadowweave', 'armor', 'epic', 'Woven from the space between torches.', 26, 0, 8, 0, 0, 1),
(34, 'Phoenix Mantle', 'armor', 'legendary', 'Burns, never burns out.', 45, 0, 0, 6, 4, 1),
(35, 'Aegis of the Fallen Star', 'armor', 'mythical', 'Fell from the sky and stayed.', 75, 10, 5, 0, 0, 1),
(36, 'Wraith of Eternity', 'armor', 'mythical', 'Death politely declines.', 65, 0, 0, 10, 8, 1),
(37, 'Lucky Coin', 'trinket', 'common', 'Heads, you win.', 0, 0, 0, 5, 0, 1),
(38, 'Bone Whistle', 'trinket', 'common', '', 0, 0, 1, 3, 0, 1),
(39, 'Jade Pendant', 'trinket', 'uncommon', '', 4, 0, 0, 7, 0, 1),
(40, 'Copper Signet', 'trinket', 'uncommon', '', 0, 3, 0, 6, 0, 1),
(41, 'Ember Locket', 'trinket', 'rare', '', 0, 4, 0, 10, 0, 1),
(42, 'Sage\'s Eye', 'trinket', 'rare', 'Sees the next move.', 6, 0, 0, 11, 0, 1),
(43, 'Void Shard', 'trinket', 'epic', '', 0, 8, 0, 14, 0, 1),
(44, 'Blood Rosary', 'trinket', 'epic', '', 0, 0, 0, 12, 5, 1),
(45, 'Phoenix Feather', 'trinket', 'legendary', '', 12, 0, 0, 20, 0, 1),
(46, 'Eye of the Archon', 'trinket', 'mythical', 'It never blinks.', 12, 12, 0, 30, 0, 1),
(47, 'Crown of Stars', 'trinket', 'mythical', 'Worn by no king.', 18, 0, 0, 26, 6, 1);

-- --------------------------------------------------------

--
-- Table structure for table `player_hero`
--

DROP TABLE IF EXISTS `player_hero`;
CREATE TABLE `player_hero` (
  `user_id` int UNSIGNED NOT NULL,
  `hero_id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `player_hero`
--

INSERT INTO `player_hero` (`user_id`, `hero_id`) VALUES
(1, 4);

-- --------------------------------------------------------

--
-- Table structure for table `player_items`
--

DROP TABLE IF EXISTS `player_items`;
CREATE TABLE `player_items` (
  `id` int NOT NULL,
  `user_id` int UNSIGNED NOT NULL,
  `item_id` int NOT NULL,
  `obtained_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `player_items`
--

INSERT INTO `player_items` (`id`, `user_id`, `item_id`, `obtained_at`) VALUES
(1, 1, 12, '2026-11-17 21:12:59'),
(2, 1, 6, '2026-11-17 21:12:59'),
(3, 1, 2, '2026-11-17 21:12:59'),
(4, 1, 11, '2026-11-18 23:46:00'),
(5, 1, 11, '2026-11-18 23:46:00'),
(6, 1, 1, '2026-11-18 23:46:00'),
(7, 1, 1, '2026-11-18 23:46:00'),
(8, 1, 7, '2026-11-18 23:46:00'),
(9, 1, 8, '2026-11-18 23:46:00'),
(10, 1, 6, '2026-11-18 23:46:00'),
(11, 1, 12, '2026-11-18 23:46:00'),
(12, 1, 11, '2026-11-18 23:46:00'),
(13, 1, 1, '2026-11-18 23:46:00'),
(14, 1, 1, '2026-11-18 23:46:00'),
(15, 1, 1, '2026-11-18 23:46:00'),
(16, 1, 1, '2026-11-18 23:46:00'),
(17, 1, 2, '2026-11-18 23:46:00'),
(18, 1, 4, '2026-11-18 23:46:00'),
(19, 1, 3, '2026-11-18 23:46:00'),
(20, 1, 1, '2026-11-18 23:46:00'),
(21, 1, 7, '2026-11-18 23:46:00'),
(22, 1, 2, '2026-11-18 23:46:00'),
(23, 1, 2, '2026-11-18 23:46:00'),
(24, 1, 1, '2026-11-18 23:46:00'),
(25, 1, 4, '2026-11-18 23:46:00'),
(26, 1, 9, '2026-11-18 23:46:00'),
(27, 1, 2, '2026-11-18 23:46:00'),
(28, 1, 7, '2026-11-18 23:46:00'),
(29, 1, 6, '2026-11-18 23:46:00'),
(30, 1, 11, '2026-11-18 23:46:00'),
(31, 1, 11, '2026-11-18 23:46:00'),
(32, 1, 12, '2026-11-18 23:46:00');

-- --------------------------------------------------------

--
-- Table structure for table `player_loadout`
--

DROP TABLE IF EXISTS `player_loadout`;
CREATE TABLE `player_loadout` (
  `user_id` int UNSIGNED NOT NULL,
  `slot` tinyint NOT NULL,
  `unit_id` int UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `player_loadout`
--

INSERT INTO `player_loadout` (`user_id`, `slot`, `unit_id`) VALUES
(1, 1, 13),
(1, 2, 14),
(1, 3, 15),
(1, 4, 16),
(1, 5, 19);

-- --------------------------------------------------------

--
-- Table structure for table `player_skills`
--

DROP TABLE IF EXISTS `player_skills`;
CREATE TABLE `player_skills` (
  `user_id` int UNSIGNED NOT NULL,
  `skill_id` int UNSIGNED NOT NULL,
  `level` tinyint UNSIGNED NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `player_skills`
--

INSERT INTO `player_skills` (`user_id`, `skill_id`, `level`) VALUES
(1, 1, 5),
(1, 2, 5),
(1, 3, 3),
(1, 4, 5),
(1, 5, 5),
(1, 6, 5),
(1, 7, 5),
(1, 8, 5),
(1, 9, 4),
(1, 10, 3),
(1, 12, 1),
(1, 13, 1),
(1, 14, 1),
(1, 15, 1),
(1, 16, 1),
(1, 17, 1),
(1, 18, 1),
(1, 19, 1),
(1, 20, 5),
(1, 21, 3),
(1, 22, 5),
(1, 23, 5),
(1, 24, 5),
(1, 25, 3),
(1, 26, 5),
(1, 27, 5),
(1, 28, 3),
(1, 29, 5),
(1, 30, 5),
(1, 31, 3),
(1, 32, 5),
(1, 33, 3),
(1, 34, 5),
(1, 35, 5),
(1, 36, 5),
(1, 37, 3),
(1, 38, 5),
(1, 39, 5),
(1, 40, 3),
(1, 41, 5),
(1, 42, 5),
(1, 43, 3),
(1, 44, 5),
(1, 45, 5),
(1, 46, 3),
(1, 47, 5),
(1, 48, 5),
(1, 49, 5),
(1, 50, 3),
(1, 51, 1),
(1, 52, 1),
(1, 53, 5),
(1, 54, 5),
(1, 55, 3),
(1, 56, 5),
(1, 57, 5),
(1, 58, 3),
(1, 59, 1),
(1, 60, 5),
(1, 61, 3),
(1, 63, 5),
(1, 66, 5),
(1, 69, 5),
(1, 72, 4),
(1, 75, 4),
(1, 77, 5),
(1, 78, 5),
(1, 79, 5),
(1, 80, 5),
(1, 81, 4),
(1, 82, 4),
(1, 84, 5),
(1, 93, 3),
(1, 94, 3),
(1, 95, 5),
(1, 96, 3),
(1, 97, 3);

-- --------------------------------------------------------

--
-- Table structure for table `scores`
--

DROP TABLE IF EXISTS `scores`;
CREATE TABLE `scores` (
  `id` int UNSIGNED NOT NULL,
  `user_id` int UNSIGNED NOT NULL,
  `map_id` tinyint NOT NULL DEFAULT '1',
  `score` int UNSIGNED NOT NULL,
  `waves_reached` int UNSIGNED NOT NULL,
  `kills` int UNSIGNED NOT NULL,
  `souls_earned` int UNSIGNED NOT NULL,
  `duration_sec` int UNSIGNED NOT NULL,
  `played_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `scores`
--

INSERT INTO `scores` (`id`, `user_id`, `map_id`, `score`, `waves_reached`, `kills`, `souls_earned`, `duration_sec`, `played_at`) VALUES
(1, 1, 1, 113, 1, 3, 1, 58, '2026-11-11 20:45:06'),
(2, 1, 2, 8419, 22, 243, 384, 913, '2026-11-17 16:45:06'),
(4, 1, 1, 814, 5, 23, 24, 554, '2026-11-17 21:12:59'),
(5, 1, 1, 31494, 38, 835, 2176, 2105, '2026-11-18 23:46:00'),
(6, 1, 1, 113, 1, 3, 3, 39, '2026-11-19 20:17:28');

-- --------------------------------------------------------

--
-- Table structure for table `skills`
--

DROP TABLE IF EXISTS `skills`;
CREATE TABLE `skills` (
  `id` int UNSIGNED NOT NULL,
  `name` varchar(40) COLLATE utf8mb4_general_ci NOT NULL,
  `description` varchar(160) COLLATE utf8mb4_general_ci NOT NULL,
  `branch` varchar(30) COLLATE utf8mb4_general_ci NOT NULL,
  `tier` tinyint UNSIGNED NOT NULL,
  `parent_skill_id` int UNSIGNED DEFAULT NULL,
  `unit_id` int UNSIGNED DEFAULT NULL,
  `stat` varchar(30) COLLATE utf8mb4_general_ci NOT NULL,
  `bonus_per_level` decimal(6,2) NOT NULL,
  `base_cost` int UNSIGNED NOT NULL,
  `cost_growth` decimal(3,2) NOT NULL DEFAULT '1.50',
  `max_level` tinyint UNSIGNED NOT NULL DEFAULT '5',
  `unit_line` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `unit_tier` tinyint NOT NULL DEFAULT '0',
  `unlocks_unit_id` int DEFAULT NULL,
  `hero_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `skills`
--

INSERT INTO `skills` (`id`, `name`, `description`, `branch`, `tier`, `parent_skill_id`, `unit_id`, `stat`, `bonus_per_level`, `base_cost`, `cost_growth`, `max_level`, `unit_line`, `unit_tier`, `unlocks_unit_id`, `hero_id`) VALUES
(1, 'Iron Skin', 'Swordsman HP +10% per level', 'warrior', 1, NULL, 2, 'hp', 10.00, 5, 1.50, 5, 'swordsman', 0, NULL, NULL),
(2, 'Sharp Blades', 'Swordsman damage +10% per level', 'warrior', 2, 1, 2, 'damage', 10.00, 8, 1.50, 5, 'swordsman', 0, NULL, NULL),
(3, 'Fleet Footed', 'Swordsman speed +5% per level', 'warrior', 3, 2, 2, 'speed', 5.00, 12, 1.60, 3, 'swordsman', 0, NULL, NULL),
(4, 'Keen Eye', 'Archer range +8% per level', 'ranger', 1, NULL, 3, 'range', 8.00, 5, 1.50, 5, 'archer', 0, NULL, NULL),
(5, 'Piercing Arrows', 'Archer damage +10% per level', 'ranger', 2, 4, 3, 'damage', 10.00, 8, 1.50, 5, 'archer', 0, NULL, NULL),
(6, 'Quick Miners', 'Miner speed +10% per level', 'economy', 1, NULL, 1, 'speed', 10.00, 5, 1.50, 5, 'miner', 0, NULL, NULL),
(7, 'Rich Veins', 'Start each run with +25 gold/level', 'economy', 2, 6, NULL, 'start_gold', 25.00, 8, 1.50, 5, NULL, 0, NULL, NULL),
(8, 'Thrifty Summoner', 'All summon costs -5% per level', 'summoner', 1, NULL, NULL, 'cost', -5.00, 6, 1.60, 5, NULL, 0, NULL, NULL),
(9, 'Rapid Summon', 'Summon cooldown -8% per level', 'summoner', 2, 8, NULL, 'summon_cooldown', -8.00, 10, 1.60, 4, NULL, 0, NULL, NULL),
(10, 'Summon Fall', 'Meteor spell: unlock and upgrade', 'summoner', 3, 9, NULL, 'meteor', 1.00, 30, 2.00, 3, NULL, 0, NULL, NULL),
(12, 'Unlock Elite Miner', 'Unlocks the Elite Miner', 'economy', 1, NULL, 9, 'hp', 0.00, 150, 1.00, 1, 'miner', 1, 9, NULL),
(13, 'Unlock Elite Swordsman', 'Unlocks the Elite Swordsman', 'warrior', 1, NULL, 10, 'hp', 0.00, 150, 1.00, 1, 'swordsman', 1, 10, NULL),
(14, 'Unlock Elite Archer', 'Unlocks the Elite Archer', 'ranger', 1, NULL, 11, 'hp', 0.00, 150, 1.00, 1, 'archer', 1, 11, NULL),
(15, 'Unlock Elite Mage', 'Unlocks the Elite Mage', 'summoner', 1, NULL, 12, 'hp', 0.00, 150, 1.00, 1, 'mage', 1, 12, NULL),
(16, 'Unlock Godly Miner', 'Unlocks the Godly Miner', 'economy', 2, NULL, 13, 'hp', 0.00, 500, 1.00, 1, 'miner', 2, 13, NULL),
(17, 'Unlock Godly Swordsman', 'Unlocks the Godly Swordsman', 'warrior', 2, NULL, 14, 'hp', 0.00, 500, 1.00, 1, 'swordsman', 2, 14, NULL),
(18, 'Unlock Godly Archer', 'Unlocks the Godly Archer', 'ranger', 2, NULL, 15, 'hp', 0.00, 500, 1.00, 1, 'archer', 2, 15, NULL),
(19, 'Unlock Godly Mage', 'Unlocks the Godly Mage', 'summoner', 2, NULL, 16, 'hp', 0.00, 500, 1.00, 1, 'mage', 2, 16, NULL),
(20, 'Elite Miner Vigor', 'Elite Miner HP +15% per level', 'economy', 1, 12, 9, 'hp', 15.00, 30, 1.60, 5, 'miner', 1, NULL, NULL),
(21, 'Elite Miner Haste', 'Elite Miner speed +5% per level', 'economy', 1, 12, 9, 'speed', 5.00, 35, 1.60, 3, 'miner', 1, NULL, NULL),
(22, 'Elite Miner Pick', 'Elite Miner damage +12% per level', 'economy', 1, 12, 9, 'damage', 12.00, 40, 1.60, 5, 'miner', 1, NULL, NULL),
(23, 'Elite Guard', 'Elite Swordsman HP +15% per level', 'warrior', 1, 13, 10, 'hp', 15.00, 30, 1.60, 5, 'swordsman', 1, NULL, NULL),
(24, 'Elite Edge', 'Elite Swordsman damage +12% per level', 'warrior', 1, 13, 10, 'damage', 12.00, 40, 1.60, 5, 'swordsman', 1, NULL, NULL),
(25, 'Elite Stride', 'Elite Swordsman speed +5% per level', 'warrior', 1, 13, 10, 'speed', 5.00, 35, 1.60, 3, 'swordsman', 1, NULL, NULL),
(26, 'Elite Quiver', 'Elite Archer HP +15% per level', 'ranger', 1, 14, 11, 'hp', 15.00, 30, 1.60, 5, 'archer', 1, NULL, NULL),
(27, 'Elite Barbs', 'Elite Archer damage +12% per level', 'ranger', 1, 14, 11, 'damage', 12.00, 40, 1.60, 5, 'archer', 1, NULL, NULL),
(28, 'Elite Eagle Eye', 'Elite Archer range +8% per level', 'ranger', 1, 14, 11, 'range', 8.00, 35, 1.60, 3, 'archer', 1, NULL, NULL),
(29, 'Elite Ward', 'Elite Mage HP +15% per level', 'summoner', 1, 15, 12, 'hp', 15.00, 30, 1.60, 5, 'mage', 1, NULL, NULL),
(30, 'Elite Arcana', 'Elite Mage damage +12% per level', 'summoner', 1, 15, 12, 'damage', 12.00, 40, 1.60, 5, 'mage', 1, NULL, NULL),
(31, 'Elite Focus', 'Elite Mage range +6% per level', 'summoner', 1, 15, 12, 'range', 6.00, 35, 1.60, 3, 'mage', 1, NULL, NULL),
(32, 'Godly Miner Vigor', 'Godly Miner HP +20% per level', 'economy', 2, 16, 13, 'hp', 20.00, 100, 1.60, 5, 'miner', 2, NULL, NULL),
(33, 'Godly Miner Haste', 'Godly Miner speed +6% per level', 'economy', 2, 16, 13, 'speed', 6.00, 90, 1.60, 3, 'miner', 2, NULL, NULL),
(34, 'Godly Miner Pick', 'Godly Miner damage +15% per level', 'economy', 2, 16, 13, 'damage', 15.00, 120, 1.60, 5, 'miner', 2, NULL, NULL),
(35, 'Godly Guard', 'Godly Swordsman HP +20% per level', 'warrior', 2, 17, 14, 'hp', 20.00, 100, 1.60, 5, 'swordsman', 2, NULL, NULL),
(36, 'Godly Edge', 'Godly Swordsman damage +15% per level', 'warrior', 2, 17, 14, 'damage', 15.00, 120, 1.60, 5, 'swordsman', 2, NULL, NULL),
(37, 'Godly Stride', 'Godly Swordsman speed +6% per level', 'warrior', 2, 17, 14, 'speed', 6.00, 90, 1.60, 3, 'swordsman', 2, NULL, NULL),
(38, 'Godly Quiver', 'Godly Archer HP +20% per level', 'ranger', 2, 18, 15, 'hp', 20.00, 100, 1.60, 5, 'archer', 2, NULL, NULL),
(39, 'Godly Barbs', 'Godly Archer damage +15% per level', 'ranger', 2, 18, 15, 'damage', 15.00, 120, 1.60, 5, 'archer', 2, NULL, NULL),
(40, 'Godly Eagle Eye', 'Godly Archer range +8% per level', 'ranger', 2, 18, 15, 'range', 8.00, 90, 1.60, 3, 'archer', 2, NULL, NULL),
(41, 'Godly Ward', 'Godly Mage HP +20% per level', 'summoner', 2, 19, 16, 'hp', 20.00, 100, 1.60, 5, 'mage', 2, NULL, NULL),
(42, 'Godly Arcana', 'Godly Mage damage +15% per level', 'summoner', 2, 19, 16, 'damage', 15.00, 120, 1.60, 5, 'mage', 2, NULL, NULL),
(43, 'Godly Focus', 'Godly Mage range +6% per level', 'summoner', 2, 19, 16, 'range', 6.00, 90, 1.60, 3, 'mage', 2, NULL, NULL),
(44, 'Arcane Power', 'Mage damage +10% per level', 'summoner', 1, NULL, 4, 'damage', 10.00, 8, 1.50, 5, 'mage', 0, NULL, NULL),
(45, 'Arcane Hide', 'Mage HP +10% per level', 'summoner', 1, NULL, 4, 'hp', 10.00, 8, 1.50, 5, 'mage', 0, NULL, NULL),
(46, 'Far Sight', 'Mage range +8% per level', 'summoner', 1, NULL, 4, 'range', 8.00, 5, 1.50, 3, 'mage', 0, NULL, NULL),
(47, 'Sturdy Miners', 'Miner HP +10% per level', 'economy', 1, NULL, 1, 'hp', 10.00, 5, 1.50, 5, 'miner', 0, NULL, NULL),
(48, 'Gentle Touch', 'Healer healing +10% per level', 'summoner', 1, NULL, 17, 'damage', 10.00, 8, 1.50, 5, 'healer', 0, NULL, NULL),
(49, 'Soft Robes', 'Healer HP +10% per level', 'summoner', 1, NULL, 17, 'hp', 10.00, 8, 1.50, 5, 'healer', 0, NULL, NULL),
(50, 'Long Reach', 'Healer range +8% per level', 'summoner', 1, NULL, 17, 'range', 8.00, 5, 1.50, 3, 'healer', 0, NULL, NULL),
(51, 'Unlock Elite Healer', 'Unlocks the Elite Healer', 'summoner', 1, NULL, 18, 'hp', 0.00, 150, 1.00, 1, 'healer', 1, 18, NULL),
(52, 'Unlock Godly Healer', 'Unlocks the Godly Healer', 'summoner', 2, NULL, 19, 'hp', 0.00, 500, 1.00, 1, 'healer', 2, 19, NULL),
(53, 'Elite Mending', 'Elite Healer healing +12% per level', 'summoner', 1, 51, 18, 'damage', 12.00, 40, 1.60, 5, 'healer', 1, NULL, NULL),
(54, 'Elite Vitality', 'Elite Healer HP +15% per level', 'summoner', 1, 51, 18, 'hp', 15.00, 30, 1.60, 5, 'healer', 1, NULL, NULL),
(55, 'Elite Reach', 'Elite Healer range +8% per level', 'summoner', 1, 51, 18, 'range', 8.00, 35, 1.60, 3, 'healer', 1, NULL, NULL),
(56, 'Godly Mending', 'Godly Healer healing +15% per level', 'summoner', 2, 52, 19, 'damage', 15.00, 120, 1.60, 5, 'healer', 2, NULL, NULL),
(57, 'Godly Vitality', 'Godly Healer HP +20% per level', 'summoner', 2, 52, 19, 'hp', 20.00, 100, 1.60, 5, 'healer', 2, NULL, NULL),
(58, 'Godly Reach', 'Godly Healer range +8% per level', 'summoner', 2, 52, 19, 'range', 8.00, 90, 1.60, 3, 'healer', 2, NULL, NULL),
(59, 'Mage Vitality', 'More HP.', 'hero', 1, NULL, NULL, 'hp', 8.00, 40, 1.50, 5, NULL, 0, NULL, 3),
(60, 'Knight Vitality', 'More HP.', 'hero', 1, NULL, NULL, 'hp', 8.00, 40, 1.50, 5, NULL, 0, NULL, 1),
(61, 'Archer Vitality', 'More HP.', 'hero', 1, NULL, NULL, 'hp', 8.00, 40, 1.50, 5, NULL, 0, NULL, 2),
(62, 'Mage Might', 'More damage.', 'hero', 1, NULL, NULL, 'damage', 8.00, 40, 1.50, 5, NULL, 0, NULL, 3),
(63, 'Knight Might', 'More damage.', 'hero', 1, NULL, NULL, 'damage', 8.00, 40, 1.50, 5, NULL, 0, NULL, 1),
(64, 'Archer Might', 'More damage.', 'hero', 1, NULL, NULL, 'damage', 8.00, 40, 1.50, 5, NULL, 0, NULL, 2),
(65, 'Mage Focus', 'Abilities recharge faster.', 'hero', 2, NULL, NULL, 'cdr', 4.00, 60, 1.50, 5, NULL, 0, NULL, 3),
(66, 'Knight Focus', 'Abilities recharge faster.', 'hero', 2, NULL, NULL, 'cdr', 4.00, 60, 1.50, 5, NULL, 0, NULL, 1),
(67, 'Archer Focus', 'Abilities recharge faster.', 'hero', 2, NULL, NULL, 'cdr', 4.00, 60, 1.50, 5, NULL, 0, NULL, 2),
(68, 'Mage Spellpower', 'Abilities hit harder.', 'hero', 2, NULL, NULL, 'ability', 8.00, 60, 1.50, 5, NULL, 0, NULL, 3),
(69, 'Knight Spellpower', 'Abilities hit harder.', 'hero', 2, NULL, NULL, 'ability', 8.00, 60, 1.50, 5, NULL, 0, NULL, 1),
(70, 'Archer Spellpower', 'Abilities hit harder.', 'hero', 2, NULL, NULL, 'ability', 8.00, 60, 1.50, 5, NULL, 0, NULL, 2),
(71, 'Mage Swiftness', 'Move faster.', 'hero', 3, NULL, NULL, 'speed', 4.00, 50, 1.50, 4, NULL, 0, NULL, 3),
(72, 'Knight Swiftness', 'Move faster.', 'hero', 3, NULL, NULL, 'speed', 4.00, 50, 1.50, 4, NULL, 0, NULL, 1),
(73, 'Archer Swiftness', 'Move faster.', 'hero', 3, NULL, NULL, 'speed', 4.00, 50, 1.50, 4, NULL, 0, NULL, 2),
(74, 'Mage Resolve', 'Revive sooner after dying.', 'hero', 3, NULL, NULL, 'revive', 6.00, 80, 1.50, 4, NULL, 0, NULL, 3),
(75, 'Knight Resolve', 'Revive sooner after dying.', 'hero', 3, NULL, NULL, 'revive', 6.00, 80, 1.50, 4, NULL, 0, NULL, 1),
(76, 'Archer Resolve', 'Revive sooner after dying.', 'hero', 3, NULL, NULL, 'revive', 6.00, 80, 1.50, 4, NULL, 0, NULL, 2),
(77, 'Lycan Vitality', 'More HP.', 'hero', 1, NULL, NULL, 'hp', 8.00, 40, 1.50, 5, NULL, 0, NULL, 4),
(78, 'Lycan Might', 'More damage.', 'hero', 1, NULL, NULL, 'damage', 8.00, 40, 1.50, 5, NULL, 0, NULL, 4),
(79, 'Lycan Focus', 'Abilities recharge faster.', 'hero', 2, NULL, NULL, 'cdr', 4.00, 60, 1.50, 5, NULL, 0, NULL, 4),
(80, 'Lycan Spellpower', 'Abilities hit harder.', 'hero', 2, NULL, NULL, 'ability', 8.00, 60, 1.50, 5, NULL, 0, NULL, 4),
(81, 'Lycan Swiftness', 'Move faster.', 'hero', 3, NULL, NULL, 'speed', 4.00, 50, 1.50, 4, NULL, 0, NULL, 4),
(82, 'Lycan Resolve', 'Revive sooner after dying.', 'hero', 3, NULL, NULL, 'revive', 6.00, 80, 1.50, 4, NULL, 0, NULL, 4),
(84, 'Necromancer Vitality', 'More HP.', 'hero', 1, NULL, NULL, 'hp', 8.00, 40, 1.50, 5, NULL, 0, NULL, 5),
(85, 'Necromancer Might', 'More damage.', 'hero', 1, NULL, NULL, 'damage', 8.00, 40, 1.50, 5, NULL, 0, NULL, 5),
(86, 'Necromancer Soul Harvest', 'Higher chance for kills to rise as undead (+% per level).', 'hero', 2, NULL, NULL, 'raise', 5.00, 60, 1.50, 5, NULL, 0, NULL, 5),
(87, 'Necromancer Focus', 'Abilities recharge faster.', 'hero', 2, NULL, NULL, 'cdr', 4.00, 60, 1.50, 5, NULL, 0, NULL, 5),
(88, 'Necromancer Grave Horde', 'Control more undead at once (+1 per level).', 'hero', 3, NULL, NULL, 'horde', 1.00, 80, 1.50, 5, NULL, 0, NULL, 5),
(89, 'Necromancer Spellpower', 'Abilities hit harder and undead are stronger.', 'hero', 3, NULL, NULL, 'ability', 8.00, 60, 1.50, 5, NULL, 0, NULL, 5),
(90, 'Necromancer Swiftness', 'Move faster.', 'hero', 4, NULL, NULL, 'speed', 4.00, 50, 1.50, 4, NULL, 0, NULL, 5),
(91, 'Necromancer Resolve', 'Revive sooner after dying.', 'hero', 4, NULL, NULL, 'revive', 6.00, 80, 1.50, 4, NULL, 0, NULL, 5),
(93, 'Blizzard', 'Spell (B): a freezing storm slows and damages enemies', 'summoner', 4, 10, NULL, 'spell_frost', 1.00, 40, 2.00, 3, NULL, 0, NULL, NULL),
(94, 'Healing Rain', 'Spell (H): heals your army standing in the rain', 'summoner', 4, 10, NULL, 'spell_heal', 1.00, 40, 2.00, 3, NULL, 0, NULL, NULL),
(95, 'Arcane Mastery', 'All spells recharge 6% faster per level', 'summoner', 4, 10, NULL, 'spell_cdr', 6.00, 35, 1.60, 5, NULL, 0, NULL, NULL),
(96, 'War Horn', 'Spell (U): your whole army hits harder and moves faster', 'summoner', 5, 94, NULL, 'spell_rally', 1.00, 60, 2.00, 3, NULL, 0, NULL, NULL),
(97, 'Lightning Storm', 'Spell (I): bolts from the sky strike random enemies', 'summoner', 5, 93, NULL, 'spell_storm', 1.00, 60, 2.00, 3, NULL, 0, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `units`
--

DROP TABLE IF EXISTS `units`;
CREATE TABLE `units` (
  `id` int UNSIGNED NOT NULL,
  `name` varchar(40) COLLATE utf8mb4_general_ci NOT NULL,
  `class_type` varchar(30) COLLATE utf8mb4_general_ci NOT NULL,
  `unit_line` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `tier` tinyint NOT NULL DEFAULT '0',
  `faction` enum('player','mob') COLLATE utf8mb4_general_ci NOT NULL,
  `cost` int UNSIGNED NOT NULL DEFAULT '0',
  `hp` int UNSIGNED NOT NULL,
  `damage` int UNSIGNED NOT NULL,
  `speed` int UNSIGNED NOT NULL,
  `attack_range` int UNSIGNED NOT NULL,
  `attack_cooldown` int UNSIGNED NOT NULL,
  `sprite_key` varchar(40) COLLATE utf8mb4_general_ci NOT NULL,
  `drop_souls` int UNSIGNED NOT NULL DEFAULT '0',
  `drop_chance` decimal(3,2) NOT NULL DEFAULT '0.00',
  `first_wave` int UNSIGNED NOT NULL DEFAULT '1',
  `spawn_weight` int UNSIGNED NOT NULL DEFAULT '1',
  `is_active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `units`
--

INSERT INTO `units` (`id`, `name`, `class_type`, `unit_line`, `tier`, `faction`, `cost`, `hp`, `damage`, `speed`, `attack_range`, `attack_cooldown`, `sprite_key`, `drop_souls`, `drop_chance`, `first_wave`, `spawn_weight`, `is_active`) VALUES
(1, 'Miner', 'miner', 'miner', 0, 'player', 25, 40, 3, 60, 24, 1000, 'miner', 0, 0.00, 1, 1, 1),
(2, 'Swordsman', 'swordsman', 'swordsman', 0, 'player', 50, 120, 12, 70, 28, 800, 'swordsman', 0, 0.00, 1, 1, 1),
(3, 'Archer', 'archer', 'archer', 0, 'player', 75, 60, 10, 65, 160, 1100, 'archer', 0, 0.00, 1, 1, 1),
(4, 'Mage', 'mage', 'mage', 0, 'player', 200, 50, 25, 55, 140, 1800, 'mage', 0, 0.00, 1, 1, 1),
(5, 'Slime', 'slime', NULL, 0, 'mob', 0, 50, 5, 40, 24, 1000, 'slime', 1, 0.60, 1, 10, 1),
(6, 'Goblin', 'goblin', NULL, 0, 'mob', 0, 70, 8, 70, 26, 700, 'goblin', 2, 0.50, 2, 8, 1),
(7, 'Goblin Archer', 'goblin_archer', NULL, 0, 'mob', 0, 45, 7, 60, 150, 1200, 'goblin_archer', 3, 0.50, 4, 5, 1),
(8, 'Giant', 'giant', NULL, 0, 'mob', 0, 600, 40, 30, 40, 1800, 'giant', 25, 1.00, 8, 1, 1),
(9, 'Elite Miner', 'miner', 'miner', 1, 'player', 60, 80, 5, 70, 24, 800, 'miner', 0, 0.00, 1, 1, 1),
(10, 'Elite Swordsman', 'swordsman', 'swordsman', 1, 'player', 120, 240, 20, 75, 28, 700, 'swordsman', 0, 0.00, 1, 1, 1),
(11, 'Elite Archer', 'archer', 'archer', 1, 'player', 170, 110, 17, 70, 170, 950, 'archer', 0, 0.00, 1, 1, 1),
(12, 'Elite Mage', 'mage', 'mage', 1, 'player', 400, 90, 42, 58, 150, 1600, 'mage', 0, 0.00, 1, 1, 1),
(13, 'Godly Miner', 'miner', 'miner', 2, 'player', 150, 140, 8, 85, 24, 600, 'miner', 0, 0.00, 1, 1, 1),
(14, 'Godly Swordsman', 'swordsman', 'swordsman', 2, 'player', 300, 520, 36, 85, 28, 550, 'swordsman', 0, 0.00, 1, 1, 1),
(15, 'Godly Archer', 'archer', 'archer', 2, 'player', 400, 190, 30, 78, 190, 800, 'archer', 0, 0.00, 1, 1, 1),
(16, 'Godly Mage', 'mage', 'mage', 2, 'player', 800, 150, 80, 62, 160, 1400, 'mage', 0, 0.00, 1, 1, 1),
(17, 'Healer', 'healer', 'healer', 0, 'player', 90, 55, 8, 62, 120, 1500, 'healer', 0, 0.00, 1, 1, 1),
(18, 'Elite Healer', 'healer', 'healer', 1, 'player', 220, 100, 14, 66, 130, 1300, 'healer', 0, 0.00, 1, 1, 1),
(19, 'Godly Healer', 'healer', 'healer', 2, 'player', 450, 170, 24, 70, 140, 1100, 'healer', 0, 0.00, 1, 1, 1),
(20, 'Zombie', 'zombie', NULL, 0, 'mob', 0, 110, 9, 32, 24, 1100, 'zombie', 2, 0.50, 1, 5, 1),
(21, 'Ghoul', 'ghoul', NULL, 0, 'mob', 0, 80, 12, 88, 24, 600, 'ghoul', 3, 0.50, 6, 4, 1);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int UNSIGNED NOT NULL,
  `username` varchar(30) COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `role` enum('admin','player') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'player',
  `souls` int UNSIGNED NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `email`, `password_hash`, `role`, `souls`, `created_at`) VALUES
(1, 'admin', 'admin@summonfall.test', '$2y$10$og0f/b6feaN8hqlJE8Z6X.iWFcOk/wBGrqedqjKLQikZxtHTBDDTG', 'admin', 467017, '2026-11-09 20:52:11');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `heroes`
--
ALTER TABLE `heroes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `hero_abilities`
--
ALTER TABLE `hero_abilities`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_hero_slot` (`hero_id`,`slot`);

--
-- Indexes for table `hero_equipment`
--
ALTER TABLE `hero_equipment`
  ADD PRIMARY KEY (`user_id`,`hero_id`,`slot`),
  ADD UNIQUE KEY `uq_item` (`player_item_id`),
  ADD KEY `hero_id` (`hero_id`);

--
-- Indexes for table `hero_xp`
--
ALTER TABLE `hero_xp`
  ADD PRIMARY KEY (`user_id`,`hero_id`);

--
-- Indexes for table `items`
--
ALTER TABLE `items`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `player_hero`
--
ALTER TABLE `player_hero`
  ADD PRIMARY KEY (`user_id`),
  ADD KEY `hero_id` (`hero_id`);

--
-- Indexes for table `player_items`
--
ALTER TABLE `player_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `item_id` (`item_id`),
  ADD KEY `fk_player_items_user` (`user_id`);

--
-- Indexes for table `player_loadout`
--
ALTER TABLE `player_loadout`
  ADD PRIMARY KEY (`user_id`,`slot`),
  ADD KEY `fk_player_loadout_unit` (`unit_id`);

--
-- Indexes for table `player_skills`
--
ALTER TABLE `player_skills`
  ADD PRIMARY KEY (`user_id`,`skill_id`),
  ADD KEY `skill_id` (`skill_id`);

--
-- Indexes for table `scores`
--
ALTER TABLE `scores`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_score` (`score`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `idx_scores_map` (`map_id`);

--
-- Indexes for table `skills`
--
ALTER TABLE `skills`
  ADD PRIMARY KEY (`id`),
  ADD KEY `parent_skill_id` (`parent_skill_id`),
  ADD KEY `unit_id` (`unit_id`),
  ADD KEY `fk_skills_hero` (`hero_id`);

--
-- Indexes for table `units`
--
ALTER TABLE `units`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `heroes`
--
ALTER TABLE `heroes`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `hero_abilities`
--
ALTER TABLE `hero_abilities`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `items`
--
ALTER TABLE `items`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=48;

--
-- AUTO_INCREMENT for table `player_items`
--
ALTER TABLE `player_items`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT for table `scores`
--
ALTER TABLE `scores`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `skills`
--
ALTER TABLE `skills`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=98;

--
-- AUTO_INCREMENT for table `units`
--
ALTER TABLE `units`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `hero_abilities`
--
ALTER TABLE `hero_abilities`
  ADD CONSTRAINT `hero_abilities_ibfk_1` FOREIGN KEY (`hero_id`) REFERENCES `heroes` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `hero_equipment`
--
ALTER TABLE `hero_equipment`
  ADD CONSTRAINT `fk_hero_equipment_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `hero_equipment_ibfk_1` FOREIGN KEY (`hero_id`) REFERENCES `heroes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `hero_equipment_ibfk_2` FOREIGN KEY (`player_item_id`) REFERENCES `player_items` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `player_hero`
--
ALTER TABLE `player_hero`
  ADD CONSTRAINT `fk_player_hero_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `player_hero_ibfk_1` FOREIGN KEY (`hero_id`) REFERENCES `heroes` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `player_items`
--
ALTER TABLE `player_items`
  ADD CONSTRAINT `fk_player_items_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `player_items_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `player_loadout`
--
ALTER TABLE `player_loadout`
  ADD CONSTRAINT `fk_player_loadout_unit` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_player_loadout_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `player_skills`
--
ALTER TABLE `player_skills`
  ADD CONSTRAINT `player_skills_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `player_skills_ibfk_2` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `scores`
--
ALTER TABLE `scores`
  ADD CONSTRAINT `scores_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `skills`
--
ALTER TABLE `skills`
  ADD CONSTRAINT `fk_skills_hero` FOREIGN KEY (`hero_id`) REFERENCES `heroes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `skills_ibfk_1` FOREIGN KEY (`parent_skill_id`) REFERENCES `skills` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `skills_ibfk_2` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE SET NULL;
SET FOREIGN_KEY_CHECKS=1;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
