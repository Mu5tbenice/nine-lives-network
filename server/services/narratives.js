/**
 * Nine Lives Network — Narrative Engine
 * 
 * 25 Named Zones on the map
 * 40 Story Narratives (dealt onto zones like a deck of cards)
 * 
 * DESIGN: Stories are fantasy-first. References are Easter eggs.
 * Nerm's commentary is where the wink lives.
 * 40 stories at 3 bounties/day = ~13 days before repeat.
 * Each repeat lands on a different zone with different live data,
 * so it never feels the same twice.
 */

// ============================================
// HOUSE DATA
// ============================================
const houses = {
  1: { name: 'House Smoulders', short: 'Smoulders', element: 'fire', color: '#FF4500', logo: 'house-smoulders.png' },
  2: { name: 'House Darktide', short: 'Darktide', element: 'water', color: '#00BFFF', logo: 'house-darktide.png' },
  3: { name: 'House Ironbark', short: 'Ironbark', element: 'earth', color: '#8B4513', logo: 'house-ironbark.png' },
  4: { name: 'House Ashenvale', short: 'Ashenvale', element: 'air', color: '#98FB98', logo: 'house-ashenvale.png' },
  5: { name: 'House Stormrage', short: 'Stormrage', element: 'lightning', color: '#FFD700', logo: 'house-stormrage.png' },
  6: { name: 'House Nighthollow', short: 'Nighthollow', element: 'shadow', color: '#9932CC', logo: 'house-nighthollow.png' },
  7: { name: 'House Dawnbringer', short: 'Dawnbringer', element: 'light', color: '#FFFACD', logo: 'house-dawnbringer.png' },
  8: { name: 'House Manastorm', short: 'Manastorm', element: 'arcane', color: '#00FFFF', logo: 'house-manastorm.png' },
  9: { name: 'House Plaguemire', short: 'Plaguemire', element: 'chaos', color: '#FF1493', logo: 'house-plaguemire.png' },
};

