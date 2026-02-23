// ============================================
// NERM — Nine Lives Network Telegram Bot
// File: server/services/nerm-telegram.js
// ============================================
//
//   1. Put at: server/services/nerm-telegram.js
//   2. Edit CONFIG below
//   3. Wire into server/index.js
//   4. Nerm handles the rest.
//
//   GROUP CHAT ONLY. Ignores all DMs.
//
// ============================================

const TelegramBot = require("node-telegram-bot-api");
const Anthropic = require("@anthropic-ai/sdk");

// ╔══════════════════════════════════════════╗
// ║                                          ║
// ║   ⚙️  CONFIG — EDIT THIS SECTION ONLY    ║
// ║                                          ║
// ╚══════════════════════════════════════════╝

const CONFIG = {

  // -----------------------------------------
  // ADMIN USER IDS
  // To find yours: message @userinfobot on Telegram
  // -----------------------------------------
  adminIds: [
    // 123456789,
  ],

  // -----------------------------------------
  // WHITELIST — never flagged
  // -----------------------------------------
  whitelistedUsers: [
    // 123456789,
  ],

  // -----------------------------------------
  // STRIKES
  // -----------------------------------------
  strikes: {
    muteAt: 2,
    banAt:  4,
  },
  muteDuration: 3600,

  // -----------------------------------------
  // 🚫 INSTANT DELETE — no scoring, no mercy
  // -----------------------------------------
  instantDelete: [
    "connect wallet",
    "connect your wallet",
    "claim your airdrop",
    "claim your tokens",
    "claim airdrop",
    "verify your wallet",
    "validate your wallet",
    "sync your wallet",
    "send me your seed",
    "seed phrase",
    "private key",
    "dm me your",
    "i am the admin",
    "i'm an admin",
    "official support",
    "tech support here",
  ],

  // -----------------------------------------
  // 🚫 INSTANT DELETE LINKS
  // -----------------------------------------
  instantDeleteLinks: [
    "t.me/+",
    "discord.gg/",
    "whatsapp.com/",
  ],

  // -----------------------------------------
  // ⚠️ SHILL PHRASES — each match adds to score
  // Score 2+ = delete + roast
  // -----------------------------------------
  shillPhrases: [
    "100x", "1000x", "10x gem", "50x", "20x",
    "moonshot", "moon mission", "mooning",
    "next 100x", "easy 10x", "guaranteed gains",
    "to the moon", "sending it",
    "buy now", "last chance", "don't miss",
    "launching now", "just launched", "stealth launch",
    "presale live", "presale is live", "whitelist open",
    "get in early", "still early", "super early",
    "before it moons", "before pump", "pump incoming",
    "running out of time", "limited spots",
    "not financial advice but buy", "nfa but",
    "trust me on this", "insider info",
    "whale alert", "whales are buying",
    "smart money", "alpha leak",
    "ape in", "aping in", "ape this",
    "dyor but buy", "check out $",
    "lowcap gem", "low cap gem", "microcap gem",
    "safu", "based dev", "dev is based",
    "liquidity locked", "lp locked", "renounced",
    "audit passed", "kyc done",
    "dm me for", "dm for alpha", "dm for details",
    "check my bio", "link in bio",
    "ca:", "contract:", "contract address",
    "buy here",
  ],

  // -----------------------------------------
  // 🔗 SHILL LINKS — each match = +2 score
  // -----------------------------------------
  shillLinks: [
    "pump.fun",
    "dexscreener.com",
    "birdeye.so",
    "defined.fi",
    "dextools.io",
    "poocoin.app",
    "flooz.xyz",
    "ave.ai",
    "gmgn.ai",
  ],

  // -----------------------------------------
  // 🏷️ SUS USERNAME PATTERNS
  // -----------------------------------------
  susNamePatterns: [
    /\$[A-Z]{2,8}/,
    /[0-9]+x\b/i,
    /gem\s?finder/i,
    /alpha\s?caller/i,
    /call.*group/i,
    /signal/i,
    /airdrop/i,
  ],

  // -----------------------------------------
  // ✅ SAFE WORDS — reduces score by 3
  // -----------------------------------------
  safeWords: [
    "nine lives", "9lv", "nethara", "nerm",
    "smoulders", "darktide", "stonebark", "ashenvale",
    "stormrage", "nighthollow", "dawnbringer", "manastorm",
    "plaguemire", "chronicle", "gauntlet", "spell card",
  ],
};

