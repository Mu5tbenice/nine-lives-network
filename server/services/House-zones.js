/**
 * Nine Lives Network — Houses & Zones Data
 */

const houses = {
  1: { name: 'House Smoulders', short: 'Smoulders', element: 'fire', color: '#E03C31', logo: 'House-smoulders.png' },
  2: { name: 'House Darktide', short: 'Darktide', element: 'water', color: '#00B4D8', logo: 'House-darktide.png' },
  3: { name: 'House Stonebark', short: 'Stonebark', element: 'earth', color: '#5CB338', logo: 'House-stonebark.png' },
  4: { name: 'House Ashenvale', short: 'Ashenvale', element: 'air', color: '#B0C4DE', logo: 'House-Ashenvale.png' },
  5: { name: 'House Stormrage', short: 'Stormrage', element: 'lightning', color: '#FFC800', logo: 'House-stormrage.png' },
  6: { name: 'House Nighthollow', short: 'Nighthollow', element: 'shadow', color: '#7B2D8E', logo: 'House-nighthollow.png' },
  7: { name: 'House Dawnbringer', short: 'Dawnbringer', element: 'light', color: '#FF8C00', logo: 'House-dawnbringer.png' },
  8: { name: 'House Manastorm', short: 'Manastorm', element: 'arcane', color: '#5B8FE0', logo: 'House-manastorm.png' },
  9: { name: 'House Plaguemire', short: 'Plaguemire', element: 'chaos', color: '#E84393', logo: 'House-plaguemire.png' },
};

const zones = [
  { id: 1, name: 'Ember Peaks', type: 'home', house_id: 1 },
  { id: 2, name: 'Abyssal Shallows', type: 'home', house_id: 2 },
  { id: 3, name: 'The Roothold', type: 'home', house_id: 3 },
  { id: 4, name: 'Pale Canopy', type: 'home', house_id: 4 },
  { id: 5, name: 'Voltspire Ridge', type: 'home', house_id: 5 },
  { id: 6, name: 'The Hollows', type: 'home', house_id: 6 },
  { id: 7, name: 'Solhaven', type: 'home', house_id: 7 },
  { id: 8, name: 'The Conflux', type: 'home', house_id: 8 },
  { id: 9, name: 'Rotmire Bog', type: 'home', house_id: 9 },
  { id: 10, name: 'Crystal Crossroads', type: 'neutral' },
  { id: 11, name: 'Mystic Falls', type: 'neutral' },
  { id: 12, name: 'The Ancient Ruins', type: 'neutral' },
  { id: 13, name: 'Twilight Grove', type: 'neutral' },
  { id: 14, name: "Dragon's Rest", type: 'neutral' },
  { id: 15, name: 'Merchant Row', type: 'neutral' },
  { id: 16, name: 'The Undercroft', type: 'neutral' },
  { id: 17, name: 'Shattered Bridge', type: 'neutral' },
  { id: 18, name: 'The Siltmarsh', type: 'neutral' },
  { id: 19, name: 'Bonewood Grove', type: 'neutral' },
  { id: 20, name: 'Frostfang Pass', type: 'neutral' },
  { id: 21, name: 'The Brass Bazaar', type: 'neutral' },
  { id: 22, name: 'Starfall Crater', type: 'neutral' },
  { id: 23, name: 'The Bleached Flats', type: 'neutral' },
  { id: 24, name: 'Gallows Reach', type: 'neutral' },
  { id: 25, name: 'The Wailing Steppe', type: 'neutral' },
];

function getHouse(id) { return houses[id] || null; }
function getAllHouses() { return houses; }
function getAllZones() { return zones; }
function getNeutralZones() { return zones.filter(z => z.type === 'neutral'); }

module.exports = { houses, zones, getHouse, getAllHouses, getAllZones, getNeutralZones };