// ============================================
// 25 ZONE NAMES (9 home + 16 neutral)
// ============================================
const zones = [
  // Home zones (one per house, cannot be targeted by bounty normally)
  { id: 1, name: 'Ember Peaks', type: 'home', house_id: 1 },
  { id: 2, name: 'Abyssal Shallows', type: 'home', house_id: 2 },
  { id: 3, name: 'The Roothold', type: 'home', house_id: 3 },
  { id: 4, name: 'Pale Canopy', type: 'home', house_id: 4 },
  { id: 5, name: 'Voltspire Ridge', type: 'home', house_id: 5 },
  { id: 6, name: 'The Hollows', type: 'home', house_id: 6 },
  { id: 7, name: 'Solhaven', type: 'home', house_id: 7 },
  { id: 8, name: 'The Conflux', type: 'home', house_id: 8 },
  { id: 9, name: 'Rotmire Bog', type: 'home', house_id: 9 },
  // Neutral contestable zones
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

// ============================================
// 40 NARRATIVES
// ============================================
const narratives = [

  // ===========================
  // CONSPIRACY & POLITICAL (1-10)
  // ===========================

  // --- 1. Twin towers / 9-11 ---
  {
    id: 'twin_spires',
    title: 'THE FALL OF THE TWIN SPIRES',
    theme: 'conspiracy',
    player_hook: 'The Spires held the largest arcane library in Avaloris. Recover scrolls from the rubble — the house that salvages the most earns rebuilding rights.',
    morning: {
      text: `Two ancient crystal spires collapsed at dawn. Both of them. Same morning. The Arcane Council says a single rogue fire spell brought them down — both reinforced towers, into their own foundations. The library vaults may still be intact beneath the dust.`,
      prompt: `You arrive at the ruins. Scrolls are scattered, rival houses are digging. What do you recover first?`
    },
    escalation_template: `The official report: one wizard, acting alone. Witnesses have been "relocated for their safety." But the rubble is full of salvageable knowledge and houses are fighting over every page.\n\n{top_replies}\n\nA third spire nearby has been cordoned off. The Council says it's unstable. It looks fine from here.\n\nDig deeper. The best scrolls are buried at the bottom.`,
    resolution_template: `Excavation complete. {winner} recovered the most and earned rebuilding rights. The official story is now carved into a memorial stone. Very large letters.\n\nThe investigation concluded before lunch.`,
    nerm_hooks: {
      morning: [
        "both spires. same morning. freefall speed. the report says fire. sure.",
        "the council investigated themselves. very thorough. very fast.",
        "the third spire is fine. stop looking at the third spire."
      ],
      escalation: [
        "relocated for their safety. what a lovely phrase.",
        "one wizard. acting alone. basic fire bolt. against reinforced crystal. naturally.",
        "i read the blueprints once. well. i saw them. they're gone now."
      ],
      resolution: [
        "investigation concluded before lunch. impressive when you already know the answer.",
        "the memorial is very large. the truth is very small.",
        "case closed. permanently. questions will not be taken."
      ]
    }
  },

  // --- 2. Epstein ---
  {
    id: 'chambers_keep',
    title: 'THE CHAMBERS KEEP INCIDENT',
    theme: 'conspiracy',
    player_hook: 'The prisoner had a list of names — powerful people who visited his island fortress. That list is hidden in the keep. Find it and your house controls the most dangerous secret in Avaloris.',
    morning: {
      text: `The most important prisoner in Avaloris was found dead in his cell. Both anti-magic wards failed simultaneously. Both guards fell asleep at the same hour. The surveillance crystals went dark for exactly eleven minutes. He had a list of names. The list is missing.`,
      prompt: `The list is somewhere in the keep. Three houses are already searching. What's your move?`
    },
    escalation_template: `Noble houses are suddenly very interested in "prison reform." Several have made generous donations to the guard captain. A torn page was found with two initials on it.\n\n{top_replies}\n\nA second prisoner has requested transfer to a more public cell. He says he keeps records too.\n\nThose names could reshape the realm. Keep looking.`,
    resolution_template: `The keep has been sealed by Council order. {winner} recovered the most intelligence before the doors closed. Official verdict: self-inflicted spell damage.\n\nThe second prisoner was transferred. Then un-transferred. Then the paperwork vanished.`,
    nerm_hooks: {
      morning: [
        "both guards asleep. both wards down. both crystals dark. remarkable coincidence.",
        "he was about to publish names. now he can't. these things happen.",
        "eleven dark minutes. just enough time for nothing to happen. officially."
      ],
      escalation: [
        "generous donations to the guard captain. for better pillows presumably.",
        "two initials on torn paper. someone is sweating tonight.",
        "a second prisoner wants witnesses around him. can't imagine why."
      ],
      resolution: [
        "self-inflicted. very determined. very flexible. apparently.",
        "the paperwork vanished. paperwork does that sometimes. around here.",
        "nothing happened at chambers keep. this is the official position. forever."
      ]
    }
  },

  // --- 3. Frogs / water contamination ---
  {
    id: 'veiled_cascade',
    title: 'THE VEILED CASCADE CONTAMINATION',
    theme: 'conspiracy',
    player_hook: 'The contaminated water is mutating wildlife into something powerful and harvestable. Collect specimens before the Alchemist Guild seals the area — rare ingredients mean rare potions.',
    morning: {
      text: `Something is wrong with the water at the cascade. The frogs have changed — bigger, shimmering with arcane energy. One was spotted casting a minor cantrip. The Alchemist's Guild calls it "naturally occurring mineral enrichment." Residents say the water tastes purple.`,
      prompt: `You drank the water. Or you're studying the frogs. Or both. What's happening to you?`
    },
    escalation_template: `The Guild released a statement: "The frogs are fine. Stop looking at the frogs." Meanwhile three new frog species have been documented and one formed what appears to be a small governing body.\n\n{top_replies}\n\nThe water glows at night now. The Guild says this is seasonal. It has never happened before.\n\nWhat do the frogs know?`,
    resolution_template: `The frogs remain changed. The water still glows. {winner} collected the most specimens before the Guild sealed the area for "routine maintenance."\n\nThe cascade has been reclassified from "contaminated" to "enhanced."`,
    nerm_hooks: {
      morning: [
        "they're putting something in the cascade. have you looked at the frogs lately.",
        "the water tastes purple. that's not a flavour. and yet.",
        "one frog cast a spell today. we're not talking about it apparently."
      ],
      escalation: [
        "stop looking at the frogs, says the guild. i cannot look away.",
        "the frogs formed a council. they're more organised than most houses.",
        "seasonal glowing water. of course. happens every year. definitely."
      ],
      resolution: [
        "enhanced water. previously contaminated. rebranding solves everything.",
        "the frogs are fine. the frogs have always been like this. you're remembering wrong.",
        "i watched a frog open a door today. nobody else seems concerned."
      ]
    }
  },

  // --- 4. Bohemian Grove ---
  {
    id: 'bonewood_gathering',
    title: 'THE GATHERING AT BONEWOOD GROVE',
    theme: 'conspiracy',
    player_hook: `The most powerful wizards meet here in secret. Spy on the gathering and your house learns what they're planning for the next season — information that's worth more than gold.`,
    morning: {
      text: `Every year the most powerful wizards in Avaloris gather at Bonewood Grove. Robes. Rituals. An enormous stone owl. They say it's just networking. Nobody networks in front of a forty-foot owl while chanting in unison.`,
      prompt: `You've snuck past the wards. What are they actually doing in there?`
    },
    escalation_template: `A leaked scroll shows the seating chart. Every Archmage. Every Guild Master. Cabin assignments named after forest animals. An attendee was spotted leaving early, looking disturbed.\n\n{top_replies}\n\nHe says it was "just a retreat" and "the owl is decorative." The owl's eyes glow at night. Decoratively.\n\nWhat are they planning?`,
    resolution_template: `The gathering ended. Attendees returned to their posts, refreshed and definitely not coordinating anything. {winner} uncovered the most about the proceedings.\n\nThe owl remains. It always remains.`,
    nerm_hooks: {
      morning: [
        "a forty-foot owl. for networking. standard professional equipment.",
        "they say it's meditation. ignore the chanting.",
        "what happens in the grove stays in the grove. by magical enforcement."
      ],
      escalation: [
        "the owl is decorative. the glowing eyes are decorative. everything is decorative.",
        "cabin assignments: bear, owl, raccoon. perfectly normal retreat.",
        "he said it was just a retreat. he hasn't slept since he got back."
      ],
      resolution: [
        "they're not coordinating. they just independently agree on everything.",
        "the owl remains. it has always remained. it will always remain.",
        "just networking. in robes. around an owl. at midnight. normal."
      ]
    }
  },

  // --- 5. JFK / grassy knoll ---
  {
    id: 'grassy_overlook',
    title: 'THE PROCESSION AT GRASSY OVERLOOK',
    theme: 'conspiracy',
    player_hook: 'The Archmagus was struck down during a public procession. His personal library is now unguarded — rare spellbooks are being claimed by whoever gets there first.',
    morning: {
      text: `The beloved Archmagus was struck by a spell during a public procession through the lower quarter. The Council says a lone wizard fired from a tower window. Witnesses swear the spell came from behind a grassy overlook on the opposite side. The tower wizard was arrested, then killed before trial.`,
      prompt: `You were in the crowd. What did you see? And more importantly — his library is unguarded. What do you claim?`
    },
    escalation_template: `A crystal recording was found but seventeen seconds are missing. The arrested wizard's connections to three noble houses are being quietly buried. Meanwhile the Archmagus's library is being raided.\n\n{top_replies}\n\nA bystander found a second spell trajectory that doesn't match the tower angle. The Council is not interested.\n\nGrab what you can from the library. Knowledge is power.`,
    resolution_template: `The library has been picked clean. {winner} claimed the most valuable tomes. The official story remains: one wizard, one tower, one spell.\n\nThe seventeen missing seconds will never be recovered. The overlook has been paved over.`,
    nerm_hooks: {
      morning: [
        "nice view from the overlook. good sightlines. just an observation.",
        "one wizard. from a tower. through wind. at that distance. moving target. sure.",
        "the arrested wizard was killed before trial. tidy."
      ],
      escalation: [
        "seventeen seconds missing. just the interesting seventeen seconds.",
        "the trajectory doesn't match. the council doesn't care. efficiency.",
        "three noble houses connected. three noble houses not mentioned in the report."
      ],
      resolution: [
        "one wizard. one tower. one spell. the simplest answer is the official one.",
        "the overlook has been paved. can't investigate what's under concrete.",
        "back and to the left. just describing the wind pattern. nothing else."
      ]
    }
  },

  // --- 6. Area 51 ---
  {
    id: 'restricted_mesa',
    title: 'THE RESTRICTED MESA',
    theme: 'conspiracy',
    player_hook: `The Council has sealed the mesa for decades. Tonight the wards flickered. Whatever they're hiding in there could be the most powerful weapon — or creature — in Avaloris. First house through the breach claims it.`,
    morning: {
      text: `There is a mesa in the desert that has been warded by the Council for as long as anyone remembers. No one goes in. Nothing comes out. Except last night the wards flickered and something flew over the nearest village — silent, fast, no wings. The Council says it was a weather anomaly.`,
      prompt: `The wards are still weak. You could slip through. What do you find inside?`
    },
    escalation_template: `Several wizards breached the outer ward. They found empty corridors, locked vaults, and one room containing something under a cloth that was humming. A guard told them to leave. They were given tea first. Very calming tea.\n\n{top_replies}\n\nNone of the wizards can clearly remember what they saw. The tea was excellent though.\n\nThe wards are flickering again tonight. Try again?`,
    resolution_template: `The wards are back up. Whatever was inside remains inside. {winner} gathered the most intelligence during the breach.\n\nThe Council has tripled the guard. The something under the cloth is still humming.`,
    nerm_hooks: {
      morning: [
        "weather anomaly. with no wings. that was completely silent. sure.",
        "the mesa has been sealed for decades. nothing suspicious about permanent secrecy.",
        "i've flown over it once. i don't remember what i saw. the tea was lovely though."
      ],
      escalation: [
        "calming tea. so calming they can't remember anything. wonderful hospitality.",
        "something under a cloth. humming. they were told not to lift the cloth. so they didn't. cowards.",
        "the guards were polite. that's how you know it's serious."
      ],
      resolution: [
        "the wards are back up. whatever is in there stays in there. for now.",
        "tripled the guard. must be protecting something very boring and not at all world-ending.",
        "i know what's under the cloth. no i don't. forget i mentioned it."
      ]
    }
  },

  // --- 7. Moon landing ---
  {
    id: 'silver_summit',
    title: 'THE FIRST ASCENT OF SILVER SUMMIT',
    theme: 'conspiracy',
    player_hook: 'The summit holds an ancient observatory with star-maps that reveal hidden ley lines across Avaloris. Controlling the observatory means controlling the most accurate map of magical energy in the realm.',
    morning: {
      text: `Two wizards from House Dawnbringer planted their banner on Silver Summit yesterday — the highest point in Avaloris. The whole realm watched through broadcast crystals. Except some wizards are pointing out that the banner fluttered in a place where there should be no wind. And the shadows seem wrong.`,
      prompt: `Did they really reach the summit? And more importantly — the observatory up there has star-maps. Who gets them?`
    },
    escalation_template: `A Nighthollow scholar released a twelve-scroll paper on "shadow inconsistencies." Dawnbringer is furious. Meanwhile houses are racing to the summit to see for themselves — and claim the observatory.\n\n{top_replies}\n\nOne of the original climbers punched a doubter in a tavern last night. "I was there," he said. His knuckles made the argument.\n\nThe observatory awaits. Climb.`,
    resolution_template: `Multiple houses reached the summit. The banner is real. The observatory is real. {winner} claimed the most star-map data. The shadow debate continues in taverns.\n\nThe climber is still punching doubters. His schedule is full.`,
    nerm_hooks: {
      morning: [
        "the banner fluttered. where there's no wind. interesting fabric.",
        "the shadows are wrong, they say. i don't cast shadows so i can't relate.",
        "they say they reached the top. the top says nothing."
      ],
      escalation: [
        "a twelve-scroll paper on shadows. this wizard needs a hobby. or fewer hobbies.",
        "he punched the doubter. the most convincing argument in academic history.",
        "i believe they climbed it. i also believe the shadows are weird. both can be true."
      ],
      resolution: [
        "the summit is real. the banner is real. the argument will outlive us all.",
        "he's still punching doubters. appointment only now.",
        "the observatory maps are worth more than the argument. focus."
      ]
    }
  },

  // --- 8. Flat earth ---
  {
    id: 'worlds_edge',
    title: 'THE EXPEDITION TO WORLD\'S EDGE',
    theme: 'conspiracy',
    player_hook: 'A wizard claims Avaloris has an edge — and there\'s treasure falling off it. He\'s hiring expedition members. Even if he\'s wrong, the uncharted lands he\'s crossing are full of unclaimed resources.',
    morning: {
      text: `A wizard from House Ironbark has gathered a following. He says Avaloris is flat and he can prove it. He's organised an expedition to "the edge." The Academy says there is no edge. He says the Academy is lying. He has charts. The charts are very confident.`,
      prompt: `The expedition is leaving at noon. Do you join? Mock from a distance? Or quietly follow to see what they find?`
    },
    escalation_template: `The expedition has been walking for six hours. They haven't found an edge. The wizard says they need to walk further. His followers are starting to blister.\n\n{top_replies}\n\nA cartographer following at a safe distance has been documenting new terrain features nobody has mapped before. Accidentally useful expedition.\n\nAre they close to the edge or close to giving up?`,
    resolution_template: `No edge was found. The wizard says it moved. His followers have reduced to three very committed individuals and one dog. {winner} profited most from the newly mapped territory.\n\nThe expedition continues tomorrow. It will always continue tomorrow.`,
    nerm_hooks: {
      morning: [
        "the charts are very confident. the charts have never been to the edge either.",
        "he says the academy is lying. the academy says he's an idiot. stalemate.",
        "do your own research, he tells people. his research is a chart he drew himself."
      ],
      escalation: [
        "six hours. no edge. the edge must have moved. edges do that.",
        "accidentally useful expedition. the best kind.",
        "the blisters are part of the journey. apparently."
      ],
      resolution: [
        "no edge. but new territory mapped. accidental productivity.",
        "the edge moved. it always moves. very evasive edge.",
        "three followers and a dog. the dog seems uncertain."
      ]
    }
  },

  // --- 9. Trump / border wall ---
  {
    id: 'the_great_wall',
    title: 'THE GREAT WALL OF UMBRA',
    theme: 'conspiracy',
    player_hook: 'The wall is blocking a trade route. Whoever controls the gate controls tariffs on everything moving through. Massive gold to be earned — or stolen.',
    morning: {
      text: `House Nighthollow is building a wall along the northern border. A big wall. They say it will be beautiful. The best wall Avaloris has ever seen. And they're going to make House Dawnbringer pay for it. Dawnbringer has declined. The wall just got ten feet higher.`,
      prompt: `Are you building the wall, paying for the wall, or digging under it?`
    },
    escalation_template: `The wall is forty feet of shadow crystal. Impressive, frankly. Many people are saying it's the best wall. Dawnbringer has responded by building a ladder.\n\n{top_replies}\n\nNighthollow added ten more feet. Dawnbringer built a taller ladder. This could continue for some time.\n\nPick a side. Or bring a shovel.`,
    resolution_template: `The wall stands. Or fell. Depends who you ask. {winner} had the most impact on the outcome.\n\nNighthollow says it's a success. Dawnbringer says what wall. Nobody mentions the tunnel.`,
    nerm_hooks: {
      morning: [
        "beautiful wall. the best wall. many wizards are saying this.",
        "they'll make dawnbringer pay. dawnbringer has declined. the wall continues regardless.",
        "the wall just got ten feet higher. it does that."
      ],
      escalation: [
        "tremendous wall. everybody agrees. some disagree but they're wrong.",
        "the ladder defeats the purpose. but nobody asked me.",
        "i've seen walls. this is definitely one of them."
      ],
      resolution: [
        "the wall is complete. or not. alternative facts.",
        "nobody mentions the tunnel. there is no tunnel. stop asking.",
        "the wall worked. except for the ladder. and the tunnel. but otherwise, perfect."
      ]
    }
  },

  // --- 10. COVID / lockdowns ---
  {
    id: 'two_week_quarantine',
    title: 'THE TWO WEEKS QUARANTINE',
    theme: 'conspiracy',
    player_hook: 'The quarantine zone is rich with abandoned supplies and unclaimed territory. Every house that was locked out left resources behind. Loot the quarantine zone before the lockdown lifts and everyone comes back.',
    morning: {
      text: `A mysterious plague has emerged from a source that is definitely not the Alchemist's Guild laboratory. The Council has announced a two-week lockdown of the zone. Just two weeks. To flatten the curse. All wizards must cast from their towers.`,
      prompt: `It's been two weeks. Then four. Then eight. What day is it? Does time still work?`
    },
    escalation_template: `Week six of the two-week lockdown. Several wizards have taken up baking enchanted bread. One hasn't worn proper robes in a month. The Council recommends standing on your balcony banging pots at sundown.\n\n{top_replies}\n\nThe Guild laboratory has been quietly demolished. Unrelated.\n\nThe quarantine zone is full of abandoned gear. Worth the risk?`,
    resolution_template: `Lockdown lifted. Officially it was always going to be this long. {winner} looted the most during quarantine.\n\nThe plague came from a bat. Or a market. Or the lab. The story changed three times. The lab is gone. We're not doing this again. Probably.`,
    nerm_hooks: {
      morning: [
        "two weeks. they said two weeks. i'm counting.",
        "definitely natural. not from the laboratory. ignore the laboratory.",
        "flatten the curse. two weeks. i've heard this before."
      ],
      escalation: [
        "week six of two weeks. time is a suggestion.",
        "the lab was demolished. for renovations. completely unrelated.",
        "banging pots at sundown. this helps. somehow."
      ],
      resolution: [
        "the story changed three times. all three are official.",
        "it came from a bat. or a lab. or a bat in a lab. stop asking.",
        "we're all in this together. some of us in nicer towers than others."
      ]
    }
  },

  // ===========================
  // CRYPTO & FINANCE (11-20)
  // ===========================

  // --- 11. FTX / exchange collapse ---
  {
    id: 'eastern_exchange',
    title: 'THE EASTERN EXCHANGE COLLAPSE',
    theme: 'crypto',
    player_hook: 'The Exchange vaults still have assets inside — but the building is unstable. First house to breach the vault reclaims the most. Dangerous but lucrative.',
    morning: {
      text: `The Eastern Crystal Exchange collapsed overnight. Millions in enchanted gems — gone. The Exchange Master insists the vaults are secure. But merchants who tried to withdraw found coloured glass where their crystals should be. The Exchange Master was last seen boarding a flying carpet heading east.`,
      prompt: `Your house had assets in those vaults. Do you chase the carpet, breach the vault, or cut your losses?`
    },
    escalation_template: `The Exchange Master has been spotted in the Palman Isles — no extradition treaties. He sent a crystal message: "Your assets are safe. Trust the process." The Council has frozen remaining assets. For your protection.\n\n{top_replies}\n\nHis apprentice is launching a new exchange next week. Totally different.\n\nThe vault doors are weakening. Who gets there first?`,
    resolution_template: `The Exchange Master is "cooperating from abroad." The crystals are gone. {winner} recovered the most from the wreckage.\n\nThe new exchange opens Tuesday. Same building. Different sign.`,
    nerm_hooks: {
      morning: [
        "your crystals are safe. that's why they're coloured glass now. safety measure.",
        "he's on a flying carpet. heading east. with your money. but trust the process.",
        "the vaults are secure. the crystals are gone. both statements are true. somehow."
      ],
      escalation: [
        "cooperating from a beach. with a drink. very brave of him.",
        "the new exchange is totally different. same staff. same building. different name. different.",
        "trust the process. the process is a flying carpet to a beach."
      ],
      resolution: [
        "few understood. fewer got their crystals back.",
        "same building. different sign. this time it's different. it's always different.",
        "he's cooperating. from a beach. at his own pace. with a cocktail."
      ]
    }
  },

  // --- 12. Rug pull ---
  {
    id: 'merchant_vanish',
    title: 'THE VANISHING MERCHANT OF BRASS BAZAAR',
    theme: 'crypto',
    player_hook: 'The merchant abandoned his entire stock when he fled. Enchanted goods are scattered across his shop — unclaimed. His loss is your gain, but other houses are already looting.',
    morning: {
      text: `A merchant set up shop three days ago selling enchanted cloaks at prices too good to question. "Early supporters get the best cloaks," he promised. The shop was packed. This morning the shop is empty. The cloaks have turned to burlap. The merchant is gone. His sign now reads "thank you for your liquidity."`,
      prompt: `The burlap itches. Your gold is gone. But the merchant left his back room unlocked. What's inside?`
    },
    escalation_template: `The back room contained maps, ledgers, and the merchant's next three planned stops. He's done this before. In every town he used a different name. Some wizards want justice. Others want to beat him to the next town.\n\n{top_replies}\n\nA wizard who lost everything is standing outside the empty shop holding a burlap cloak. He says he's "still early."\n\nChase the merchant or loot what's left?`,
    resolution_template: `The merchant is three towns ahead. {winner} recovered the most from the shop and the ledgers.\n\nA new merchant has appeared selling enchanted boots. "This time is different," he says. The boots look very nice.`,
    nerm_hooks: {
      morning: [
        "thank you for your liquidity. the most honest sign in any marketplace.",
        "the cloaks turned to burlap. some call this a rug pull. others call it tuesday.",
        "early supporters got the best cloaks. the best burlap cloaks."
      ],
      escalation: [
        "he's still early, says the wizard holding burlap. conviction or delusion. same energy.",
        "three towns. three names. same pitch. people keep buying.",
        "the ledger shows he's done this six times. each time they said this time is different."
      ],
      resolution: [
        "new merchant. new boots. this time is different. the boots are the same.",
        "the sign said it all. they just didn't read the sign.",
        "thank you for your liquidity. the market provides."
      ]
    }
  },

  // --- 13. Whale wallet movements ---
  {
    id: 'deep_leviathan',
    title: 'THE LEVIATHAN OF THE DEEP VAULT',
    theme: 'crypto',
    player_hook: 'When the leviathan surfaces, the markets move. Position your house at the cove and you can ride the wave — or be crushed by it. Timing is everything.',
    morning: {
      text: `Something massive stirred in the deep vault beneath the harbour last night. A crystal leviathan — ancient, vast, and holding more wealth than most kingdoms. When it shifts left, markets crash. When it shifts right, they soar. It's surfacing. Every merchant in the realm is watching the water.`,
      prompt: `The water is churning. The leviathan is rising. Do you position for the wave or get to high ground?`
    },
    escalation_template: `The leviathan moved. Markets are swinging wildly. Small traders are panicking. Larger traders are buying the panic. The leviathan does not care about any of them.\n\n{top_replies}\n\nA wizard tried to communicate with it. The leviathan looked at him. Then it moved forty million crystals to a new vault. "Probably nothing," says everyone.\n\nRide the wake or drown in it?`,
    resolution_template: `The leviathan submerged. Markets are settling. {winner} read the movements best and positioned their house perfectly.\n\nThe vault tracker shows another shift scheduled for next week. Probably nothing.`,
    nerm_hooks: {
      morning: [
        "the leviathan doesn't care about you. it has never cared about you.",
        "when it moves, you move. or you get crushed. simple.",
        "the water is churning. this is either opportunity or destruction. often both."
      ],
      escalation: [
        "forty million crystals moved. probably nothing. it's never nothing.",
        "small traders panic. big traders buy. the leviathan eats both.",
        "he tried talking to it. it looked at him. that's the most attention it's ever given anyone."
      ],
      resolution: [
        "the leviathan left. everyone pretends to relax. nobody relaxes.",
        "probably nothing. famous last words. on every gravestone in the merchant quarter.",
        "it'll be back. it's always back. bring a bigger boat."
      ]
    }
  },

  // --- 14. Ponzi / Madoff ---
  {
    id: 'golden_promise',
    title: 'THE GOLDEN PROMISE GUILD',
    theme: 'crypto',
    player_hook: 'The Guild\'s treasury was fake — but the building is real, and its vault mechanisms are among the finest in Avaloris. Claim the building for your house and repurpose it.',
    morning: {
      text: `The Golden Promise Guild offered guaranteed returns for a decade. Thirty percent a year. Every year. New members paid in, old members got paid. Everyone was happy. Until yesterday, when someone asked to see the actual vault. There is no vault. There was never a vault. The returns were paid using new members' deposits.`,
      prompt: `The Guild Master is barricaded in his office. Members are outside with torches. What's your role in this?`
    },
    escalation_template: `The Guild Master emerged briefly to say the funds are "restructuring." He then retreated behind a reinforced door. Members have formed a queue to be angry in an orderly fashion.\n\n{top_replies}\n\nA ledger was found showing the Guild Master's personal spending: three sky-ships, a private island, and an enchanted portrait of himself. With a gold frame.\n\nThe building itself is worth claiming. Storm it or wait him out?`,
    resolution_template: `The Guild Master was dragged out by his own guards. {winner} claimed the building and its (functional, if empty) vault system.\n\nHe's been sentenced to explain his business model in public. The crowd found this punishment sufficient.`,
    nerm_hooks: {
      morning: [
        "thirty percent returns. every year. for a decade. no questions asked. none. ever.",
        "there is no vault. there was never a vault. the returns were vibes.",
        "new money pays old money. old money says everything's fine. beautiful system."
      ],
      escalation: [
        "restructuring. wonderful word. covers everything from delays to fraud.",
        "three sky-ships and an enchanted portrait. of himself. with a gold frame. modest.",
        "they're queuing to be angry. even in collapse, civility."
      ],
      resolution: [
        "explain your business model in public. crueller than any dungeon.",
        "the vault works. it's just empty. like his promises.",
        "someone is already starting a new guild. guaranteed returns. thirty percent."
      ]
    }
  },

  // --- 15. Jihan Wu "your favourite miner's favourite miner is a scam" ---
  {
    id: 'forge_masters_decree',
    title: 'THE FORGE MASTER\'S DECREE',
    theme: 'crypto',
    player_hook: 'The schism fractured the Mining Guild. Both factions left forges unguarded. Claim forges for your house — whoever controls crystal production controls the economy.',
    morning: {
      text: `The most powerful Forge Master in Avaloris broke his silence today. One message on a sending stone: "Your favourite Forge Master's most profitable technique is a fraud." No context. No follow-up. He's been mining spell crystals quietly for years. Now he's chosen violence. Three rival mining guilds have declared war.`,
      prompt: `The Forge Master has spoken. The guilds are splitting. Whose side are you on, and which forge do you claim?`
    },
    escalation_template: `The Forge Master posted again. One word: "Patience." His operation now produces more crystals than all rivals combined. A guild leader responded with a forty-seven scroll manifesto. Nobody read it.\n\n{top_replies}\n\nSomeone forked the mining technique. There are now two versions. Both sides claim theirs is the original.\n\nThe forges are unmanned during the chaos. Claim them.`,
    resolution_template: `The hash wars ended quietly. {winner} claimed the most forges during the confusion. The Forge Master returned to silence. The manifesto remains unread.\n\nBoth forks exist. Both claim legitimacy. This will never be resolved.`,
    nerm_hooks: {
      morning: [
        "he speaks once a year. this year he chose violence.",
        "your favourite forge master is a fraud. no context. no follow-up. legendary.",
        "patience, he said. then silence. the most powerful technique of all."
      ],
      escalation: [
        "forty-seven scrolls. nobody read them. incredible effort regardless.",
        "they forked the technique. now there are two. both claim to be real. neither is.",
        "patience. one word. and then silence. absolute power move."
      ],
      resolution: [
        "the forge master went silent. he'll be back. next year. maybe.",
        "both forks are the real one. somehow.",
        "few understand. fewer care. the crystals don't lie though."
      ]
    }
  },

  // --- 16. Governance drama / DAO vote ---
  {
    id: 'council_vote',
    title: 'THE DISPUTED COUNCIL VOTE',
    theme: 'crypto',
    player_hook: 'The vote determines trade tariffs for the next season. Whichever house stuffs the most ballots controls the economy. Democracy in action.',
    morning: {
      text: `The Council called a realm-wide vote on new trade regulations. Every citizen gets one vote. Except someone bought six thousand votes through shell guilds. And someone else proposed changing the voting rules mid-vote. The ballot box is enchanted to be transparent. This has made everything worse.`,
      prompt: `The vote is rigged, the rules are changing, and the ballot box shows everything. How do you play this?`
    },
    escalation_template: `A wizard proposed voting on whether to continue the vote. This passed. Then someone proposed voting on that vote. We are now three votes deep.\n\n{top_replies}\n\nThe original question has been forgotten. A Nighthollow delegate has filibustered for two hours by reading ingredients from a potion recipe.\n\nThe ballot box is overflowing. Does your vote even matter?`,
    resolution_template: `A decision was reached. Nobody agrees on what it was. {winner} navigated the chaos most effectively and secured favourable terms.\n\nThe next vote is scheduled for tomorrow. It's about whether to have fewer votes.`,
    nerm_hooks: {
      morning: [
        "transparent ballot box. now everyone can see the corruption in real time. progress.",
        "six thousand votes through shell guilds. this is called participation.",
        "changing the rules mid-vote. bold. also illegal. but bold."
      ],
      escalation: [
        "voting on whether to vote. democracy has peaked.",
        "a filibuster using potion ingredients. two hours. he's still going.",
        "three votes deep. nobody remembers the original question."
      ],
      resolution: [
        "a decision was reached. what decision. nobody knows. but it was reached.",
        "fewer votes, they voted. the irony is not lost on me. it is lost on them.",
        "governance. where good ideas go to die in committee."
      ]
    }
  },

  // --- 17. Bear market / depression arc ---
  {
    id: 'endless_winter',
    title: 'THE ENDLESS WINTER AT FROSTFANG',
    theme: 'crypto',
    player_hook: 'The cold has frozen trade routes, trapping valuable cargo in ice. Whoever breaks through first claims the frozen shipments. Build or burn — just get through.',
    morning: {
      text: `Frostfang Pass has been frozen for three seasons now. Merchants who were certain spring was coming have run out of supplies. The optimists are building shelters. The pessimists left months ago. One wizard sits by a dead fire holding a chart that only goes up. The chart is frozen solid.`,
      prompt: `The pass is blocked with ice and frozen cargo. Do you build, burn, or wait for spring?`
    },
    escalation_template: `A wizard announced spring is coming. He's announced this every month for a year. A few believe him. Most have started eating their emergency rations. One wizard is writing poetry about suffering.\n\n{top_replies}\n\nThe frozen cargo is starting to crack — whether from thawing or pressure, nobody's sure. First through the ice claims it.\n\nIs this the thaw, or another false spring?`,
    resolution_template: `A crack in the ice. Might be spring. Might be wishful thinking. {winner} broke through first and claimed the frozen shipments.\n\nThe wizard with the chart has updated it. It still only goes up. The line is just lower than before.`,
    nerm_hooks: {
      morning: [
        "the chart only goes up. it's frozen. it can't go anywhere. metaphor.",
        "three seasons of winter. spring is always next month. always.",
        "the optimists are building. the pessimists left. the realists are eating boot leather."
      ],
      escalation: [
        "he said spring is coming. again. monthly tradition at this point.",
        "the poetry about suffering is actually quite good. silver lining.",
        "false spring. the cruelest season. because it's not a season."
      ],
      resolution: [
        "the chart was updated. still goes up. from a lower starting point. technically correct.",
        "spring might be here. or not. we've been hurt before.",
        "the ice cracked. could be thawing. could be collapsing. both start the same way."
      ]
    }
  },

  // --- 18. "Number go up" / laser eyes cult ---
  {
    id: 'temple_of_the_green_flame',
    title: 'THE TEMPLE OF THE GREEN FLAME',
    theme: 'crypto',
    player_hook: 'The temple amplifies enchantments cast near it. While the flame burns green, all points in this zone are doubled. But no one knows when it switches.',
    morning: {
      text: `A cult has formed around a single enchanted flame that changes colour. When it burns green, the devotees celebrate. When it burns red, they say "temporary." They've been staring at this flame for months. They've given up their possessions. Their eyes glow slightly. They insist this is normal.`,
      prompt: `The flame is green right now. The doubled points are real. But the devotees are unsettling. Do you join, exploit, or observe?`
    },
    escalation_template: `The flame flickered red for four seconds. Three devotees fainted. The high priest said "buy the dip" — which means nothing in context but everyone nodded.\n\n{top_replies}\n\nA devotee with glowing eyes approached a sceptic and whispered: "Have fun staying in darkness." The sceptic is now considering joining.\n\nThe flame is green again. For now.`,
    resolution_template: `The flame held green. This time. {winner} earned the most during the doubled-point window.\n\nThe devotees are recruiting. Their eyes glow brighter. They say the flame will burn green forever. The flame has made no such promise.`,
    nerm_hooks: {
      morning: [
        "they stare at the flame. the flame doesn't stare back. they don't mind.",
        "their eyes glow. they say it's normal. glowing eyes are not normal.",
        "the flame changes colour. they've built a religion around it. we've all done worse."
      ],
      escalation: [
        "buy the dip. he said this about a flame. in a temple. and they nodded.",
        "have fun staying in darkness. whispered with glowing eyes. terrifying and effective.",
        "it flickered red for four seconds. three fainted. conviction is a spectrum."
      ],
      resolution: [
        "the flame held. their faith is rewarded. this time.",
        "glowing eyes. growing congregation. the flame makes no promises.",
        "they're recruiting. join them. or don't. but they know something. maybe."
      ]
    }
  },

  // ===========================
  // MOVIES & TV (19-30)
  // ===========================

  // --- 19. Pulp Fiction ---
  {
    id: 'the_briefcase',
    title: 'THE GLOWING BRIEFCASE',
    theme: 'movie',
    player_hook: 'The briefcase contains something powerful enough that two houses sent enforcers for it. Whoever holds it at day\'s end controls a weapon — or a treasure — nobody fully understands.',
    morning: {
      text: `Two enforcers from House Nighthollow walked into a tavern to retrieve a briefcase. A glowing briefcase. Nobody knows what's inside. The enforcers are unexpectedly philosophical about their work. One won't stop debating sandwich nomenclature across the eastern realms.`,
      prompt: `You're in the tavern. The briefcase is on the table, glowing. The enforcers are distracted. What's your play?`
    },
    escalation_template: `The briefcase has changed hands four times. One enforcer accidentally discharged a spell in the back of a wagon. A very calm specialist has been called to clean up. He mostly complains about his morning being ruined.\n\n{top_replies}\n\nThe briefcase is still glowing. The sandwich debate continues. Someone has drawn a diagram of what they think is inside.\n\nWho walks out with it?`,
    resolution_template: `The briefcase was returned to its owner. What's inside? Nobody knows. {winner} held it longest and earned the associated points.\n\nThe enforcers moved on. They're still arguing about sandwiches.`,
    nerm_hooks: {
      morning: [
        "what's in the briefcase. don't ask what's in the briefcase.",
        "they call it a royale with cheese in the eastern realms. he won't stop talking about it.",
        "two philosophers with swords walked into a tavern. this won't end cleanly."
      ],
      escalation: [
        "the wagon incident was... memorable. the specialist is handling it. he has opinions about his schedule.",
        "i've seen what's in the briefcase. no i haven't. forget i mentioned it.",
        "say 'what' again. he dares you."
      ],
      resolution: [
        "the briefcase is returned. the glow continues. answers do not.",
        "the path of the righteous wizard is beset on all sides. apparently.",
        "they walked away. cool wizards don't look back. or explain sandwiches."
      ]
    }
  },

  // --- 20. The Big Lebowski ---
  {
    id: 'the_rug',
    title: 'THE STOLEN RUG OF BINDING',
    theme: 'movie',
    player_hook: 'The enchanted rug bound the tower\'s magic together. Without it, the tower is destabilising and rare spell components are spilling from the shelves. Grab them before the tower collapses.',
    morning: {
      text: `Someone defaced an enchanted rug. Not just any rug — the Rug of Binding, which held an entire wizard tower's magic together. The owner, a remarkably relaxed wizard known only as "The Dude," wants it replaced. A case of mistaken identity has spiralled into nihilist mercenaries, a severed toe, and a possibly-enchanted marmot.`,
      prompt: `The Dude needs help. Or doesn't. He's pretty relaxed about it either way. The tower is destabilising. What do you grab before it falls?`
    },
    escalation_template: `The nihilists are threatening to "destroy ze remaining furnishings" unless demands are met. Their demands are unclear. One insists "we believe in nothing."\n\n{top_replies}\n\nThe Dude has been spotted at the Mystic Falls, bowling. He seems unconcerned. His associate is extremely agitated about "drawing a line in the sand."\n\nThe tower is creaking. Loot it or save it?`,
    resolution_template: `The rug was not recovered. The tower lost three floors. {winner} salvaged the most before collapse.\n\nThe nihilists were defeated by a marmot. The Dude abides.`,
    nerm_hooks: {
      morning: [
        "the rug really tied the room together. allegedly.",
        "nihilist mercenaries. they believe in nothing. i relate to this on several levels.",
        "that's just like, your opinion, wizard."
      ],
      escalation: [
        "am i the only one here who follows the rules of this realm.",
        "the dude abides. i also abide. not by choice.",
        "they believe in nothing. at least shadow magic is an ethos."
      ],
      resolution: [
        "the rug is gone. the dude abides. the tower does not.",
        "sometimes you eat the bear. sometimes the bear eats you.",
        "strikes and gutters. ups and downs. nothing changes."
      ]
    }
  },

  // --- 21. Gladiator ---
  {
    id: 'the_arena',
    title: 'THE ARENA OF THE FALLEN GENERAL',
    theme: 'movie',
    player_hook: 'The arena is offering triple points to anyone who fights. The Emperor has opened the vaults as prize money. Glory and gold — if you survive the day.',
    morning: {
      text: `A former general, stripped of rank and sold into the fighting pits, stood in the arena today. He removed his helmet. The Emperor did not look pleased. "My name is Maximus Decimus Meridius," he announced, before adding that he would have his vengeance. In this life or the next. The crowd went absolutely mental.`,
      prompt: `The arena gates are open. Triple points for anyone who enters. Do you fight with the general or against him?`
    },
    escalation_template: `The Emperor is doing the thumb thing. Nobody can tell which direction. He seems to enjoy the ambiguity. The general asked "Are you not entertained?" Based on participation, yes. Very.\n\n{top_replies}\n\nThe arena floor is littered with spent spells. The general is still standing. The Emperor's thumb remains unclear.\n\nFight for glory or fight for vengeance?`,
    resolution_template: `The dust settles. {winner} stood tallest when it cleared. The general nods. The Emperor's thumb has been interpreted seven different ways.\n\nWhat we do in Avaloris echoes in eternity. Or at least until tomorrow.`,
    nerm_hooks: {
      morning: [
        "vengeance. in this life or the next. bit dramatic for a tuesday.",
        "he had a farm. a family. now he has a sword and a grudge. career pivot.",
        "strength and honour. or just points. whatever gets you moving."
      ],
      escalation: [
        "are you not entertained. based on the numbers, extremely.",
        "the thumb is ambiguous. the emperor enjoys this. power is ambiguity.",
        "at my signal, unleash... whatever it is you people do."
      ],
      resolution: [
        "what we do here echoes in eternity. what you do on twitter echoes until the algorithm moves on.",
        "the general won. or lost. depends which version of events you trust.",
        "strength and honour. he said this while covered in blood. inspiring."
      ]
    }
  },

  // --- 22. Anchorman ---
  {
    id: 'news_crystal_wars',
    title: 'THE GREAT NEWS CRYSTAL WARS',
    theme: 'movie',
    player_hook: 'The rival broadcasters abandoned their equipment during the brawl. Crystal broadcasting equipment is incredibly valuable. Claim it for your house and control the narrative.',
    morning: {
      text: `A territorial dispute between rival crystal broadcasters has escalated beyond reason. The lead broadcaster insists he's "kind of a big deal" and that "his tower has many leather-bound tomes." Rival houses assembled their own news teams. Someone brought a trident.`,
      prompt: `The brawl is starting. Broadcasting equipment is everywhere. Which team do you join, and what do you grab?`
    },
    escalation_template: `That escalated quickly. A wizard brought a trident. Another set the broadcast crystal on fire. A Nighthollow wizard is playing jazz flute in the middle of the battlefield.\n\n{top_replies}\n\nSomeone was punted off a bridge by a bear that nobody can explain. Alliances formed. Alliances betrayed. The jazz flute continues.\n\nStay classy, Avaloris.`,
    resolution_template: `The crystal wars are over. Barely. {winner} secured the most equipment. Several wizards remain trapped in a glass case of emotion.\n\nThe trident wizard is still at large.`,
    nerm_hooks: {
      morning: [
        "kind of a big deal. people know him. his tower has leather-bound tomes.",
        "someone brought a trident. to a news broadcast. preparation is key.",
        "this is going to escalate. i can feel it in every fibre of my non-existent body."
      ],
      escalation: [
        "that escalated quickly. i mean that really got out of hand fast.",
        "a bear appeared. nobody ordered a bear. the bear doesn't care about your schedule.",
        "jazz flute. in a battlefield. i've seen worse decisions. not many."
      ],
      resolution: [
        "stay classy avaloris. that ship sailed before it was built.",
        "sixty percent of the time, it works every time.",
        "the trident wizard is at large. armed. dangerous. playing jazz flute."
      ]
    }
  },

  // --- 23. Alan Partridge ---
  {
    id: 'the_grand_pitch',
    title: 'THE GRAND PITCH AT DAWN',
    theme: 'movie',
    player_hook: 'The broadcaster left behind scripts, props, and a surprisingly well-stocked wardrobe. His abandoned pitch materials contain maps and intelligence about every zone in Avaloris. Useful.',
    morning: {
      text: `A washed-up court broadcaster arrived at the Crystal Broadcasting Tower in a dressing gown, demanding a second season for his show. He's been living at a roadside tavern. His pitch involves a monkey, a military hospital, and an idea called "Inner-Realm Partridge." Nobody asked for this.`,
      prompt: `He's pitching to you. The scripts are surprisingly detailed — they contain maps, zone intel, everything. Commission the show? Steal the notes? Call security?`
    },
    escalation_template: `He's been pitching for four hours. He keeps saying "back of the net" after every idea. He's eaten all the complimentary cheese. Someone mentioned "digital" and he pretended to understand.\n\n{top_replies}\n\nHis assistant has been sitting in the wagon the entire time. Eating toblerone. Sighing.\n\nThe maps in his scripts are accurate. That alone is worth something.`,
    resolution_template: `The pitch concluded. {winner} acquired the most useful intelligence from his materials. He got a show. Nobody is sure what they commissioned.\n\nJurassic Park.`,
    nerm_hooks: {
      morning: [
        "he lives in a tavern. pitches in a dressing gown. his confidence is aspirational.",
        "inner-realm partridge. working title. it will remain a working title.",
        "nobody asked him back. that hasn't stopped him. nothing stops him."
      ],
      escalation: [
        "back of the net. he says this constantly. nobody knows what the net is.",
        "the assistant is in the wagon. eating toblerone. she's the smartest one here.",
        "he ate all the cheese. every piece. this was intentional."
      ],
      resolution: [
        "commissioned. somehow. aha.",
        "smell my cheese you— actually never mind.",
        "jurassic park. lovely stuff."
      ]
    }
  },

  // --- 24. Shane Gillis / comedy roast ---
  {
    id: 'the_roast',
    title: 'THE GRAND ROAST AT THE BROKEN TANKARD',
    theme: 'movie',
    player_hook: 'The roast tradition: whoever gets the best crowd reaction earns bonus points. Creative insults welcome. The tavern owner is offering free mead to the winner\'s entire house.',
    morning: {
      text: `The Broken Tankard is hosting its annual roast — every house sends their sharpest tongue. Last year's champion told a joke so devastating about House Manastorm that three members temporarily defected. The crowd wants blood. Metaphorical blood. Probably.`,
      prompt: `You're at the roast. The crowd is waiting. What's your best shot at the house sitting across from you?`
    },
    escalation_template: `The roasts are flying. A Smoulders wizard made a joke about Ironbark's intelligence that was so simple it circled back to being devastating. A Nighthollow wizard just stood in silence for thirty seconds. Somehow this was the funniest thing all night.\n\n{top_replies}\n\nThe crowd is choosing sides. The tavern owner is running out of mead. This is getting personal.\n\nBring your best or sit down.`,
    resolution_template: `The roast is over. Several reputations are in tatters. {winner} delivered the most crowd-approved devastation.\n\nTwo houses aren't speaking to each other. This will last approximately one bounty.`,
    nerm_hooks: {
      morning: [
        "the annual roast. where friendships go to die and points go to the cruel.",
        "three members defected over a joke last year. words are the strongest spell.",
        "sharp tongues only. dull wizards may observe from the back."
      ],
      escalation: [
        "silence for thirty seconds. funniest thing all night. comedy is timing.",
        "it was so simple it became devastating. the best insults always are.",
        "it's getting personal. it was always personal. the roast just gives permission."
      ],
      resolution: [
        "reputations in tatters. they'll recover. probably. maybe.",
        "they're not speaking. this lasts until the next bounty. always does.",
        "the cruelest spells require no mana. just accurate observation."
      ]
    }
  },

  // --- 25. Fight Club ---
  {
    id: 'the_basement',
    title: 'THE GATHERING BENEATH THE SOAP SHOP',
    theme: 'movie',
    player_hook: 'The underground fights have a simple entry fee: one secret about your house. Win and you earn points plus rival intelligence. Lose and your secret spreads.',
    morning: {
      text: `A soap maker in the lower quarter has been hosting something in his basement. Wizards go in clean and come out bruised. Nobody talks about what happens down there. The first rule, apparently, is that you're not supposed to discuss it. The second rule is the same. The soap is excellent though.`,
      prompt: `You've been invited downstairs. The entry fee is one secret. What do you bring, and are you here to fight or watch?`
    },
    escalation_template: `The basement is packed. Wizards from every house, casting aside ranks and titles. The soap maker is philosophical about destruction. "It's only after you've lost everything," he keeps saying. Nobody asked.\n\n{top_replies}\n\nA wizard noticed that the soap maker and his most loyal lieutenant have never been seen in the same room. This observation was not appreciated.\n\nThe fights continue. What's your secret worth?`,
    resolution_template: `The basement is empty by dawn. {winner} won the most bouts and acquired the most intelligence.\n\nThe soap maker's next venture is unclear. He's been buying a lot of supplies. And drawing maps. Nobody is connecting the dots.`,
    nerm_hooks: {
      morning: [
        "we don't talk about the basement. that's the first rule. also the second.",
        "the soap is excellent. the bruises less so. fair trade.",
        "you're not your robe. you're not your spell count. you're the all-singing all-casting etc."
      ],
      escalation: [
        "never seen in the same room. interesting observation. don't pursue it.",
        "it's only after you lose everything that you're free. or just have nothing. either way.",
        "the soap maker is philosophical. philosophers with basements are concerning."
      ],
      resolution: [
        "his name was... actually we don't discuss that.",
        "the first rule is silence. i've already broken it. i'm a cat. rules are suggestions.",
        "he's buying supplies. and drawing maps. i'm sure it's for the soap business."
      ]
    }
  },

  // --- 26. Lord of the Rings ---
  {
    id: 'the_small_ones',
    title: 'THE JOURNEY OF THE SMALL ONES',
    theme: 'movie',
    player_hook: 'The artifact needs to reach the volcano before it corrupts its carrier. Escort missions earn double points but everyone wants the artifact for themselves.',
    morning: {
      text: `A small wizard — very small, barely reaches the tavern bar — has been entrusted with destroying an artifact of terrible power. He needs to carry it to a volcano. He has one loyal friend, an unreliable creature who keeps calling the artifact "precious," and seven companions of varying usefulness. The Council says one does not simply walk to the volcano.`,
      prompt: `The fellowship is forming. The artifact is heavy. The volcano is far. Are you escorting, intercepting, or sitting this one out?`
    },
    escalation_template: `The fellowship has split. One went off with a canoe. Two are chasing enemies. The unreliable creature is arguing with himself in a cave. The small wizard is still walking.\n\n{top_replies}\n\nAn ancient tree has started walking and nobody is acknowledging how unusual this is.\n\nThe volcano is getting closer. Or the small wizard is getting slower. Hard to tell.`,
    resolution_template: `The artifact was destroyed. Probably. The volcano erupted, which suggests something went in. {winner} contributed the most to the journey. The small ones are going home.\n\nThe unreliable creature fell in. With the artifact. He seemed happy about it.`,
    nerm_hooks: {
      morning: [
        "one does not simply walk there. apparently you can't take a cart either.",
        "seven companions. varying usefulness. mostly varying.",
        "the artifact whispers. the small wizard listens. this is always how it starts."
      ],
      escalation: [
        "the tree is walking. nobody is discussing this. priorities are elsewhere.",
        "the creature is arguing with himself. both sides are losing.",
        "the fellowship split up. as all groups do. by day three."
      ],
      resolution: [
        "he threw it in. or it fell in. or both. the volcano doesn't care about semantics.",
        "the small ones saved the world. they want to go home now. understandable.",
        "precious. he said. as he fell. some love stories are unconventional."
      ]
    }
  },

  // --- 27. Breaking Bad ---
  {
    id: 'the_blue_formula',
    title: 'THE ALCHEMIST OF THE BLEACHED FLATS',
    theme: 'movie',
    player_hook: 'The alchemist\'s blue crystals are the most potent spell components ever created. His hidden laboratory has a stockpile. Whoever finds it first arms their house with the best materials in Avaloris.',
    morning: {
      text: `A mild-mannered potions teacher from the Academy has been diagnosed with a terminal curse. Rather than accept his fate, he's partnered with a former student of questionable judgement to cook the purest spell crystals ever seen. They're blue. They're flawless. And every criminal enterprise in Avaloris wants the recipe.`,
      prompt: `The blue crystals have hit the market. The teacher is cooking in the flats. Do you buy, bust, or try to learn the formula?`
    },
    escalation_template: `The teacher has evolved. He no longer looks mild-mannered. His former student keeps saying "yeah, magic!" which adds nothing but enthusiasm. Their operation has attracted the attention of a very calm, very dangerous distributor who hides behind a fried chicken shop.\n\n{top_replies}\n\nThe teacher was offered a buyout. He declined. "I am the one who casts," he said. To nobody in particular.\n\nThe crystals are still the purest in the realm.`,
    resolution_template: `The operation expanded. Then contracted. Then exploded. {winner} acquired the most crystals before things went sideways.\n\nThe teacher is still out there. Or isn't. The blue crystals remain unmatched.`,
    nerm_hooks: {
      morning: [
        "terminal curse. midlife crisis. drug empire. standard career trajectory.",
        "the crystals are blue. they're flawless. the morals are not.",
        "a potions teacher and a dropout. the greatest partnership since nothing. ever."
      ],
      escalation: [
        "i am the one who casts. he said. to an empty room. powerful.",
        "yeah, magic! adds nothing. but adds it with enthusiasm.",
        "the chicken shop is a front. the best chicken shops always are."
      ],
      resolution: [
        "expanded. contracted. exploded. the lifecycle of ambition.",
        "the blue crystals remain. the chemist may not. legacy.",
        "say my name. he demands this of strangers. it's effective."
      ]
    }
  },

  // --- 28. The Office ---
  {
    id: 'the_guild_office',
    title: 'THE GUILD OFFICE AT MERCHANT ROW',
    theme: 'movie',
    player_hook: 'The guild office processes all trade permits in the zone. Control the office and your house can approve its own permits — fast-tracking points and blocking rivals.',
    morning: {
      text: `The Merchant Row guild office is the most boring building in Avaloris. The guild master insists on declaring himself the "world's best guild master" despite universal disagreement. He throws parties nobody wants to attend. His assistant stares directly at invisible audiences. The office sells parchment. Nobody knows why it still exists.`,
      prompt: `You've been transferred to the guild office. The guild master wants to be your friend. The parchment orders are falling behind. What do you do?`
    },
    escalation_template: `The guild master organised a tournament. At his own office. For his own employees. The prize is a trophy he made himself. His assistant is plotting something — nobody is sure what, but he keeps looking at invisible people and smirking.\n\n{top_replies}\n\nTwo guild workers have been flirting by the supply cupboard for what feels like years. A large, quiet wizard from the back room said one sentence today and it was devastating.\n\nThe parchment orders are critically behind. Does anyone actually work here?`,
    resolution_template: `The office somehow processed more orders than any other branch. Despite everything. {winner} was the most productive. The guild master is taking credit.\n\nThe assistant is still smirking at nobody.`,
    nerm_hooks: {
      morning: [
        "world's best guild master. self-declared. universally disputed.",
        "they sell parchment. nobody knows why the office exists. it persists regardless.",
        "the assistant stares at invisible audiences. i understand him."
      ],
      escalation: [
        "a trophy he made himself. for a tournament he invented. peak management.",
        "flirting by the supply cupboard. for years. commit or move on.",
        "one sentence. devastating. silence is the best setup for a punchline."
      ],
      resolution: [
        "the guild master is taking credit. as always. the office survives.",
        "they processed more than any branch. despite zero effort. inexplicable.",
        "the assistant knows something. he always knows something. he'll never tell."
      ]
    }
  },

  // ===========================
  // INTERNET CULTURE (29-35)
  // ===========================

  // --- 29. Failed heist / Ocean's Eleven ---
  {
    id: 'the_vault_job',
    title: 'THE NINE-WIZARD VAULT JOB',
    theme: 'internet',
    player_hook: 'Join the heist crew or defend the vault. Either way, the vault contents are up for grabs. Whichever house controls the most gold at the end of the day wins.',
    morning: {
      text: `A wizard with an extremely calm demeanour has assembled a team of nine specialists to rob the most secure vault in Avaloris. The plan is elaborate. The disguises are decent. The inside man is nervous. The vault belongs to a very unpleasant wizard who won it in a card game.`,
      prompt: `You've been recruited. Or you're guarding the vault. What's your role in the job?`
    },
    escalation_template: `Phase one is complete. They're inside. The locks are bypassed. The nervous inside man dropped his enchanted key twice. The calm wizard hasn't blinked in four hours.\n\n{top_replies}\n\nA complication: the vault owner showed up early. He's suspicious. Someone needs to distract him. The calm wizard has a plan for this. He has a plan for everything.\n\nAre you in or are you the distraction?`,
    resolution_template: `The job was... complicated. {winner} walked away with the most. The calm wizard is already planning the next one.\n\nThe vault owner doesn't know what happened yet. He will shortly.`,
    nerm_hooks: {
      morning: [
        "nine specialists. one vault. the confidence-to-competence ratio is concerning.",
        "the inside man is nervous. this bodes well.",
        "the plan has seventeen steps. step six is 'improvise.' reassuring."
      ],
      escalation: [
        "he hasn't blinked in four hours. focus or malfunction. both impressive.",
        "he dropped the key twice. the heist is going exactly as well as expected.",
        "the calm wizard has a plan. he always has a plan. most of them work."
      ],
      resolution: [
        "the job was complicated. heists always are. the debrief will be longer than the job.",
        "already planning the next one. criminals don't retire. they sequel.",
        "the vault owner will find out shortly. shortly is doing a lot of work in that sentence."
      ]
    }
  },

  // --- 30. Streamer / influencer drama ---
  {
    id: 'crystal_broadcast_feud',
    title: 'THE GREAT BROADCAST FEUD',
    theme: 'internet',
    player_hook: 'The feuding broadcasters are offering points to anyone who supports their side publicly. Pick a side, amplify them, earn their loyalty and bonus points.',
    morning: {
      text: `Two of Avaloris's most popular crystal broadcasters are feuding. It started over a recipe for fire wine. It has escalated to personal attacks, defection demands, and one broadcaster releasing a three-hour crystal recording titled "My Truth." The other responded with "Your Truth Is Wrong: A Response."`,
      prompt: `The realm is split. Who do you side with, and how publicly do you take a stand?`
    },
    escalation_template: `"My Truth" has been viewed a hundred thousand times. "Your Truth Is Wrong" has been viewed twice that. A third broadcaster has released "Both Your Truths Are Stupid" which is currently number one.\n\n{top_replies}\n\nOne broadcaster just went live while crying. The other is doing a cooking stream pretending nothing is happening. This is the most entertaining thing all season.\n\nWhose truth is it anyway?`,
    resolution_template: `The feud ended when both broadcasters were overshadowed by a cat that accidentally walked across a broadcast crystal. {winner} accumulated the most engagement during the drama.\n\nThey'll be friends again by next week. Then enemies again.`,
    nerm_hooks: {
      morning: [
        "my truth. your truth. the truth is nobody cares but everyone watches.",
        "it started over fire wine. it always starts over something stupid.",
        "three hours of truth. no one has that much truth. or that much time."
      ],
      escalation: [
        "both your truths are stupid. the only honest take. naturally it went viral.",
        "crying live on crystal. the algorithm loves tears.",
        "the cooking stream pretending nothing is happening. respect. truly."
      ],
      resolution: [
        "overshadowed by a cat. as all things should be. the cat was not trying. that's what made it perfect.",
        "friends again next week. enemies the week after. content is cyclical.",
        "a cat walked across a broadcast crystal. peak broadcasting. no notes."
      ]
    }
  },

  // --- 31. "Dude trust me" / blind following ---
  {
    id: 'the_prophet',
    title: 'THE PROPHET OF STARFALL CRATER',
    theme: 'internet',
    player_hook: 'The prophet says treasure is buried in the crater. Hundreds believe him. Whether he\'s right or not, hundreds of wizards digging in one place WILL find something.',
    morning: {
      text: `A wizard appeared at Starfall Crater claiming he can see the future. He predicted three things correctly. Now he has two thousand followers. His predictions are vague — "something will change" and "trust the process." He sells access to his premium sending-stone circle for five gold a month.`,
      prompt: `The prophet says to dig at the crater today. Do you trust the process, or do you sell shovels to the believers?`
    },
    escalation_template: `The prophet's latest prediction: "The stars align at dusk. This changes everything." Two thousand wizards are digging. They've found some rocks. The prophet says the rocks are significant. Premium subscribers get told which rocks.\n\n{top_replies}\n\nA wizard selling shovels nearby has made more money than anyone digging. The prophet hasn't noticed. He's looking at the stars.\n\nTrust the process?`,
    resolution_template: `They found... something. Might be treasure. Might be an old drainage pipe. The prophet says it confirms his vision. {winner} profited most — whether from digging, selling shovels, or both.\n\nThe premium sending-stone now costs ten gold. Demand has increased.`,
    nerm_hooks: {
      morning: [
        "three correct predictions. out of three hundred. those are the ones we mention.",
        "trust the process. the process costs five gold a month.",
        "he sees the future. the future is vague. convenient."
      ],
      escalation: [
        "the shovel seller is the real prophet. sell tools to believers. timeless strategy.",
        "significant rocks. for premium subscribers. the rocks look normal to me.",
        "this changes everything. what changes. everything. oh. well then."
      ],
      resolution: [
        "treasure or drainage pipe. the prophet is confident either way.",
        "ten gold a month now. belief inflates like everything else.",
        "he predicted something would happen. something happened. prophecy fulfilled."
      ]
    }
  },

  // --- 32. Nigerian prince / advance fee scam ---
  {
    id: 'the_foreign_prince',
    title: 'THE LETTER FROM THE DISTANT PRINCE',
    theme: 'internet',
    player_hook: 'The prince is fake but his letter mentioned a real shipwreck. The cargo is documented in port records. Find the wreck before the scammers and your house claims genuine treasure.',
    morning: {
      text: `Every wizard in Avaloris received the same scroll this morning: "Greetings. I am Prince Aldremor of the Farlands. I have 40 million gold trapped in a shipwreck and require your assistance to recover it. Please send 500 gold to unlock the shipping enchantment. You will receive 30% of the total. Blessings, Prince Aldremor."`,
      prompt: `Obviously a scam. But... what if it's real? And more importantly — the shipwreck he mentioned matches actual port records. Do you investigate?`
    },
    escalation_template: `Four thousand wizards sent 500 gold each. The "prince" is now in possession of two million gold. A few enterprising wizards ignored the letter and went looking for the actual shipwreck instead.\n\n{top_replies}\n\nThe shipwreck is real. The cargo is real. "Prince Aldremor" apparently based his scam on a real event by accident. Or not by accident.\n\nThe wreck is there. Who gets to it first?`,
    resolution_template: `The wreck was found. The cargo was split. {winner} recovered the most. "Prince Aldremor" sent a follow-up scroll thanking everyone for their "partnership."\n\nA new scroll arrived this evening. Same letter. Different prince. Different shipwreck.`,
    nerm_hooks: {
      morning: [
        "forty million gold. just send five hundred. i admire the optimism on both sides.",
        "blessings, prince aldremor. the most polite theft i've ever witnessed.",
        "obviously a scam. but what if. the three most dangerous words."
      ],
      escalation: [
        "four thousand wizards sent gold. prince aldremor is the most successful wizard in avaloris.",
        "the shipwreck is real. the scam was accidentally useful. incredible.",
        "he based his scam on a real shipwreck. either genius or stupid. both achieve the same result."
      ],
      resolution: [
        "new prince. new shipwreck. tomorrow's problem.",
        "blessings. he really wrote blessings. and they sent the gold.",
        "the scam was fake. the treasure was real. the realm is strange."
      ]
    }
  },

  // ===========================
  // ABSURDIST / SOUTH PARK (33-37)
  // ===========================

  // --- 33. Underpants gnomes ---
  {
    id: 'the_gnomes',
    title: 'THE UNDERPANTS OPERATION OF IRONBARK',
    theme: 'absurdist',
    player_hook: 'The gnomes\' headquarters has blueprints for every building in the zone. Steal the blueprints and your house knows every secret passage and weakness in the district.',
    morning: {
      text: `Tiny creatures have been raiding storerooms across Ironbark territory. Their operation has three phases. Phase 1: Steal supplies. Phase 2: ??? Phase 3: Profit. When questioned, they produced a very confident diagram. Phase 2 remains blank. They seem completely unbothered by this gap.`,
      prompt: `You've captured a gnome. It's holding a blueprint. What is Phase 2, and do the blueprints show anything useful?`
    },
    escalation_template: `The gnomes now have a headquarters, a mission statement, and a round of investor funding. Phase 2 is still blank. Investors are "excited about the potential."\n\n{top_replies}\n\nA consultant was hired to define Phase 2. He also doesn't know. He charges by the hour. The gnomes consider this Phase 2.\n\nThe blueprints show every building in the district. Worth raiding the HQ.`,
    resolution_template: `The gnomes secured full funding. Phase 2 remains unknown. {winner} profited most from Phase 3. Which exists somehow.\n\nThe gnomes went public. Crystal filings list Phase 2 as "synergy."`,
    nerm_hooks: {
      morning: [
        "phase 1: steal. phase 2: ??? phase 3: profit. this is every business plan i've seen.",
        "they seem confident about phase 3. the middle is just vibes.",
        "the diagram is very confident. the diagram is also mostly blank."
      ],
      escalation: [
        "investor funding for a plan with no phase 2. this sounds familiar.",
        "the consultant charges by the hour and knows nothing. he's the most successful one here.",
        "synergy. the word that means nothing and solves everything."
      ],
      resolution: [
        "phase 2 is synergy. i've heard worse. actually no. i haven't.",
        "publicly traded. unknown business model. valued at twelve million. normal.",
        "the gnomes went public. phase 2 is still blank. stock went up."
      ]
    }
  },

  // --- 34. Kenny dies ---
  {
    id: 'the_hooded_apprentice',
    title: 'THE CURSE OF THE HOODED APPRENTICE',
    theme: 'absurdist',
    player_hook: 'Every time the apprentice dies, his pockets scatter random spell components. Be nearby when it happens and you collect free resources. He dies a lot.',
    morning: {
      text: `A hooded apprentice died again today. This is the fourteenth time this season. Crushed by a cart. Eaten by a griffin. Struck by extremely improbable lightning indoors. Every morning he comes back. Every evening something kills him. His friends barely react. "Oh no," says one. "Anyway," says the other.`,
      prompt: `The apprentice just walked past you. Something is about to fall on him. What do you do — save him, or position yourself to catch what drops?`
    },
    escalation_template: `He's died twice since this morning. Falling chandelier, then angry griffin. His hooded robe makes it hard to confirm but everyone agrees it's him. The cleric refuses to resurrect him anymore.\n\n{top_replies}\n\nHis friends have moved on to discussing lunch. The apprentice just reappeared at the tavern door looking confused.\n\nWhat gets him next?`,
    resolution_template: `The hooded apprentice died seven times today. New record. {winner} collected the most scattered components. He'll be back tomorrow. He's always back.\n\nOh no. They killed the apprentice. Those individuals.`,
    nerm_hooks: {
      morning: [
        "fourteenth time. his friends said oh no. then discussed lunch. loyalty.",
        "improbable indoor lightning. tragic but statistically fascinating.",
        "he'll be back tomorrow. i envy his ability to leave. even briefly."
      ],
      escalation: [
        "died twice before lunch. efficient.",
        "the cleric refused. can't blame them. it's lost all meaning.",
        "oh no. anyway."
      ],
      resolution: [
        "seven deaths. new record. he'll be back. unfortunately for him.",
        "they killed the apprentice. those... individuals.",
        "he returns. i remain. we are both cursed. differently."
      ]
    }
  },

  // --- 35. "We didn't listen!" ---
  {
    id: 'the_ignored_warning',
    title: 'THE PROPHECY NOBODY READ',
    theme: 'absurdist',
    player_hook: 'The prophecy described treasure hidden under the town square. Everyone was too busy panicking about the disaster prediction to read the part about gold. Dig while they panic.',
    morning: {
      text: `An ancient prophecy was discovered in the library. It predicted everything that happened this season — the plagues, the wars, the exact date the Exchange collapsed. It was filed under "miscellaneous." The librarian said three people checked it out. None of them finished it. The last page contains instructions for finding a massive buried treasure.`,
      prompt: `The prophecy is public now. The last page mentions treasure under the town square. Everyone is arguing about the disaster predictions. Are you digging while they debate?`
    },
    escalation_template: `The realm is in chaos over the prophecy's predictions. Scholars are arguing. The Council has formed a committee. Nobody has read the last page about the treasure.\n\n{top_replies}\n\nOne wizard read the whole thing. She's been digging quietly for two hours. Nobody has noticed because they're too busy yelling.\n\nThe debate is loud. The digging is quiet. Which matters more?`,
    resolution_template: `The scholars are still arguing. The treasure was found. {winner} dug while everyone debated.\n\nThe prophecy also predicted this outcome. It's on page four. Nobody has read page four.`,
    nerm_hooks: {
      morning: [
        "filed under miscellaneous. the most important document in history. miscellaneous.",
        "three people checked it out. none finished. this is every important document ever.",
        "we didn't listen. we never listen. this is the real prophecy."
      ],
      escalation: [
        "they're arguing about predictions. she's digging up gold. both are valid. one is profitable.",
        "a committee. they formed a committee. the treasure will be gone by the time they meet.",
        "the last page has the answer. nobody reads last pages."
      ],
      resolution: [
        "the scholars are still arguing. the gold is gone. the prophecy predicted this too.",
        "page four. nobody read page four. it's always page four.",
        "we didn't listen. again. we will not listen next time either. tradition."
      ]
    }
  },

  // --- 36. "Simpsons did it" / everything already happened ---
  {
    id: 'the_archive',
    title: 'THE ARCHIVE THAT PREDICTED EVERYTHING',
    theme: 'absurdist',
    player_hook: 'The archive contains scrolls predicting future events. Whoever controls the archive knows what\'s coming next season. That intelligence is priceless.',
    morning: {
      text: `A dusty archive was found in the basement of a comedy theatre. It contains scrolls dating back centuries. Every major event in Avaloris was described in these scrolls years before it happened. The fall of kingdoms. The rise of houses. The exact outfit the Council leader wore last Tuesday. Every time someone announces a plan, a scholar finds the scroll where it already happened.`,
      prompt: `The archive is open. The scrolls describe the future. Some of them describe tomorrow. What do you look up first?`
    },
    escalation_template: `Three houses have stationed researchers in the archive. Every time a new plan is proposed, someone yells "the archive already did it!" A Manastorm wizard is checking if his lunch is in there. It is.\n\n{top_replies}\n\nThe archive contains a scroll about today. About this exact event. About you reading this.\n\nHow far ahead do you read?`,
    resolution_template: `The archive was split among the houses. {winner} claimed the most predictive scrolls. Everything that happened today was in the archive. Everything that happens tomorrow is too.\n\nA wizard checked if the archive predicted its own discovery. It did. Page one.`,
    nerm_hooks: {
      morning: [
        "the archive predicted everything. we just didn't read the archive. typical.",
        "every plan. every event. already in a scroll. originality is dead.",
        "his lunch is in the archive. described perfectly. from three hundred years ago."
      ],
      escalation: [
        "the archive already did it. the only phrase that matters anymore.",
        "a scroll about today. about this moment. about you reading this. i hate it.",
        "how far ahead do you read. far enough to be scared or not far enough to be useful."
      ],
      resolution: [
        "everything was predicted. everything. the archive doesn't miss.",
        "it predicted its own discovery. on page one. aggressive.",
        "nothing is new. everything has happened. the archive is proof. we are reruns."
      ]
    }
  },

  // --- 37. Speed run / min-maxing ---
  {
    id: 'the_speed_trial',
    title: 'THE GREAT SPEED TRIAL',
    theme: 'absurdist',
    player_hook: 'The trial rewards the fastest completion. First house to solve the dungeon earns double points. Brute force, cleverness, or exploits — all are valid.',
    morning: {
      text: `The Academy set up a trial dungeon — a standard combat-puzzle-treasure course meant to take three hours. A wizard completed it in four minutes by clipping through a wall, skipping the boss via a geometry exploit, and finishing the treasure room before it loaded properly. The Academy says this doesn't count. The wizard says it absolutely counts.`,
      prompt: `The trial is open. Intended route or speedrun? Do you solve the puzzles or exploit the walls?`
    },
    escalation_template: `The legitimate runners are on floor three. The speedrunners have already finished twice and are arguing about milliseconds. One wizard discovered you can skip the entire dungeon by talking to a specific NPC backwards.\n\n{top_replies}\n\nThe Academy is patching the walls. The speedrunners are already finding new skips. This arms race has no winner.\n\nFastest time wins. Method optional.`,
    resolution_template: `The trial closed. The Academy's intended route was completed by several houses. The actual fastest time used none of the intended route. {winner} posted the best time by whatever means necessary.\n\nThe Academy has announced a second trial. The speedrunners are already mapping it.`,
    nerm_hooks: {
      morning: [
        "four minutes. intended time: three hours. the walls are suggestions.",
        "clipping through walls is not a technique. except when it works. which is always.",
        "the academy says it doesn't count. the clock says otherwise."
      ],
      escalation: [
        "talking to the npc backwards. skips the entire dungeon. game design.",
        "patching walls. finding new skips. the eternal cycle.",
        "milliseconds matter. to no one. except the people arguing about them."
      ],
      resolution: [
        "the intended route was optional. the fastest route was through a wall.",
        "the academy will try again. the speedrunners will break it again. circle of life.",
        "four minutes. legitimately. if you define legitimately very loosely."
      ]
    }
  },

  // ===========================
  // PURE FANTASY / ORIGINALS (38-40)
  // ===========================

  // --- 38. Dragon wakes up ---
  {
    id: 'the_sleeping_dragon',
    title: 'THE SLEEPER BENEATH DRAGON\'S REST',
    theme: 'fantasy',
    player_hook: 'The dragon is waking. Its hoard is exposed. But it won\'t sleep forever — grab what you can before it opens its eyes fully. Speed and greed vs. survival instinct.',
    morning: {
      text: `Something enormous shifted beneath Dragon's Rest last night. The ground is warm. Cracks have appeared in the earth, revealing glimpses of gold below — a hoard so vast it has its own weather system. Merchants fled at dawn. The dragon hasn't opened its eyes yet. But it's breathing faster.`,
      prompt: `The ground is cracking. Gold is visible. The dragon is stirring. How close do you get, and how much do you grab?`
    },
    escalation_template: `The braver wizards have descended into the cracks. The gold is real. It's everywhere. One eye opened briefly, then closed. The temperature has risen ten degrees.\n\n{top_replies}\n\nA wizard filled three sacks before a tail shifted and sealed the crack behind him. He's now inside with the gold and the dragon. Technically wealthy. Practically trapped.\n\nThe cracks are widening. More gold. More heat. More risk.`,
    resolution_template: `The dragon shifted but didn't fully wake. {winner} extracted the most gold before the cracks resealed.\n\nThe ground is still warm. The breathing continues. Next time it might open both eyes.`,
    nerm_hooks: {
      morning: [
        "the hoard has its own weather system. that's how much gold there is.",
        "the dragon is breathing faster. this is either opportunity or a funeral.",
        "merchants fled. wizards approached. one of these groups is smarter."
      ],
      escalation: [
        "technically wealthy. practically trapped. a metaphor for many things.",
        "one eye opened. then closed. it's deciding. you don't want to be there when it decides.",
        "three sacks of gold. sealed inside with a dragon. net positive?"
      ],
      resolution: [
        "it didn't wake. this time. next time is not guaranteed.",
        "the breathing continues. the gold remains. the tension is permanent.",
        "the bravest wizard got the gold. the smartest wizard watched from a hill."
      ]
    }
  },

  // --- 39. Magical storm / raw chaos ---
  {
    id: 'the_mana_storm',
    title: 'THE MANA STORM AT STARFALL CRATER',
    theme: 'fantasy',
    player_hook: 'Raw mana is raining from the sky. Every spell cast during the storm is amplified — triple points, but wild surges can backfire. High risk, high reward chaos.',
    morning: {
      text: `A mana storm has formed over Starfall Crater. Raw magical energy is falling like rain. Spells cast in the storm are amplified wildly — a cantrip might level a building, a healing spell might resurrect something that was never alive. The Academy recommends staying indoors. Nobody is staying indoors.`,
      prompt: `The storm is raging. Triple points for anyone brave enough to cast in it. But wild surges are unpredictable. Do you risk it?`
    },
    escalation_template: `The storm is intensifying. A wizard tried a simple light spell and it created a second sun for eleven seconds. Another tried a shield spell and became briefly invisible. A third tried a fire bolt and accidentally invented a new colour.\n\n{top_replies}\n\nThe Academy sent observers. The observers are now casting too. Professionalism has collapsed. The storm doesn't care about your intentions.\n\nTriple points. Triple chaos. Cast or cower.`,
    resolution_template: `The storm passed. The crater is changed — new crystalline formations, strange plants, and a patch of ground that hums when you stand on it. {winner} cast the most during the storm and earned the amplified rewards.\n\nA new colour now exists. Nobody has named it yet.`,
    nerm_hooks: {
      morning: [
        "the academy recommends staying indoors. nobody is indoors. they never are.",
        "raw mana. falling from the sky. what could possibly go wrong. everything.",
        "triple points. triple chaos. the math works if you survive it."
      ],
      escalation: [
        "a second sun. for eleven seconds. excessive but impressive.",
        "he invented a colour. by accident. the best discoveries are accidents.",
        "the observers started casting. professionalism has a limit. apparently."
      ],
      resolution: [
        "a new colour. unnamed. uncategorised. just existing. aggressively.",
        "the storm passed. the crater is different. we are all slightly different.",
        "the ground hums. nobody knows why. it's been added to the list of unexplained things."
      ]
    }
  },

  // --- 40. The old wizard's final lesson ---
  {
    id: 'the_final_lesson',
    title: 'THE FINAL LESSON AT THE ANCIENT RUINS',
    theme: 'fantasy',
    player_hook: 'The old wizard\'s spell book is his legacy — pages scattered across the ruins, each containing unique enchantments. Collect the most pages and your house inherits the most powerful spellbook in Avaloris.',
    morning: {
      text: `The oldest wizard in Avaloris has announced this is his last day. He's going to cast one final spell — his greatest work, decades in the making — at the Ancient Ruins. Every house has been invited to witness it. He says the spell will "teach everyone something different." He's smiling. Old wizards who smile are either wise or dangerous.`,
      prompt: `You've gathered at the ruins. The old wizard is preparing. What do you expect to learn, and what do you actually want from this?`
    },
    escalation_template: `The old wizard has been casting for three hours. The spell is slow, layered, impossibly complex. Pages from his spellbook are drifting on magical currents, scattering across the ruins.\n\n{top_replies}\n\nEach page that lands reveals a different enchantment. Some are brilliant. Some are gibberish. Some are both. The wizard is still casting.\n\nGather the pages. His knowledge won't float forever.`,
    resolution_template: `The spell completed. Nobody is sure what it did, but everyone feels slightly different. {winner} collected the most pages.\n\nThe old wizard sat down, closed his eyes, and hasn't spoken since. He's still breathing. He's still smiling.`,
    nerm_hooks: {
      morning: [
        "old wizards who smile are either wise or dangerous. often both.",
        "his last day. his greatest spell. decades of work. no pressure.",
        "he invited everyone. old wizards don't share unless it's the end."
      ],
      escalation: [
        "pages floating on magical currents. knowledge is literally in the air.",
        "some pages are brilliant. some are gibberish. the line between them is thin.",
        "three hours of casting. the patience of a lifetime distilled into one spell."
      ],
      resolution: [
        "nobody knows what the spell did. everyone feels different. that might be the point.",
        "he's still smiling. even in silence. especially in silence.",
        "the pages scattered. the knowledge spread. maybe that was the lesson."
      ]
    }
  },

];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get a random narrative, avoiding recently used ones
 * @param {string[]} recentIds - IDs of recently used narratives to avoid
 * @returns {object} A narrative object
 */
function getRandomNarrative(recentIds = []) {
  const available = narratives.filter(n => !recentIds.includes(n.id));
  if (available.length === 0) return narratives[Math.floor(Math.random() * narratives.length)];
  return available[Math.floor(Math.random() * available.length)];
}

/**
 * Get a narrative by its ID
 */
function getNarrativeById(id) {
  return narratives.find(n => n.id === id) || null;
}

/**
 * Get a random Nerm hook for a narrative phase
 * @param {string} narrativeId
 * @param {string} phase - 'morning', 'escalation', or 'resolution'
 */
function getNermHook(narrativeId, phase) {
  const narrative = getNarrativeById(narrativeId);
  if (!narrative || !narrative.nerm_hooks[phase]) return null;
  const hooks = narrative.nerm_hooks[phase];
  return hooks[Math.floor(Math.random() * hooks.length)];
}

/**
 * Fill escalation template with live data
 */
function buildEscalation(narrative, data) {
  let text = narrative.escalation_template;
  let topRepliesText = '';
  if (data.topReplies && data.topReplies.length > 0) {
    topRepliesText = data.topReplies.map(r =>
      `💬 @${r.username} (${r.house}): "${r.text}"`
    ).join('\n');
  }
  text = text.replace('{top_replies}', topRepliesText);
  return text;
}

/**
 * Fill resolution template with results data
 */
function buildResolution(narrative, data) {
  let text = narrative.resolution_template;
  text = text.replace('{winner}', data.winnerHouse || 'No house');
  return text;
}

/**
 * Get all narrative IDs and metadata
 */
function getAllNarrativeIds() {
  return narratives.map(n => ({ id: n.id, title: n.title, theme: n.theme }));
}

/**
 * Get house data by ID
 */
function getHouse(id) {
  return houses[id] || null;
}

/**
 * Get all houses
 */
function getAllHouses() {
  return houses;
}

/**
 * Get all zones
 */
function getAllZones() {
  return zones;
}

/**
 * Get neutral zones only (for bounty targeting)
 */
function getNeutralZones() {
  return zones.filter(z => z.type === 'neutral');
}

module.exports = {
  houses,
  zones,
  narratives,
  getRandomNarrative,
  getNarrativeById,
  getNermHook,
  buildEscalation,
  buildResolution,
  getAllNarrativeIds,
  getHouse,
  getAllHouses,
  getAllZones,
  getNeutralZones,
};