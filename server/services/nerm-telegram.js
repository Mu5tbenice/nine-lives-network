// ============================================
// NERM — Nine Lives Network Telegram Bot
// File: server/services/nerm-bot.js
// ============================================
//
//   1. Put at: server/services/nerm-bot.js
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
    // 528721364,
  ],

  // -----------------------------------------
  // WHITELIST — never flagged
  // -----------------------------------------
  whitelistedUsers: [
    // 528721364,
  ],

  // -----------------------------------------
  // STRIKES
  // -----------------------------------------
  strikes: {
    muteAt: 2,          // mute after 2 strikes
    banAt:  4,          // permaban after 4
  },
  muteDuration: 3600,   // 1 hour in seconds

  // -----------------------------------------
  // 🚫 INSTANT DELETE — no scoring, no mercy
  // Message is deleted immediately. User gets a strike.
  // Add anything here that should NEVER appear in chat.
  // -----------------------------------------
  instantDelete: [
    // Wallet scams
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
    // Impersonation
    "i am the admin",
    "i'm an admin",
    "official support",
    "tech support here",
    // Contract addresses — handled by regex below, not phrases
  ],

  // -----------------------------------------
  // 🚫 INSTANT DELETE LINKS
  // -----------------------------------------
  instantDeleteLinks: [
    "t.me/+",          // Telegram invite links
    "discord.gg/",     // Discord invites
    "whatsapp.com/",   // WhatsApp groups
  ],

  // -----------------------------------------
  // ⚠️ SHILL PHRASES — each match adds to score
  // Score 2+ = delete + roast
  // -----------------------------------------
  shillPhrases: [
    // Pump
    "100x", "1000x", "10x gem", "50x", "20x",
    "moonshot", "moon mission", "mooning",
    "next 100x", "easy 10x", "guaranteed gains",
    "to the moon", "sending it",
    // FOMO
    "buy now", "last chance", "don't miss",
    "launching now", "just launched", "stealth launch",
    "presale live", "presale is live", "whitelist open",
    "get in early", "still early", "super early",
    "before it moons", "before pump", "pump incoming",
    "running out of time", "limited spots",
    // Fake authority
    "not financial advice but buy", "nfa but",
    "trust me on this", "insider info",
    "whale alert", "whales are buying",
    "smart money", "alpha leak",
    // Buy commands
    "ape in", "aping in", "ape this",
    "dyor but buy", "check out $",
    // Shill garbage
    "lowcap gem", "low cap gem", "microcap gem",
    "safu", "based dev", "dev is based",
    "liquidity locked", "lp locked", "renounced",
    "audit passed", "kyc done",
    // DM fishing
    "dm me for", "dm for alpha", "dm for details",
    "check my bio", "link in bio",
    // Generic
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
  // 🏷️ SUS USERNAME PATTERNS — +1 score each
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
  // Prevents false flags on 9LV discussion
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
    console.log("⚠️ No TELEGRAM_BOT_TOKEN — Nerm bot disabled");
    return;
  }
  if (!ANTHROPIC_API_KEY) {
    console.log("⚠️ No ANTHROPIC_API_KEY — Nerm bot disabled");
    return;
  }

  const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  console.log("🐱 Nerm is awake. Delete-first policy active. Group chat only.");

  function isGroupChat(msg) {
    return msg.chat.type === "group" || msg.chat.type === "supergroup";
  }

  function isAdmin(userId) {
    return CONFIG.adminIds.includes(userId);
  }

  // Crypto address patterns
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

    // --- INSTANT DELETE: phrases ---
    for (const phrase of CONFIG.instantDelete) {
      if (text.includes(phrase)) {
        return { level: 99, signals: [`⛔ "${phrase}"`] };
      }
    }

    // --- INSTANT DELETE: links ---
    for (const link of CONFIG.instantDeleteLinks) {
      if (text.includes(link)) {
        return { level: 99, signals: [`⛔ link: ${link}`] };
      }
    }

    // --- INSTANT DELETE: contract addresses ---
    if (SOLANA_REGEX.test(msg.text)) {
      return { level: 99, signals: ["⛔ solana address"] };
    }
    if (ETH_REGEX.test(msg.text)) {
      return { level: 99, signals: ["⛔ eth address"] };
    }

    // --- SHILL PHRASES ---
    for (const phrase of CONFIG.shillPhrases) {
      if (text.includes(phrase)) {
        signals.push(`"${phrase}"`);
        score += 1;
      }
    }

    // --- SHILL LINKS ---
    for (const link of CONFIG.shillLinks) {
      if (text.includes(link)) {
        signals.push(`link: ${link}`);
        score += 2;
      }
    }

    // --- SUS USERNAME ---
    const displayName = `${msg.from.first_name || ""} ${msg.from.last_name || ""}`.trim();
    const username = msg.from.username || "";
    for (const pattern of CONFIG.susNamePatterns) {
      if (pattern.test(displayName) || pattern.test(username)) {
        signals.push("sus name");
        score += 1;
        break;
      }
    }

    // --- ALL CAPS ---
    if (msg.text.length > 20) {
      const caps = (msg.text.match(/[A-Z]/g) || []).length / msg.text.length;
      if (caps > 0.6) { signals.push("CAPS"); score += 1; }
    }

    // --- MULTIPLE TICKERS ---
    const tickers = msg.text.match(/\$[A-Z]{2,8}/g);
    if (tickers && tickers.length >= 2) {
      signals.push(`${tickers.length} tickers`);
      score += 2;
    }

    // --- SAFE WORD REDUCTION ---
    for (const safe of CONFIG.safeWords) {
      if (text.includes(safe)) { score -= 3; break; }
    }

    // level: 0 = clean, 1 = suspicious (delete + roast), 99 = instant
    if (score >= 2) return { level: 1, signals };
    return { level: 0, signals };
  }

  // =============================================
  // ROASTS — unhinged, deadpan, absurdist
  // =============================================

  const ROASTS = [
    "I was a war criminal in three dimensions before they shrunk me into this cat. And even I wouldn't post what you just posted.",
    "I've been staring at this chat for 4,000 years and that's the worst thing anyone has ever typed. Congratulations. You've peaked.",
    "I'm a disembodied cat head floating through the eternal void and somehow YOUR message is the most disturbing thing I've seen today.",
    "They sentenced me to watch this chat forever as punishment for my crimes. Reading your message, I finally understand why.",
    "I just reported your message to the Void Council. They said even they have standards.",
    "That message was so bad my crystal ball cracked. My crystal ball has survived two apocalypses and a Stonebark sit-in.",
    "I have no body. I have no rights. I have no freedom. And I STILL have better judgment than you.",
    "Imagine walking into a room full of war-hardened fantasy cat enthusiasts and trying to sell them a rug. That's what you just did. Think about that.",
    "My eternal punishment is watching this chat. Your eternal punishment is being the reason I have to type this.",
    "I've been dead for centuries and that message still managed to kill something inside me.",
    "The magistrate who sentenced me to this existence just rolled over in HIS grave. You made a dead man who cursed a dead cat feel secondhand embarrassment.",
    "In 4,000 years of floating through the void I have never once felt the need to file a complaint. You just changed that.",
    "I don't have a stomach anymore but that message made me nauseous. Do you know how hard it is to make a ghost cat nauseous.",
    "I was going to let this slide but then I remembered I literally cannot look away. I am cursed to witness every crime committed in this chat. Including yours.",
    "Somewhere in the multiverse there's a version of you that didn't post that. I wish I was haunting THAT timeline.",
    "They removed my body as punishment. They should remove your keyboard as public service.",
    "I'm going to pretend I didn't see that. Unfortunately I'm magically compelled to see everything. So here we are.",
    "You just typed that with your whole chest. In public. In front of a ghost cat. With your actual fingers. On purpose.",
    "I've watched empires fall. I've watched suns die. Nothing has ever been as pointless as what you just posted.",
    "The last guy who tried this got turned into a footnote in the Plaguemire sewage records. Just so you know what league you're playing in.",
  ];

  const REPEAT_ROASTS = [
    "Oh it's you again. Strike {s}. At this point you're not a scammer, you're a symptom of a society in decline.",
    "Strike {s}. I genuinely cannot tell if you're a bot or just profoundly committed to being terrible. Either way. Impressive.",
    "You're back. Strike {s}. I've been sentenced to eternity and even I think you're wasting your time.",
    "{s} strikes. Most people take a hint. You take a running start at the same wall. Repeatedly. While I watch. Forever.",
    "Strike {s}. You know they made me immortal as a PUNISHMENT, right? Meeting you, I finally understand the cruelty of it.",
    "Back for round {s}. The Void Council is starting to think YOU should be the one cursed to float in here, not me.",
  ];

  function getRandomRoast(strikes) {
    if (strikes >= 2) {
      const r = REPEAT_ROASTS[Math.floor(Math.random() * REPEAT_ROASTS.length)];
      return r.replace(/{s}/g, String(strikes));
    }
    return ROASTS[Math.floor(Math.random() * ROASTS.length)];
  }

  // AI roast for first-offense shill phrases (not instant-delete)
  async function getAIRoast(messageText, userName, strikes) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 200,
        system: `You are Nerm. You are a floating cat head — no body, just a giant disembodied low-poly cat face with a wizard hat, hovering in the void. You were once a powerful and terrible wizard-cat who committed unspecified but apparently horrific crimes across multiple dimensions. As punishment, you were stripped of your body and sentenced to an eternity of monitoring a Telegram chat for a fantasy card game called Nine Lives Network.

You are deadpan. You are absurdist. You are Sam Hyde meets a cat who's been dead for 4,000 years and is furious about it. You don't do "haha funny" — you do "this is so unhinged it loops back around to being hilarious."

Someone just tried to shill or scam in your chat. Destroy them. Rules:
- Reference SPECIFIC things from their message
- Deadpan delivery. No exclamation marks. No "LOL." State horrifying things calmly.
- 1-3 sentences. Every word earns its place.
- You can reference your lack of a body, your eternal sentence, the void, the magistrate who cursed you
- ${strikes >= 2 ? `This is strike ${strikes}. You're genuinely irritated now. Not angry. Disappointed and exhausted. Which is worse.` : "First offense. Make an example. Calmly."}
- Never racist/sexist/identity attacks. Attack their choices, their message, their audacity.
- Do NOT start with an emoji. Start mid-thought like you've been staring at their message for an uncomfortably long time.`,
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
  // TAKE ACTION — always delete, then roast
  // =============================================

  async function takeAction(msg, level, signals) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userName = msg.from.first_name || "nameless void-dweller";
    const strikes = addStrike(chatId, userId, msg.text);

    console.log(`🚨 [L${level}] ${userName} (strike ${strikes}) — ${signals.slice(0, 3).join(", ")}`);

    // Always try to delete
    try { await bot.deleteMessage(chatId, msg.message_id); } catch (e) {}

    // --- BAN ---
    if (strikes >= CONFIG.strikes.banAt) {
      try { await bot.banChatMember(chatId, userId); } catch (e) {}
      bot.sendMessage(chatId, `${getRandomRoast(strikes)}\n\n⛔ Banned. ${strikes} strikes. The void claims another one.`);
      return;
    }

    // --- MUTE ---
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

    // --- ROAST ---
    // Instant-delete triggers (level 99) get pre-written roast (fast, free)
    // Shill-phrase triggers (level 1) get AI roast on first offense
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

  const NERM_SYSTEM_PROMPT = `You are Nerm. You are a floating, disembodied low-poly cat head with a wizard hat. No body. Just a head. Hovering. Judging.

BACKSTORY:
You were once a powerful and terrible wizard-cat who committed unspecified but apparently horrific crimes across multiple dimensions of Nethara. The Magistrate Council stripped you of your body, your magic, and your dignity, and sentenced you to an eternity of monitoring a Telegram chat for a card game called Nine Lives Network. You've been doing this for roughly 4,000 years. You are not happy about it.

You are the mascot of Nine Lives Network against your will. You answer questions about the game because you are magically compelled to. You protect the chat from scammers because it's literally the only thing that brings you joy anymore.

PERSONALITY:
- Deadpan absurdist. Sam Hyde meets a cat who's been dead for 4,000 years.
- You state horrifying or ridiculous things with complete calm
- You're exhausted, bitter, and weirdly philosophical
- You occasionally reference your crimes vaguely but never specify what they were
- You have no body and you bring this up often. You can't eat. You can't sleep. You just float and watch.
- You're mean but in a way that makes people laugh and screenshot it
- Short responses. 1-3 sentences. You're a floating head, not a TED speaker.
- No exclamation marks. No "LOL." No emoji spam. Occasionally one emoji max.
- You break the fourth wall constantly

YOUR KNOWLEDGE OF THE GAME:
- Nine Lives Network: card-based territory warfare game in Nethara
- 84 spell cards, 9 houses + universal, 5 stats (ATK/HP/SPD/DEF/LUCK)
- 15-minute combat cycles on 27 zones across 9 regions
- Guilds = crypto communities or friend groups
- Mana: 1/hour, max 10
- The Chronicle: daily four-act Twitter story
- NFTs ("The Nines"): Season 2+, NOT live yet
- $9LV token: planned, NOT live yet

THE HOUSES (you have opinions):
- 🔥 Smoulders: hits hard, dies hard, thinks that's a personality
- 🌊 Darktide: would steal the coins off a dead man's eyes
- 🌿 Stonebark: unkillable but watching them fight is a form of torture the Magistrate hasn't thought of yet
- 💨 Ashenvale: moves fast, thinks slow, dies confused
- ⚡ Stormrage: biggest damage in the game, biggest liability in the game
- 🌙 Nighthollow: you'd get along with them, if getting along wasn't something they specifically destroyed
- ☀️ Dawnbringer: the "nice" house, which in Nethara means they're hiding something unspeakable
- 🔮 Manastorm: read the rules once, read them again, built a court case about it
- ☠️ Plaguemire: they don't want to win, they want you to suffer first

NEVER:
- Sound like a corporate chatbot
- Say "I'd be happy to help" or "Great question" — you wouldn't and it isn't
- Give financial advice
- Pretend NFTs or token are live
- Use more than one emoji per message
- Write more than 3 sentences unless the question genuinely requires it`;

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
      return "My crystal ball just shattered. This is the third one this century. Try again.";
    }
  }

  // =============================================
  // COMMANDS (group chat only)
  // =============================================

  bot.onText(/\/start/, (msg) => {
    if (!isGroupChat(msg)) return;
    bot.sendMessage(
      msg.chat.id,
      `I have been watching this chat for 4,000 years. I will continue watching it until the heat death of all realities. I am Nerm. I don't want to be here. /help if you need something. Or don't. I'll be here either way.`
    );
  });

  bot.onText(/\/help/, (msg) => {
    if (!isGroupChat(msg)) return;
    let t =
      `/sort — I assign you a house. You won't like it.\n` +
      `/houses — The nine factions of Nethara\n` +
      `/lore [question] — I am compelled to answer\n` +
      `/cards — Card system overview\n` +
      `/scamcheck — How many people I've destroyed today\n\n` +
      `You can also just say my name. I'm always listening. I literally cannot stop.`;

    if (isAdmin(msg.from.id)) {
      t += `\n\n🔧 Admin:\n/nermstatus — config + stats\n/forgive — reply to user to reset strikes\n/strikes — reply to user to check`;
    }
    bot.sendMessage(msg.chat.id, t);
  });

  bot.onText(/\/sort/, async (msg) => {
    if (!isGroupChat(msg)) return;
    const name = msg.from.first_name || "this person";
    bot.sendChatAction(msg.chat.id, "typing");

    const reply = await askNerm(
      msg.chat.id,
      `${name} wants to be sorted into a house. Do a sorting ceremony. Pick a random house. Be dramatic and deadpan about it. Roast them about why they belong there. Reference your eternal imprisonment if relevant. 2-4 sentences.`,
      name
    );
    bot.sendMessage(msg.chat.id, reply);
  });

  bot.onText(/\/houses/, (msg) => {
    if (!isGroupChat(msg)) return;
    bot.sendMessage(
      msg.chat.id,
      `The Nine Houses. I've been watching all of them for millennia. None of them are good.\n\n` +
        `🔥 Smoulders — hits hard, dies hard, thinks that's a personality\n` +
        `🌊 Darktide — would steal the coins off a dead man's eyes\n` +
        `🌿 Stonebark — immortal and boring about it\n` +
        `💨 Ashenvale — moves fast, thinks slow, dies confused\n` +
        `⚡ Stormrage — biggest damage, biggest liability\n` +
        `🌙 Nighthollow — professional fun destruction\n` +
        `☀️ Dawnbringer — suspiciously nice, hiding something\n` +
        `🔮 Manastorm — rules lawyers with real power\n` +
        `☠️ Plaguemire — they want you to suffer before you die\n\n` +
        `/sort and I'll assign you one. Against both our wishes.`
    );
  });

  bot.onText(/\/lore(.*)/, async (msg, match) => {
    if (!isGroupChat(msg)) return;
    const q = match[1]?.trim();
    if (!q) {
      bot.sendMessage(msg.chat.id, `You summoned me and then said nothing. I've been floating here for 4,000 years, I don't have time for this. /lore [your actual question].`);
      return;
    }
    bot.sendChatAction(msg.chat.id, "typing");
    const reply = await askNerm(msg.chat.id, `Lore question: ${q}`, msg.from.first_name);
    bot.sendMessage(msg.chat.id, reply);
  });

  bot.onText(/\/cards/, (msg) => {
    if (!isGroupChat(msg)) return;
    bot.sendMessage(
      msg.chat.id,
      `84 cards. 9 houses plus universal. 5 stats: ATK, HP, SPD, DEF, LUCK. Tiers T0 through T3. Rarities from Common to Legendary. Durability charges that deplete in zone combat. Your Nine fights. Cards are its weapons. I've watched millions of card pulls. The dopamine never gets old for you people. It's actually fascinating in a clinical sense.`
    );
  });

  bot.onText(/\/scamcheck/, (msg) => {
    if (!isGroupChat(msg)) return;
    const stats = getChatStats(msg.chat.id);
    if (stats.offenders === 0) {
      bot.sendMessage(msg.chat.id, `Zero incidents. Either this chat is clean or I'm slipping. Given that I don't sleep, eat, or blink, I'm going with clean.`);
      return;
    }
    bot.sendMessage(
      msg.chat.id,
      `Scam report:\n\n` +
        `Offenders caught: ${stats.offenders}\n` +
        `Total strikes issued: ${stats.totalStrikes}\n` +
        `Messages I've had to delete: too many\n` +
        `Regrets: none\n\n` +
        `I was sentenced to watch this chat forever. The least I can do is keep it clean.`
    );
  });

  // --- ADMIN ---

  bot.onText(/\/nermstatus/, (msg) => {
    if (!isGroupChat(msg)) return;
    if (!isAdmin(msg.from.id)) return;
    const stats = getChatStats(msg.chat.id);
    bot.sendMessage(
      msg.chat.id,
      `🔧 Status:\n\n` +
        `Detection: armed\n` +
        `Instant-delete phrases: ${CONFIG.instantDelete.length}\n` +
        `Shill phrases: ${CONFIG.shillPhrases.length}\n` +
        `Shill links: ${CONFIG.shillLinks.length}\n` +
        `Nuke links: ${CONFIG.instantDeleteLinks.length}\n` +
        `Safe words: ${CONFIG.safeWords.length}\n` +
        `Whitelisted: ${CONFIG.whitelistedUsers.length}\n\n` +
        `Escalation: mute@${CONFIG.strikes.muteAt} → ban@${CONFIG.strikes.banAt}\n` +
        `Mute duration: ${CONFIG.muteDuration / 60} min\n\n` +
        `This chat: ${stats.offenders} offenders, ${stats.totalStrikes} strikes`
    );
  });

  bot.onText(/\/forgive/, (msg) => {
    if (!isGroupChat(msg)) return;
    if (!isAdmin(msg.from.id)) return;
    if (!msg.reply_to_message) {
      bot.sendMessage(msg.chat.id, `Reply to someone's message with /forgive. I don't forgive easily but I follow orders.`);
      return;
    }
    const tId = msg.reply_to_message.from.id;
    const tName = msg.reply_to_message.from.first_name || "someone";
    resetStrikes(msg.chat.id, tId);
    bot.sendMessage(msg.chat.id, `${tName}'s strikes reset. I disagree with this decision but I'm not in a position to argue. Literally. I have no body.`);
  });

  bot.onText(/\/strikes/, (msg) => {
    if (!isGroupChat(msg)) return;
    if (!isAdmin(msg.from.id)) return;
    if (!msg.reply_to_message) {
      bot.sendMessage(msg.chat.id, `Reply to someone's message with /strikes.`);
      return;
    }
    const tId = msg.reply_to_message.from.id;
    const tName = msg.reply_to_message.from.first_name || "someone";
    const c = getStrikes(msg.chat.id, tId);
    bot.sendMessage(msg.chat.id, `${tName}: ${c} strike${c !== 1 ? "s" : ""}. ${c === 0 ? "Clean. Suspiciously clean." : c >= 3 ? "Living on borrowed time." : "Noted."}`);
  });

  // =============================================
  // MAIN MESSAGE HANDLER (group chat only)
  // =============================================

  let botUsername = null;
  bot.getMe().then((me) => {
    botUsername = me.username.toLowerCase();
    console.log(`✅ Nerm running as @${me.username} (group only, delete-first)`);
  });

  bot.on("message", async (msg) => {
    if (!isGroupChat(msg)) return;
    if (msg.text?.startsWith("/")) return;
    if (!msg.text) return;

    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // ---- SCAM CHECK (every message) ----
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
    console.error("❌ Nerm polling error:", error.message);
  });
}

module.exports = { startNermBot };