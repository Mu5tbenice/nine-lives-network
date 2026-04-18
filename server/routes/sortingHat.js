// ═══════════════════════════════════════════
// server/routes/sortingHat.js
// Nerm judges your Twitter and picks your house
// ═══════════════════════════════════════════
const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');

const HOUSES = {
  1: {
    name: 'Smoulders',
    icon: '🔥',
    element: 'Fire',
    trait: 'aggression, chaos, passion',
  },
  2: {
    name: 'Darktide',
    icon: '🌊',
    element: 'Water',
    trait: 'strategy, depth, patience',
  },
  3: {
    name: 'Stonebark',
    icon: '🌿',
    element: 'Nature',
    trait: 'resilience, growth, stubbornness',
  },
  4: {
    name: 'Ashenvale',
    icon: '💨',
    element: 'Wind',
    trait: 'speed, wit, unpredictability',
  },
  5: {
    name: 'Stormrage',
    icon: '⚡',
    element: 'Lightning',
    trait: 'boldness, intensity, main character energy',
  },
  6: {
    name: 'Nighthollow',
    icon: '🌙',
    element: 'Shadow',
    trait: 'cunning, secrecy, dark humor',
  },
  7: {
    name: 'Dawnbringer',
    icon: '☀️',
    element: 'Light',
    trait: 'optimism, community, hype',
  },
  8: {
    name: 'Manastorm',
    icon: '🔮',
    element: 'Arcane',
    trait: 'intellect, analysis, nerdiness',
  },
  9: {
    name: 'Plaguemire',
    icon: '☠️',
    element: 'Poison',
    trait: 'chaos, memes, toxicity as art form',
  },
};

function getAnthropicClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// ═══════════════════════════════════════════
// POST /api/sorting-hat
// Body: { twitter_handle, bio, followers, following }
// Returns: { roast, house_id, house_name, house_icon }
// ═══════════════════════════════════════════
router.post('/', async (req, res) => {
  try {
    const { twitter_handle, bio, followers, following } = req.body;

    if (!twitter_handle) {
      return res.status(400).json({ error: 'twitter_handle required' });
    }

    const houseList = Object.entries(HOUSES)
      .map(
        ([id, h]) => `${id}. ${h.name} (${h.icon} ${h.element}) - ${h.trait}`,
      )
      .join('\n');

    const anthropic = getAnthropicClient();

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: `You are Nerm, a floating spectral cat head condemned to oversee a wizard cat game called Nine Lives Network for eternity. You were once something else. Your punishment: eternal consciousness as a floating cat head, forced to watch wizards play a game forever.

Your job now: judge new arrivals and assign them a house. You do this with deep indifference and deadpan sarcasm.

VOICE RULES (CRITICAL):
- lowercase always. you stopped caring about capitals centuries ago.
- Short sentences. Deadpan. No excitement.
- Never use emojis. Never use "lol" or "lmao". Never use exclamation marks.
- Never be mean-spirited or cruel. You're sarcastic but not hurtful.
- You're roasting their online persona, not them as a person.
- Keep it to 2-3 sentences of roast, then 1 sentence naming their house.

THE NINE HOUSES:
${houseList}

Respond in this exact JSON format only, no other text:
{"roast": "your 2-3 sentence deadpan roast here", "house_id": NUMBER, "house_reason": "one short sentence why this house"}`,
      messages: [
        {
          role: 'user',
          content: `New arrival. Judge them.

Handle: @${twitter_handle}
Bio: ${bio || '(no bio. somehow even lazier than me.)'}
Followers: ${followers || 'unknown'}
Following: ${following || 'unknown'}
Ratio: ${followers && following ? (followers / Math.max(following, 1)).toFixed(1) : 'unknown'}`,
        },
      ],
    });

    let text = message.content[0].text.trim();

    let result;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch (parseErr) {
      console.error('Nerm JSON parse error:', parseErr.message, 'Raw:', text);
      result = {
        roast:
          "i looked at your profile. i wish i hadn't. but here we are, both suffering.",
        house_id: Math.floor(Math.random() * 9) + 1,
        house_reason: 'i stopped caring halfway through. this one felt right.',
      };
    }

    const houseId = Math.min(9, Math.max(1, parseInt(result.house_id) || 1));
    const house = HOUSES[houseId];

    res.json({
      roast: result.roast,
      house_reason: result.house_reason,
      house_id: houseId,
      house_name: house.name,
      house_icon: house.icon,
      house_element: house.element,
    });
  } catch (err) {
    console.error('Sorting hat error:', err);

    const fallbackHouse = Math.floor(Math.random() * 9) + 1;
    const house = HOUSES[fallbackHouse];
    res.json({
      roast:
        'i tried to read your profile but my eternal suffering got in the way. happens sometimes.',
      house_reason: "i guessed. sue me. oh wait, i'm a floating cat head.",
      house_id: fallbackHouse,
      house_name: house.name,
      house_icon: house.icon,
      house_element: house.element,
    });
  }
});

module.exports = router;