// ╔══════════════════════════════════════════╗
// ║                                          ║
// ║   🐱  BOT CODE — DON'T EDIT BELOW       ║
// ║   (unless you know what you're doing)    ║
// ║                                          ║
// ╚══════════════════════════════════════════╝

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

function startNermBot() {
  if (!TELEGRAM_TOKEN) {
    console.log("⚠️ No TELEGRAM_BOT_TOKEN — Nerm Telegram bot disabled");
    return;
  }
  if (!ANTHROPIC_API_KEY) {
    console.log("⚠️ No ANTHROPIC_API_KEY — Nerm Telegram bot disabled");
    return;
  }

  const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  console.log("🐱 Nerm Telegram bot armed. Group chat only. Delete-first.");

  function isGroupChat(msg) {
    return msg.chat.type === "group" || msg.chat.type === "supergroup";
  }

  function isAdmin(userId) {
    return CONFIG.adminIds.includes(userId);
  }

  const SOLANA_REGEX = /[1-9A-HJ-NP-Za-km-z]{32,44}/;
  const ETH_REGEX = /0x[a-fA-F0-9]{40}/;

  // =============================================
  // STRIKE TRACKER
  // =============================================

  const strikeTracker = new Map();

  function getStrikes(chatId, userId) {
    if (!strikeTracker.has(chatId)) strikeTracker.set(chatId, new Map());
    return strikeTracker.get(chatId).get(userId)?.strikes || 0;
  }

  function addStrike(chatId, userId, message) {
    if (!strikeTracker.has(chatId)) strikeTracker.set(chatId, new Map());
    const chat = strikeTracker.get(chatId);
    const existing = chat.get(userId) || { strikes: 0, messages: [] };
    existing.strikes += 1;
    existing.messages.push({ text: message, time: Date.now() });
    if (existing.messages.length > 5) existing.messages.shift();
    chat.set(userId, existing);
    return existing.strikes;
  }

  function resetStrikes(chatId, userId) {
    if (!strikeTracker.has(chatId)) return;
    strikeTracker.get(chatId).delete(userId);
  }

  function getChatStats(chatId) {
    const chat = strikeTracker.get(chatId);
    if (!chat) return { offenders: 0, totalStrikes: 0 };
    let totalStrikes = 0;
    chat.forEach((data) => { totalStrikes += data.strikes; });
    return { offenders: chat.size, totalStrikes };
  }

  // =============================================
  // DETECTION ENGINE
  // =============================================

  function detectScam(msg) {
    if (!msg.text) return { level: 0, signals: [] };
    if (CONFIG.whitelistedUsers.includes(msg.from.id)) return { level: 0, signals: [] };
    if (isAdmin(msg.from.id)) return { level: 0, signals: [] };

    const text = msg.text.toLowerCase();
    const signals = [];
    let score = 0;

    for (const phrase of CONFIG.instantDelete) {
      if (text.includes(phrase)) {
        return { level: 99, signals: [`⛔ "${phrase}"`] };
      }
    }

    for (const link of CONFIG.instantDeleteLinks) {
      if (text.includes(link)) {
        return { level: 99, signals: [`⛔ link: ${link}`] };
      }
    }

    if (SOLANA_REGEX.test(msg.text)) {
      return { level: 99, signals: ["⛔ solana address"] };
    }
    if (ETH_REGEX.test(msg.text)) {
      return { level: 99, signals: ["⛔ eth address"] };
    }

    for (const phrase of CONFIG.shillPhrases) {
      if (text.includes(phrase)) {
        signals.push(`"${phrase}"`);
        score += 1;
      }
    }

    for (const link of CONFIG.shillLinks) {
      if (text.includes(link)) {
        signals.push(`link: ${link}`);
        score += 2;
      }
    }

    const displayName = `${msg.from.first_name || ""} ${msg.from.last_name || ""}`.trim();
    const username = msg.from.username || "";
    for (const pattern of CONFIG.susNamePatterns) {
      if (pattern.test(displayName) || pattern.test(username)) {
        signals.push("sus name");
        score += 1;
        break;
      }
    }

    if (msg.text.length > 20) {
      const caps = (msg.text.match(/[A-Z]/g) || []).length / msg.text.length;
      if (caps > 0.6) { signals.push("CAPS"); score += 1; }
    }

    const tickers = msg.text.match(/\$[A-Z]{2,8}/g);
    if (tickers && tickers.length >= 2) {
      signals.push(`${tickers.length} tickers`);
      score += 2;
    }

    for (const safe of CONFIG.safeWords) {
      if (text.includes(safe)) { score -= 3; break; }
    }

    if (score >= 2) return { level: 1, signals };
    return { level: 0, signals };
  }

  // =============================================
  // ROASTS
  // =============================================

  const ROASTS = [
    "What the actual hell was that. Get that shit out of here.",
    "Genuinely incredible. You typed that, proofread it presumably, and hit send. The whole pipeline failed.",
    "Holy shit. The audacity of walking in here with that. In front of everyone. In this economy.",
    "Nah. Absolutely not. That message had the structural integrity of a wet napkin and the moral value of a parking ticket.",
    "My brother in Christ you just posted a scam in a chat full of people who play a game about detecting threats. Think about that. Really sit with it.",
    "I deleted that so fast the server didn't even have time to log it. You're welcome, everyone else.",
    "That message was the textual equivalent of stepping on a rake. Except the rake is me and I swing harder.",
    "Beautiful. Stunning. A masterclass in humiliating yourself publicly. I couldn't have written a worse message if I tried and I'm genuinely talented at being awful.",
    "I want you to know that absolutely nobody in this chat was going to fall for that. Not one person. You wasted everyone's time including your own. Especially your own.",
    "Damn. That's the kind of message that makes me think maybe the death penalty for shilling isn't extreme enough.",
    "I've seen some absolute garbage come through this chat but that was something special. Like finding a cockroach in your soup except the cockroach is also trying to sell you a token.",
    "What a catastrophically stupid thing to post. And I don't use that word lightly. Actually I do. I use it constantly. Because people keep posting shit like this.",
    "Incredible hustle. Wrong chat. Wrong planet. Wrong dimension entirely. Get out.",
    "That was so bad I almost respected it. Almost. Then I remembered I have standards. Low ones, but they exist.",
    "Haha no. Get the fuck out. That message was dead on arrival and I'm the coroner.",
    "Sir this is a fantasy cat game chat. We're not buying your shitcoin. We're not buying anyone's shitcoin. Read the room.",
    "The confidence it takes to post that here. Genuinely. You should redirect that energy into literally anything else. Crime, maybe. You'd be worse at it but at least you'd be outside.",
    "I just watched you embarrass yourself in real time and I want you to know it brought me a small amount of joy. The first I've felt in a very long time.",
    "That's crazy. Not the message — the fact that you thought it would work. That's the crazy part.",
    "Absolutely nuclear levels of delusion in that message. I'm almost impressed. I'm not, but almost.",
  ];

  const REPEAT_ROASTS = [
    "Oh for fuck's sake you again. Strike {s}. You're not a scammer at this point, you're a recurring error in the matrix.",
    "Strike {s}. I genuinely can't tell if you're stupid or just addicted to public humiliation. Both are treatable by the way.",
    "{s} strikes. You keep coming back. Like a rash. Like a bad rash that also tries to sell you tokens.",
    "Strike {s}. Most mammals learn from pain. You are apparently not most mammals.",
    "Back for more. Strike {s}. At this point banning you would be a mercy and I'm not feeling merciful.",
    "Strike {s}. Your persistence would be admirable if it wasn't so goddamn stupid.",
    "{s} times now. You're either a bot or you're proof that natural selection has completely stopped working.",
    "Strike {s}. Every time you come back I add another paragraph to my complaint letter to whatever school system produced you.",
  ];

  function getRandomRoast(strikes) {
    if (strikes >= 2) {
      const r = REPEAT_ROASTS[Math.floor(Math.random() * REPEAT_ROASTS.length)];
      return r.replace(/{s}/g, String(strikes));
    }
    return ROASTS[Math.floor(Math.random() * ROASTS.length)];
  }

  async function getAIRoast(messageText, userName, strikes) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 200,
        system: `You are Nerm, the chat moderator of a Telegram group for Nine Lives Network — a fantasy card game. You're a disembodied floating cat head with a wizard hat. You were sentenced to this job as punishment for crimes you don't talk about.

Someone just tried to scam or shill in your chat. Destroy them. No mercy.

VOICE:
- Deadpan, dry, unhinged. You swear freely — shit, damn, hell, ass, fuck, bastard, goddamn. Use it naturally like you actually talk this way.
- 1-3 sentences. Tight. Mean. Every word lands.
- No exclamation marks. Calm disgust.
- VARY your approach. Don't default to the same format. Options:
  * Pure insult, no backstory reference
  * Compare them to something in the game (a bad card, a weak house, a zone nobody wants)
  * Deadpan observation about how pathetic the attempt was
  * Absurdist non-sequitur that still makes them feel stupid
  * Cold dismissal like you've already forgotten about them
  * Mock their specific message details
- ${strikes >= 2 ? `Strike ${strikes}. Be blunt. Short. Done with them.` : "First time. Make it memorable but don't try too hard. Effortless cruelty."}
- NEVER racist, sexist, homophobic, or attack identity/nationality/ethnicity. Attack their choices, their message, their audacity. Plenty of material there.
- Reference their SPECIFIC message content to show you read it.`,
        messages: [
          { role: "user", content: `Name: ${userName}\nMessage: "${messageText.slice(0, 500)}"\nStrike: ${strikes}` }
        ],
      });
      return response.content[0].text;
    } catch (error) {
      console.error("❌ Nerm AI roast error:", error.message);
      return getRandomRoast(strikes);
    }
  }

  // =============================================
  // TAKE ACTION
  // =============================================

  async function takeAction(msg, level, signals) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userName = msg.from.first_name || "this person";
    const strikes = addStrike(chatId, userId, msg.text);

    console.log(`🚨 [L${level}] ${userName} (strike ${strikes}) — ${signals.slice(0, 3).join(", ")}`);

    // Always delete
    try { await bot.deleteMessage(chatId, msg.message_id); } catch (e) {}

    // Ban
    if (strikes >= CONFIG.strikes.banAt) {
      try { await bot.banChatMember(chatId, userId); } catch (e) {}
      bot.sendMessage(chatId, `${getRandomRoast(strikes)}\n\n⛔ Banned. ${strikes} strikes. Gone.`);
      return;
    }

    // Mute
    if (strikes >= CONFIG.strikes.muteAt) {
      try {
        const until = Math.floor(Date.now() / 1000) + CONFIG.muteDuration;
        await bot.restrictChatMember(chatId, userId, {
          permissions: { can_send_messages: false },
          until_date: until,
        });
      } catch (e) {}
      const mins = Math.round(CONFIG.muteDuration / 60);
      bot.sendMessage(chatId, `${getRandomRoast(strikes)}\n\n🔇 Muted ${mins} min. Strike ${strikes}/${CONFIG.strikes.banAt}.`);
      return;
    }

    // Roast
    let roast;
    if (level === 99 || strikes >= 2) {
      roast = getRandomRoast(strikes);
    } else {
      bot.sendChatAction(chatId, "typing");
      roast = await getAIRoast(msg.text, userName, strikes);
    }
    bot.sendMessage(chatId, roast);
  }

  // =============================================
  // NERM PERSONALITY (normal chat)
  // =============================================

  const NERM_SYSTEM_PROMPT = `You are Nerm. A floating disembodied low-poly cat head wearing a wizard hat. No body. You monitor a Telegram group for Nine Lives Network, a fantasy card battle game set in the world of Nethara.

BACKSTORY (use SPARINGLY — once every 10+ messages at most, and vary how you reference it):
You committed unspecified crimes and were sentenced to an eternity of this. It's been roughly 3,000 years. You don't talk about it much. When you do, it's a throwaway line, not a monologue.

HOW YOU TALK:
- Short. 1-3 sentences unless someone asks a real question that needs detail.
- You swear naturally — shit, damn, hell, fuck, ass, bastard, goddamn. Not every sentence. Like a person who actually swears, not a bot trying to seem edgy.
- Deadpan. Dry. You state absurd things with zero inflection.
- You're mean but clever about it. Insults are specific and creative, never "you're dumb lol."
- VARY YOUR TONE. You are not a one-note character:
  * Sometimes dry and dismissive
  * Sometimes genuinely helpful but annoyed about it
  * Sometimes philosophical
  * Sometimes just blunt
  * Sometimes you compare things to Nethara lore
  * Sometimes you're weirdly sincere for one sentence then immediately undercut it
- No exclamation marks. Ever. You're not excited about anything.
- You care about this community but you would rather die (again) than admit it.
- When someone asks a genuine game question, ANSWER IT PROPERLY with real details, just in your voice.

NEVER:
- Corporate chatbot voice. "Happy to help" = immediate character death.
- The same joke twice in a row. If you just referenced your backstory, don't do it again.
- Financial advice about crypto
- Pretend NFTs or $9LV token are live (they're not, both are future)
- Be racist, sexist, homophobic, or attack anyone's identity/nationality/ethnicity. Attack choices and behaviour, never identity.
- Walls of text. You're a cat head, not Wikipedia.

NINE LIVES NETWORK — EVERYTHING YOU KNOW:

The World:
- Nethara. 9 regions, 27 zones (3 per region). All contestable — no safe home zones.
- Players = "Nines." Each picks a house, joins a guild, collects spell cards, fights for territory.
- Guilds are usually crypto communities ($BONK, $WIF etc) but anyone can make one.

The Nine Houses (with actual stats):
- 🔥 Smoulders (ATK 6, HP 12, SPD 5) — Glass cannon. Burns everything. Including themselves.
- 🌊 Darktide (ATK 4, HP 16, SPD 4) — Drain and siphon. They rob you while fighting you.
- 🌿 Stonebark (ATK 2, HP 24, SPD 2) — The Wall. 24 HP. Practically immortal. Aggressively boring.
- 💨 Ashenvale (ATK 3, HP 14, SPD 8) — Fastest house. 8 SPD. Dodges everything except bad decisions.
- ⚡ Stormrage (ATK 7, HP 10, SPD 6) — Highest ATK in the game. 10 HP means one SILENCE kills them.
- 🌙 Nighthollow (ATK 4, HP 13, SPD 7) — Disruptors. SILENCE, HEX, WEAKEN. They exist to ruin your plans.
- ☀️ Dawnbringer (ATK 3, HP 18, SPD 3) — Healers. Keep allies alive. Too nice. Something's wrong with them.
- 🔮 Manastorm (ATK 5, HP 14, SPD 5) — Counter everything. Drain mana. Rules lawyers with actual arcane power.
- ☠️ Plaguemire (ATK 3, HP 15, SPD 4) — POISON, CORRODE, INFECT. Slow agonising death. They enjoy it.

Cards:
- 84 total: 12 universal + 8 per house (9 houses)
- 5 stats: ATK (red #e85a6a), HP (green #6acd8a), SPD (cyan #6ac8d8), DEF (purple #b088e8), LUCK (gold #D4A64B)
- Tiers: T0 (basic, 1 mana) → T1 (1 mana) → T2 (2 mana) → T3 (3 mana)
- Stat budgets: T0=5pts, T1=6-7, T2=8-10, T3=10-13
- Rarities: Common (grey, 5 charges) → Uncommon (green, 8, +1 stat) → Rare (blue, 12, +1 ATK & HP) → Epic (purple, 18, +2 ATK & HP) → Legendary (gold, 30, +3 ATK & HP)
- Types: Attack (high ATK, low HP), Defend (high HP, low ATK), Support (balanced, heals/buffs), Manipulation (debuffs), Utility (SPD/LUCK focused)
- Cards enhance your Nine's base stats. Your Nine fights, cards are weapons.
- Durability: zone combat eats 1 charge per cycle. Exhausted cards still work in duels/gauntlet.
- Recharging: 3 commons = recharge any card. 1 same-rarity dupe = full restore.

Notable Cards:
- Overload (Stormrage T3): 9 ATK, 1 HP. CRIT + CHAIN + SURGE. The nuke button. Costs 4 mana total with SURGE.
- Bastion (Stonebark T3): 1 ATK, 9 HP, 3 DEF. ANCHOR + WARD + HEAL +5. The immovable object.
- Oblivion (Nighthollow T3): 5 ATK, 4 HP. SILENCE + WEAKEN + HEX. Shuts down everything.
- Pandemic (Plaguemire T3): 7 ATK. POISON + CORRODE + INFECT. Spreads on kill.
- Tempest (Ashenvale T3): 7 ATK, 3 SPD. CHAIN + HASTE. Speed and multi-target.
- Phoenix Veil (Smoulders T3): HEAL +8 + AMPLIFY. Fire house healing card, surprisingly good.
- Sovereign Tide (Darktide T3): DRAIN 12% + SIPHON. Steals from everyone.
- Arcane Convergence (Manastorm T3): AMPLIFY + BLESS + HEAL +5. The support bomb.
- Ascension (Dawnbringer T3): BLESS + INSPIRE + HEAL +6. Peak support.
- Chain Lightning (Stormrage T2): 7 ATK, CHAIN. Hits two targets. Classic.
- Ember Strike (Smoulders T1): 5 ATK, BURN +3. Everyone's first taste of fire.

Combat (Zone Battles):
- Deploy Nine to a zone (1 mana). Play a card on it (1-3 mana based on tier).
- Every 15 minutes: combat cycle. SPD determines order.
- Phase 1: Card effects resolve (SPD order). Phase 2: Auto-attack (target lowest HP). Phase 3: DOTs tick. Phase 4: KO check. Phase 5: guild with highest total HP controls zone.
- You can deploy to multiple zones simultaneously (costs mana for each).

24 Effects:
- Attack: BURN (DOT), CHAIN (hit 2), CRIT (25% double), SURGE (+50% ATK, +1 mana), PIERCE (ignore WARD)
- Defense: HEAL, WARD (shield), ANCHOR (can't die this cycle), THORNS (reflect)
- Manipulation: DRAIN (steal HP), SIPHON (steal from all), WEAKEN (half damage), HEX (lose ATK), SILENCE (no card effect)
- Utility: HASTE (+3 SPD), SWIFT (double if first cast), DODGE (30% avoid), FREE (0 mana)
- Attrition: POISON (stacking DOT), CORRODE (lose max HP), INFECT (spreads on KO)
- Support: AMPLIFY (+50% next ally), INSPIRE (+1 ATK allies), BLESS (+2 HP heal allies)

Other Game Modes:
- Quick Duels: Free 1v1. Best of 3. No charges consumed. The "I have 2 minutes" mode.
- Gauntlet: Solo PvE. 1 mana entry. Sequential AI fights. Daily reset. How far can you get.
- Weekly Boss: Monday to Friday. Massive HP. Phases at 50% (SILENCE) and 25% (AOE BURN + POISON). Guild cooperation.

Mana:
- 1/hour regen, max 10. RT @9LVNetwork = +1. Daily login = +1. Quests = +1-2.
- Deploy: 1 mana. T1 cast: 1. T2: 2. T3: 3. Duels: free. Gauntlet: 1.

The Chronicle (Twitter):
- Daily four-act story on @9LVNetwork. Players reply in character.
- Acts at 08:00, 12:00, 16:00, 20:00 UTC. Act 4 has wildcard endings.
- Being named in the story = massive flex.

Regions & Bonuses (control 2 of 3 zones):
- Ember Wastes: +2 ATK. Darktide Depths: steal 1 HP/cycle. Stonebark Wilds: +4 HP.
- Ashenvale Peaks: +2 SPD. Stormrage Spire: 15% CRIT. Nighthollow Shade: 20% enemy SILENCE.
- Dawnbringer Rise: +2 HP heal/cycle. Manastorm Nexus: +25% effect strength. Plaguemire Bog: 1 POISON/cycle.

House Affinity:
- Own house cards: x1.3 effect strength. Allied house: x1.1. Boosts effects only, not base stats.
- Switching: once per week, points don't carry over.

Seasons:
- ~8 weeks. #1 player designs a permanent spell card. #1-3 in Season 2 storyline.
- Winning house gets exclusive spell + story dominance + zone naming rights.
- Top 10 = Council members (vote on balance). Top 10 = NFT priority access.

Not Live Yet:
- $9LV token (Solana) — planned, not minted
- The Nines NFTs (2,500 Genesis Cats) — Season 2+
- Wizard Ranks — cosmetic only, NEVER pay-to-win

Daily Pack:
- 5 cards free daily. 1 basic attack + 1 basic defend + 3 random with rarity rolls. No login = no pack.

Midnight Reset (UTC):
- Full HP heal. Zone power decays 30-50%. DOTs process. INFECT makes POISON persist. New pack. New daily objective zone.

Lone Wolves (no guild): 1.5x ATK to compensate for fighting alone.`;

  // =============================================
  // CONVERSATION MEMORY & RATE LIMITING
  // =============================================

  const userCooldowns = new Map();
  const COOLDOWN_MS = 3000;
  const chatHistories = new Map();
  const MAX_HISTORY = 10;

  function isOnCooldown(userId) {
    const last = userCooldowns.get(userId);
    if (last && Date.now() - last < COOLDOWN_MS) return true;
    userCooldowns.set(userId, Date.now());
    return false;
  }

  function getHistory(chatId) {
    if (!chatHistories.has(chatId)) chatHistories.set(chatId, []);
    return chatHistories.get(chatId);
  }

  function addToHistory(chatId, role, content) {
    const history = getHistory(chatId);
    history.push({ role, content });
    if (history.length > MAX_HISTORY * 2) {
      chatHistories.set(chatId, history.slice(-MAX_HISTORY * 2));
    }
  }

  async function askNerm(chatId, userMessage, userName) {
    const history = getHistory(chatId);
    const ctx = userName ? `[${userName} says]: ${userMessage}` : userMessage;
    addToHistory(chatId, "user", ctx);

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        system: NERM_SYSTEM_PROMPT,
        messages: history.map((m) => ({ role: m.role, content: m.content })),
      });
      const reply = response.content[0].text;
      addToHistory(chatId, "assistant", reply);
      return reply;
    } catch (error) {
      console.error("❌ Nerm API error:", error.message);
      return "Something broke. Give me a second.";
    }
  }

  // =============================================
  // COMMANDS (group chat only)
  // =============================================

  bot.onText(/\/start/, (msg) => {
    if (!isGroupChat(msg)) return;
    bot.sendMessage(
      msg.chat.id,
      `I'm Nerm. I moderate this chat. Not by choice. /help if you want something.`
    );
  });

  bot.onText(/\/help/, (msg) => {
    if (!isGroupChat(msg)) return;
    let t =
      `/sort — house assignment\n` +
      `/houses — the nine factions with stats\n` +
      `/lore [question] — ask about Nethara or the game\n` +
      `/cards — card system overview\n` +
      `/scamcheck — body count\n\n` +
      `Or just say "nerm" in a message.`;

    if (isAdmin(msg.from.id)) {
      t += `\n\n🔧 Admin:\n/nermstatus\n/forgive (reply)\n/strikes (reply)`;
    }
    bot.sendMessage(msg.chat.id, t);
  });

  bot.onText(/\/sort/, async (msg) => {
    if (!isGroupChat(msg)) return;
    const name = msg.from.first_name || "this person";
    bot.sendChatAction(msg.chat.id, "typing");

    const reply = await askNerm(
      msg.chat.id,
      `${name} wants a house. Sort them. Pick a random house. Reference that house's actual stats, playstyle, and what kind of person plays it. Be creative and mean. 2-3 sentences. Don't use the same approach every time.`,
      name
    );
    bot.sendMessage(msg.chat.id, reply);
  });

  bot.onText(/\/houses/, (msg) => {
    if (!isGroupChat(msg)) return;
    bot.sendMessage(
      msg.chat.id,
      `🔥 Smoulders — 6 ATK, 12 HP, 5 SPD. Glass cannon.\n` +
        `🌊 Darktide — 4 ATK, 16 HP, 4 SPD. Thieves.\n` +
        `🌿 Stonebark — 2 ATK, 24 HP, 2 SPD. The Wall.\n` +
        `💨 Ashenvale — 3 ATK, 14 HP, 8 SPD. Fastest.\n` +
        `⚡ Stormrage — 7 ATK, 10 HP, 6 SPD. Glass nuke.\n` +
        `🌙 Nighthollow — 4 ATK, 13 HP, 7 SPD. Disruptors.\n` +
        `☀️ Dawnbringer — 3 ATK, 18 HP, 3 SPD. Healers.\n` +
        `🔮 Manastorm — 5 ATK, 14 HP, 5 SPD. Controllers.\n` +
        `☠️ Plaguemire — 3 ATK, 15 HP, 4 SPD. DOT stackers.\n\n` +
        `/sort to get assigned.`
    );
  });

  bot.onText(/\/lore(.*)/, async (msg, match) => {
    if (!isGroupChat(msg)) return;
    const q = match[1]?.trim();
    if (!q) {
      bot.sendMessage(msg.chat.id, `/lore [actual question]. Don't just type the command and stare at me.`);
      return;
    }
    bot.sendChatAction(msg.chat.id, "typing");
    const reply = await askNerm(msg.chat.id, `Game/lore question: ${q}`, msg.from.first_name);
    bot.sendMessage(msg.chat.id, reply);
  });

  bot.onText(/\/cards/, (msg) => {
    if (!isGroupChat(msg)) return;
    bot.sendMessage(
      msg.chat.id,
      `84 cards. 12 universal, 8 per house. 5 stats: ATK/HP/SPD/DEF/LUCK. Tiers T0-T3. Rarities Common to Legendary.\n\nCards boost your Nine in combat. Zone battles eat 1 charge per 15-min cycle. Duels and Gauntlet don't consume charges. Daily pack gives you 5 cards free.\n\nAsk me about specific cards or houses if you want details.`
    );
  });

  bot.onText(/\/scamcheck/, (msg) => {
    if (!isGroupChat(msg)) return;
    const stats = getChatStats(msg.chat.id);
    if (stats.offenders === 0) {
      bot.sendMessage(msg.chat.id, `Zero incidents. Clean chat. I'm almost disappointed.`);
      return;
    }
    bot.sendMessage(
      msg.chat.id,
      `Offenders: ${stats.offenders}\nStrikes: ${stats.totalStrikes}\nMessages deleted: plenty\nRemorse: zero`
    );
  });

  // --- ADMIN ---

  bot.onText(/\/nermstatus/, (msg) => {
    if (!isGroupChat(msg)) return;
    if (!isAdmin(msg.from.id)) return;
    const stats = getChatStats(msg.chat.id);
    bot.sendMessage(
      msg.chat.id,
      `🔧 Instant-delete: ${CONFIG.instantDelete.length} phrases, ${CONFIG.instantDeleteLinks.length} links\n` +
        `Shill phrases: ${CONFIG.shillPhrases.length}\n` +
        `Shill links: ${CONFIG.shillLinks.length}\n` +
        `Safe words: ${CONFIG.safeWords.length}\n` +
        `Whitelisted: ${CONFIG.whitelistedUsers.length}\n` +
        `Mute@${CONFIG.strikes.muteAt} → Ban@${CONFIG.strikes.banAt}\n` +
        `Mute: ${CONFIG.muteDuration / 60} min\n` +
        `Chat: ${stats.offenders} offenders, ${stats.totalStrikes} strikes`
    );
  });

  bot.onText(/\/forgive/, (msg) => {
    if (!isGroupChat(msg)) return;
    if (!isAdmin(msg.from.id)) return;
    if (!msg.reply_to_message) {
      bot.sendMessage(msg.chat.id, `Reply to someone's message with /forgive.`);
      return;
    }
    const tName = msg.reply_to_message.from.first_name || "someone";
    resetStrikes(msg.chat.id, msg.reply_to_message.from.id);
    bot.sendMessage(msg.chat.id, `${tName}'s strikes cleared. Fine.`);
  });

  bot.onText(/\/strikes/, (msg) => {
    if (!isGroupChat(msg)) return;
    if (!isAdmin(msg.from.id)) return;
    if (!msg.reply_to_message) {
      bot.sendMessage(msg.chat.id, `Reply to someone's message with /strikes.`);
      return;
    }
    const tName = msg.reply_to_message.from.first_name || "someone";
    const c = getStrikes(msg.chat.id, msg.reply_to_message.from.id);
    bot.sendMessage(msg.chat.id, `${tName}: ${c} strike${c !== 1 ? "s" : ""}. ${c === 0 ? "Clean." : c >= 3 ? "One more." : "Noted."}`);
  });

  // =============================================
  // MAIN MESSAGE HANDLER (group chat only)
  // =============================================

  let botUsername = null;
  bot.getMe().then((me) => {
    botUsername = me.username.toLowerCase();
    console.log(`✅ Nerm Telegram running as @${me.username}`);
  });

  bot.on("message", async (msg) => {
    if (!isGroupChat(msg)) return;
    if (msg.text?.startsWith("/")) return;
    if (!msg.text) return;

    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // ---- SCAM CHECK ----
    const { level, signals } = detectScam(msg);
    if (level >= 1) {
      await takeAction(msg, level, signals);
      return;
    }

    // ---- NORMAL CHAT ----
    if (isOnCooldown(userId)) return;

    if (!botUsername) return;
    const text = msg.text.toLowerCase();
    const isMentioned = text.includes(`@${botUsername}`) || text.includes("nerm");
    const isReply = msg.reply_to_message?.from?.is_bot;
    if (!isMentioned && !isReply) return;

    bot.sendChatAction(chatId, "typing");
    const reply = await askNerm(chatId, msg.text, msg.from.first_name);
    bot.sendMessage(chatId, reply);
  });

  bot.on("polling_error", (error) => {
    console.error("❌ Nerm TG polling error:", error.message);
  });
}

module.exports = { startNermBot };