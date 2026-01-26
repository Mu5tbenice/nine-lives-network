-- =============================================
-- Nine Lives Network - Spells Seed Data
-- =============================================
-- Run this in Supabase SQL Editor after zones.sql
-- =============================================

-- Ember Covenant (Fire) spells
INSERT INTO spells (name, school_id, mana_cost, effect_type, description) VALUES
  ('Flame Strike', 1, 1, 'offensive', 'A focused blast of fire at your target'),
  ('Ember Shield', 1, 1, 'defensive', 'Surround yourself in protective flames'),
  ('Inferno Boost', 1, 1, 'support', 'Empower your school with burning energy');

-- Tidal Conclave (Water) spells
INSERT INTO spells (name, school_id, mana_cost, effect_type, description) VALUES
  ('Tidal Surge', 2, 1, 'offensive', 'Crash a wave of water into your foe'),
  ('Aqua Barrier', 2, 1, 'defensive', 'Create a protective water shield'),
  ('Ocean''s Blessing', 2, 1, 'support', 'Refresh your school with calming waters');

-- Stone Covenant (Earth) spells
INSERT INTO spells (name, school_id, mana_cost, effect_type, description) VALUES
  ('Boulder Crush', 3, 1, 'offensive', 'Hurl a massive stone at your enemy'),
  ('Earthen Wall', 3, 1, 'defensive', 'Raise a wall of solid rock'),
  ('Terra Fortify', 3, 1, 'support', 'Strengthen your school with earth energy');

-- Zephyr Circle (Air) spells
INSERT INTO spells (name, school_id, mana_cost, effect_type, description) VALUES
  ('Gale Force', 4, 1, 'offensive', 'Blast your target with cutting winds'),
  ('Wind Veil', 4, 1, 'defensive', 'Wrap yourself in protective currents'),
  ('Zephyr''s Grace', 4, 1, 'support', 'Grant your school the speed of wind');

-- Storm Assembly (Lightning) spells
INSERT INTO spells (name, school_id, mana_cost, effect_type, description) VALUES
  ('Thunder Bolt', 5, 1, 'offensive', 'Strike your enemy with lightning'),
  ('Static Field', 5, 1, 'defensive', 'Create an electric barrier'),
  ('Storm Surge', 5, 1, 'support', 'Energize your school with storm power');

-- Umbral Syndicate (Shadow) spells
INSERT INTO spells (name, school_id, mana_cost, effect_type, description) VALUES
  ('Shadow Strike', 6, 1, 'offensive', 'Attack from the darkness'),
  ('Dark Shroud', 6, 1, 'defensive', 'Cloak yourself in shadows'),
  ('Umbral Pact', 6, 1, 'support', 'Bind your school in shadow unity');

-- Radiant Order (Light) spells
INSERT INTO spells (name, school_id, mana_cost, effect_type, description) VALUES
  ('Holy Smite', 7, 1, 'offensive', 'Burn your foe with pure light'),
  ('Divine Shield', 7, 1, 'defensive', 'Protect yourself with radiant energy'),
  ('Blessing of Light', 7, 1, 'support', 'Illuminate your school with hope');

-- Arcane Spire (Arcane) spells
INSERT INTO spells (name, school_id, mana_cost, effect_type, description) VALUES
  ('Arcane Missile', 8, 1, 'offensive', 'Launch pure magical energy'),
  ('Mana Ward', 8, 1, 'defensive', 'Create a barrier of raw magic'),
  ('Arcane Infusion', 8, 1, 'support', 'Channel arcane power to your school');

-- WildCat Path (Chaos) spells
INSERT INTO spells (name, school_id, mana_cost, effect_type, description) VALUES
  ('Chaos Bolt', 9, 1, 'offensive', 'Unpredictable magical attack'),
  ('Entropy Shield', 9, 1, 'defensive', 'Protection through randomness'),
  ('Wild Magic', 9, 1, 'support', 'Empower your school with chaotic energy');

SELECT 'Spells seeded successfully!' AS status;