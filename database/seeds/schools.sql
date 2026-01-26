-- =============================================
-- Nine Lives Network - Schools Seed Data
-- =============================================
-- Run this in Supabase SQL Editor after schema.sql
-- =============================================

INSERT INTO schools (name, element, primary_color, secondary_color) VALUES
  ('Ember Covenant', 'Fire', '#8B0000', '#FF4500'),
  ('Tidal Conclave', 'Water', '#006994', '#20B2AA'),
  ('Stone Covenant', 'Earth', '#8B4513', '#DAA520'),
  ('Zephyr Circle', 'Air', '#87CEEB', '#FFFFFF'),
  ('Storm Assembly', 'Lightning', '#FFD700', '#800080'),
  ('Umbral Syndicate', 'Shadow', '#4B0082', '#000000'),
  ('Radiant Order', 'Light', '#FFFFFF', '#FFD700'),
  ('Arcane Spire', 'Arcane', '#C0C0C0', '#8A2BE2'),
  ('WildCat Path', 'Chaos', '#FF1493', '#00FF00');

SELECT 'Schools seeded successfully!' AS status;