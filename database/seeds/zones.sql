-- =============================================
-- Nine Lives Network - Zones Seed Data
-- =============================================
-- Run this in Supabase SQL Editor after schools.sql
-- =============================================

-- Home zones (one per school)
INSERT INTO zones (name, description, zone_type, bonus_effect, school_id) VALUES
  ('Ember Peaks', 'Volcanic mountains where the Ember Covenant trains', 'home', '+10% offensive spell power for Fire school', 1),
  ('Tidal Depths', 'Underwater caverns of the Tidal Conclave', 'home', '+10% defensive spell power for Water school', 2),
  ('Stone Hollows', 'Ancient underground fortress of the Stone Covenant', 'home', '+10% support spell power for Earth school', 3),
  ('Zephyr Heights', 'Floating islands where the Zephyr Circle resides', 'home', '+10% mana regen for Air school', 4),
  ('Storm Citadel', 'Thunder-struck tower of the Storm Assembly', 'home', '+10% critical chance for Lightning school', 5),
  ('Umbral Void', 'Shadow realm of the Umbral Syndicate', 'home', '+10% stealth bonus for Shadow school', 6),
  ('Radiant Sanctum', 'Gleaming temple of the Radiant Order', 'home', '+10% healing power for Light school', 7),
  ('Arcane Nexus', 'Reality-bending library of the Arcane Spire', 'home', '+10% spell variety for Arcane school', 8),
  ('WildCat Wilds', 'Ever-shifting chaos lands of the WildCat Path', 'home', 'Random bonus each day for Chaos school', 9);

-- Neutral zones (contested territories)
INSERT INTO zones (name, description, zone_type, bonus_effect, school_id) VALUES
  ('Crystal Crossroads', 'Central trading hub where all paths meet', 'neutral', '+5 bonus points for daily winner', NULL),
  ('Mystic Falls', 'Magical waterfall with concentrated mana', 'neutral', '+1 bonus mana for daily winner', NULL),
  ('Ancient Ruins', 'Crumbling temples holding forgotten power', 'neutral', 'Unlock special spell for daily winner', NULL),
  ('Twilight Grove', 'Forest caught between day and night', 'neutral', '+10% to all spell types for daily winner', NULL),
  ('Dragon''s Rest', 'Legendary sleeping ground of ancient dragons', 'neutral', 'Double points for daily winner', NULL);

SELECT 'Zones seeded successfully!' AS status;