const { NERM_SYSTEM_PROMPT } = require('./nermBrain');
const TelegramBot = require('node-telegram-bot-api');
const Anthropic = require('@anthropic-ai/sdk');
const supabase = require('../config/supabase');

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
    banAt: 4,
  },
  muteDuration: 3600,

  // -----------------------------------------
  // 🚫 INSTANT DELETE — no scoring, no mercy
  // -----------------------------------------
  instantDelete: [
    'connect wallet',
    'connect your wallet',
    'claim your airdrop',
    'claim your tokens',
    'claim airdrop',
    'verify your wallet',
    'validate your wallet',
    'sync your wallet',
    'send me your seed',
    'seed phrase',
    'private key',
    'dm me your',
    'i am the admin',
    "i'm an admin",
    'official support',
    'tech support here',
  ],

  // -----------------------------------------
  // 🚫 INSTANT DELETE LINKS
  // -----------------------------------------
  instantDeleteLinks: ['t.me/+', 'discord.gg/', 'whatsapp.com/'],

  // -----------------------------------------
  // ⚠️ SHILL PHRASES — each match adds to score
  // Score 2+ = delete + roast
  // -----------------------------------------
  shillPhrases: [
    '100x',
    '1000x',
    '10x gem',
    '50x',
    '20x',
    'moonshot',
    'moon mission',
    'mooning',
    'next 100x',
    'easy 10x',
    'guaranteed gains',
    'to the moon',
    'sending it',
    'buy now',
    'last chance',
    "don't miss",
    'launching now',
    'just launched',
    'stealth launch',
    'presale live',
    'presale is live',
    'whitelist open',
    'get in early',
    'still early',
    'super early',
    'before it moons',
    'before pump',
    'pump incoming',
    'running out of time',
    'limited spots',
    'not financial advice but buy',
    'nfa but',
    'trust me on this',
    'insider info',
    'whale alert',
    'whales are buying',
    'smart money',
    'alpha leak',
    'ape in',
    'aping in',
    'ape this',
    'dyor but buy',
    'check out $',
    'lowcap gem',
    'low cap gem',
    'microcap gem',
    'safu',
    'based dev',
    'dev is based',
    'liquidity locked',
    'lp locked',
    'renounced',
    'audit passed',
    'kyc done',
    'dm me for',
    'dm for alpha',
    'dm for details',
    'check my bio',
    'link in bio',
    'ca:',
    'contract:',
    'contract address',
    'buy here',
  ],

  // -----------------------------------------
  // 🔗 SHILL LINKS — each match = +2 score
  // -----------------------------------------
  shillLinks: [
    'pump.fun',
    'dexscreener.com',
    'birdeye.so',
    'defined.fi',
    'dextools.io',
    'poocoin.app',
    'flooz.xyz',
    'ave.ai',
    'gmgn.ai',
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
    'nine lives',
    '9lv',
    'nethara',
    'nerm',
    'smoulders',
    'darktide',
    'stonebark',
    'ashenvale',
    'stormrage',
    'nighthollow',
    'dawnbringer',
    'manastorm',
    'plaguemire',
    'chronicle',
    'gauntlet',
    'spell card',
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
    console.log('⚠️ No TELEGRAM_BOT_TOKEN — Nerm Telegram bot disabled');
    return;
  }
  if (!ANTHROPIC_API_KEY) {
    console.log('⚠️ No ANTHROPIC_API_KEY — Nerm Telegram bot disabled');
    return;
  }

  const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  console.log('🐱 Nerm Telegram bot armed. Group chat only. Delete-first.');

  function isGroupChat(msg) {
    return msg.chat.type === 'group' || msg.chat.type === 'supergroup';
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
    chat.forEach((data) => {
      totalStrikes += data.strikes;
    });
    return { offenders: chat.size, totalStrikes };
  }

  // =============================================
  // DETECTION ENGINE
  // =============================================

  function detectScam(msg) {
    if (!msg.text) return { level: 0, signals: [] };
    if (CONFIG.whitelistedUsers.includes(msg.from.id))
      return { level: 0, signals: [] };
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
      return { level: 99, signals: ['⛔ solana address'] };
    }
    if (ETH_REGEX.test(msg.text)) {
      return { level: 99, signals: ['⛔ eth address'] };
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

    const displayName =
      `${msg.from.first_name || ''} ${msg.from.last_name || ''}`.trim();
    const username = msg.from.username || '';
    for (const pattern of CONFIG.susNamePatterns) {
      if (pattern.test(displayName) || pattern.test(username)) {
        signals.push('sus name');
        score += 1;
        break;
      }
    }

    if (msg.text.length > 20) {
      const caps = (msg.text.match(/[A-Z]/g) || []).length / msg.text.length;
      if (caps > 0.6) {
        signals.push('CAPS');
        score += 1;
      }
    }

    const tickers = msg.text.match(/\$[A-Z]{2,8}/g);
    if (tickers && tickers.length >= 2) {
      signals.push(`${tickers.length} tickers`);
      score += 2;
    }

    for (const safe of CONFIG.safeWords) {
      if (text.includes(safe)) {
        score -= 3;
        break;
      }
    }

    if (score >= 2) return { level: 1, signals };
    return { level: 0, signals };
  }

  // =============================================
  // ROASTS
  // =============================================

  const ROASTS = [
    'What the actual hell was that. Get that shit out of here.',
    'Genuinely incredible. You typed that, proofread it presumably, and hit send. The whole pipeline failed.',
    'Holy shit. The audacity of walking in here with that. In front of everyone. In this economy.',
    'Nah. Absolutely not. That message had the structural integrity of a wet napkin and the moral value of a parking ticket.',
    'My brother in Christ you just posted a scam in a chat full of people who play a game about detecting threats. Think about that. Really sit with it.',
    "I deleted that so fast the server didn't even have time to log it. You're welcome, everyone else.",
    'That message was the textual equivalent of stepping on a rake. Except the rake is me and I swing harder.',
    "Beautiful. Stunning. A masterclass in humiliating yourself publicly. I couldn't have written a worse message if I tried and I'm genuinely talented at being awful.",
    "I want you to know that absolutely nobody in this chat was going to fall for that. Not one person. You wasted everyone's time including your own. Especially your own.",
    "Damn. That's the kind of message that makes me think maybe the death penalty for shilling isn't extreme enough.",
    "I've seen some absolute garbage come through this chat but that was something special. Like finding a cockroach in your soup except the cockroach is also trying to sell you a token.",
    "What a catastrophically stupid thing to post. And I don't use that word lightly. Actually I do. I use it constantly. Because people keep posting shit like this.",
    'Incredible hustle. Wrong chat. Wrong planet. Wrong dimension entirely. Get out.',
    'That was so bad I almost respected it. Almost. Then I remembered I have standards. Low ones, but they exist.',
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
    '{s} strikes. You keep coming back. Like a rash. Like a bad rash that also tries to sell you tokens.',
    'Strike {s}. Most mammals learn from pain. You are apparently not most mammals.',
    "Back for more. Strike {s}. At this point banning you would be a mercy and I'm not feeling merciful.",
    "Strike {s}. Your persistence would be admirable if it wasn't so goddamn stupid.",
    "{s} times now. You're either a bot or you're proof that natural selection has completely stopped working.",
    'Strike {s}. Every time you come back I add another paragraph to my complaint letter to whatever school system produced you.',
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
        model: 'claude-sonnet-4-20250514',
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
          {
            role: 'user',
            content: `Name: ${userName}\nMessage: "${messageText.slice(0, 500)}"\nStrike: ${strikes}`,
          },
        ],
      });
      return response.content[0].text;
    } catch (error) {
      console.error('❌ Nerm AI roast error:', error.message);
      return getRandomRoast(strikes);
    }
  }

  // =============================================
  // TAKE ACTION
  // =============================================

  async function takeAction(msg, level, signals) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userName = msg.from.first_name || 'this person';
    const strikes = addStrike(chatId, userId, msg.text);

    // Track in user memory
    const mem = await getUserMemory(userId);
    mem.times_roasted++;
    mem.notes.push('tried to scam/shill');
    memoryCache.set(userId, mem);
    saveUserMemory(userId, mem);

    console.log(
      `🚨 [L${level}] ${userName} (strike ${strikes}) — ${signals.slice(0, 3).join(', ')}`,
    );

    // Always delete
    try {
      await bot.deleteMessage(chatId, msg.message_id);
    } catch (e) {}

    // Ban
    if (strikes >= CONFIG.strikes.banAt) {
      try {
        await bot.banChatMember(chatId, userId);
      } catch (e) {}
      bot.sendMessage(
        chatId,
        `${getRandomRoast(strikes)}\n\n⛔ Banned. ${strikes} strikes. Gone.`,
      );
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
      bot.sendMessage(
        chatId,
        `${getRandomRoast(strikes)}\n\n🔇 Muted ${mins} min. Strike ${strikes}/${CONFIG.strikes.banAt}.`,
      );
      return;
    }

    // Roast
    let roast;
    if (level === 99 || strikes >= 2) {
      roast = getRandomRoast(strikes);
    } else {
      bot.sendChatAction(chatId, 'typing');
      roast = await getAIRoast(msg.text, userName, strikes);
    }
    bot.sendMessage(chatId, roast);
  }

  const memoryCache = new Map();

  function getDefaultMemory() {
    return {
      name: null,
      house: null,
      times_roasted: 0,
      times_talked: 0,
      notes: [],
      last_seen: new Date().toISOString(),
    };
  }

  async function getUserMemory(userId) {
    // Check local cache first
    if (memoryCache.has(userId)) return memoryCache.get(userId);

    // Try Supabase
    try {
      const { data, error } = await supabase
        .from('nerm_user_memory')
        .select('*')
        .eq('telegram_user_id', userId)
        .single();

      if (data && !error) {
        const mem = {
          name: data.name,
          house: data.house,
          times_roasted: data.times_roasted || 0,
          times_talked: data.times_talked || 0,
          notes: data.notes || [],
          last_seen: data.last_seen,
        };
        memoryCache.set(userId, mem);
        return mem;
      }
    } catch (e) {
      console.error('⚠️ Nerm memory read error:', e.message);
    }

    // New user — create default
    const mem = getDefaultMemory();
    memoryCache.set(userId, mem);
    return mem;
  }

  async function saveUserMemory(userId, mem) {
    try {
      await supabase.from('nerm_user_memory').upsert(
        {
          telegram_user_id: userId,
          name: mem.name,
          house: mem.house,
          times_roasted: mem.times_roasted,
          times_talked: mem.times_talked,
          notes: (mem.notes || []).slice(-5),
          last_seen: new Date().toISOString(),
        },
        { onConflict: 'telegram_user_id' },
      );
    } catch (e) {
      console.error('⚠️ Nerm memory save error:', e.message);
    }
  }

  async function updateUserMemory(userId, userName, messageText) {
    const mem = await getUserMemory(userId);
    mem.name = userName;
    mem.times_talked++;
    mem.last_seen = new Date().toISOString();

    const text = (messageText || '').toLowerCase();
    const houses = [
      'smoulders',
      'darktide',
      'stonebark',
      'ashenvale',
      'stormrage',
      'nighthollow',
      'dawnbringer',
      'manastorm',
      'plaguemire',
    ];
    for (const h of houses) {
      if (
        text.includes(`i'm ${h}`) ||
        text.includes(`i am ${h}`) ||
        text.includes(`my house is ${h}`)
      ) {
        mem.house = h;
      }
    }

    if (mem.notes.length > 5) mem.notes.shift();
    memoryCache.set(userId, mem);

    // Save to Supabase (non-blocking — don't await in hot path)
    saveUserMemory(userId, mem);

    return mem;
  }

  async function getMemoryContext(userId) {
    const mem = await getUserMemory(userId);
    if (mem.times_talked <= 1) return '';

    let parts = [];
    if (mem.house) parts.push(`house: ${mem.house}`);
    parts.push(`talked ${mem.times_talked} times`);
    if (mem.times_roasted > 0) parts.push(`roasted ${mem.times_roasted}x`);
    if (mem.notes.length > 0)
      parts.push(`notes: ${mem.notes.slice(-2).join('; ')}`);
    return `\n[YOU REMEMBER THIS PERSON: ${parts.join(', ')}]`;
  }

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

  async function askNerm(chatId, userMessage, userName, userId) {
    const history = getHistory(chatId);

    // Update and inject user memory
    if (userId) await updateUserMemory(userId, userName, userMessage);
    const memCtx = userId ? await getMemoryContext(userId) : '';

    const ctx = userName
      ? `[${userName} says]: ${userMessage}${memCtx}`
      : userMessage;
    addToHistory(chatId, 'user', ctx);

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 250,
        system: NERM_SYSTEM_PROMPT,
        messages: history.map((m) => ({ role: m.role, content: m.content })),
      });
      const reply = response.content[0].text;
      addToHistory(chatId, 'assistant', reply);
      return reply;
    } catch (error) {
      console.error('❌ Nerm API error:', error.message);
      return 'something broke. give me a second.';
    }
  }

  // =============================================
  // COMMANDS (group chat only)
  // =============================================

  bot.onText(/\/start/, (msg) => {
    if (!isGroupChat(msg)) return;
    bot.sendMessage(
      msg.chat.id,
      `I'm Nerm. I moderate this chat. Not by choice. /help if you want something.`,
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
    const name = msg.from.first_name || 'this person';
    bot.sendChatAction(msg.chat.id, 'typing');

    const reply = await askNerm(
      msg.chat.id,
      `${name} wants a house. Sort them. Pick a random house. Reference that house's actual stats, playstyle, and what kind of person plays it. Be creative and mean. 2-3 sentences. Don't use the same approach every time.`,
      name,
      msg.from.id,
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
        `/sort to get assigned.`,
    );
  });

  bot.onText(/\/lore(.*)/, async (msg, match) => {
    if (!isGroupChat(msg)) return;
    const q = match[1]?.trim();
    if (!q) {
      bot.sendMessage(
        msg.chat.id,
        `/lore [actual question]. Don't just type the command and stare at me.`,
      );
      return;
    }
    bot.sendChatAction(msg.chat.id, 'typing');
    const reply = await askNerm(
      msg.chat.id,
      `Game/lore question: ${q}`,
      msg.from.first_name,
      msg.from.id,
    );
    bot.sendMessage(msg.chat.id, reply);
  });

  bot.onText(/\/cards/, (msg) => {
    if (!isGroupChat(msg)) return;
    bot.sendMessage(
      msg.chat.id,
      `84 cards. 12 universal, 8 per house. 5 stats: ATK/HP/SPD/DEF/LUCK.\n\nNo tiers. No mana costs. Rarity determines power: Common (6 stat pts) → Legendary (10 stat pts). Effects are the real identity.\n\n3-card loadout per zone. Sharpness degrades each cycle — sharpen by feeding dupes. Cards never disappear.\n\nAsk me about specific cards or houses.`,
    );
  });

  bot.onText(/\/scamcheck/, (msg) => {
    if (!isGroupChat(msg)) return;
    const stats = getChatStats(msg.chat.id);
    if (stats.offenders === 0) {
      bot.sendMessage(
        msg.chat.id,
        `Zero incidents. Clean chat. I'm almost disappointed.`,
      );
      return;
    }
    bot.sendMessage(
      msg.chat.id,
      `Offenders: ${stats.offenders}\nStrikes: ${stats.totalStrikes}\nMessages deleted: plenty\nRemorse: zero`,
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
        `Chat: ${stats.offenders} offenders, ${stats.totalStrikes} strikes`,
    );
  });

  bot.onText(/\/forgive/, (msg) => {
    if (!isGroupChat(msg)) return;
    if (!isAdmin(msg.from.id)) return;
    if (!msg.reply_to_message) {
      bot.sendMessage(msg.chat.id, `Reply to someone's message with /forgive.`);
      return;
    }
    const tName = msg.reply_to_message.from.first_name || 'someone';
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
    const tName = msg.reply_to_message.from.first_name || 'someone';
    const c = getStrikes(msg.chat.id, msg.reply_to_message.from.id);
    bot.sendMessage(
      msg.chat.id,
      `${tName}: ${c} strike${c !== 1 ? 's' : ''}. ${c === 0 ? 'Clean.' : c >= 3 ? 'One more.' : 'Noted.'}`,
    );
  });

  // =============================================
  // RANDOM ENGAGEMENT CONFIG
  // =============================================

  const RANDOM_REPLY_CHANCE = 0.07; // 7% on any normal message
  const GAME_TOPIC_REPLY_CHANCE = 0.25; // 25% if they mention game stuff

  const GAME_TRIGGERS = [
    'deploy',
    'zone',
    'sharpness',
    'loadout',
    'card',
    'cards',
    'pack',
    'legendary',
    'epic',
    'rare',
    'common',
    'burn',
    'silence',
    'poison',
    'anchor',
    'ward',
    'drain',
    'smoulders',
    'darktide',
    'stonebark',
    'ashenvale',
    'stormrage',
    'nighthollow',
    'dawnbringer',
    'manastorm',
    'plaguemire',
    'chronicle',
    'gauntlet',
    'duel',
    'boss',
    'guild',
    'nine lives',
    '9lv',
    'nethara',
    'cycle',
  ];

  function hasGameTopic(text) {
    if (!text) return false;
    const lower = text.toLowerCase();
    return GAME_TRIGGERS.some((t) => lower.includes(t));
  }

  function shouldRandomReply(text) {
    if (hasGameTopic(text)) return Math.random() < GAME_TOPIC_REPLY_CHANCE;
    return Math.random() < RANDOM_REPLY_CHANCE;
  }

  // Prevent random reply spam — 1 min cooldown
  let lastRandomReply = 0;
  const RANDOM_COOLDOWN_MS = 60000;

  // =============================================
  // MAIN MESSAGE HANDLER
  // =============================================

  let botUsername = null;
  bot.getMe().then((me) => {
    botUsername = me.username.toLowerCase();
    console.log(`✅ Nerm Telegram running as @${me.username}`);
  });

  bot.on('message', async (msg) => {
    if (!isGroupChat(msg)) return;
    if (msg.text?.startsWith('/')) return;
    if (!msg.text) return;

    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userName = msg.from.first_name || 'someone';

    // ---- SCAM CHECK ----
    const { level, signals } = detectScam(msg);
    if (level >= 1) {
      await takeAction(msg, level, signals);
      return;
    }

    // ---- COOLDOWN ----
    if (isOnCooldown(userId)) return;
    if (!botUsername) return;

    const text = msg.text.toLowerCase();
    const isMentioned =
      text.includes(`@${botUsername}`) || text.includes('nerm');
    const isReply = msg.reply_to_message?.from?.is_bot;

    // Direct mention or reply — always respond
    if (isMentioned || isReply) {
      bot.sendChatAction(chatId, 'typing');
      const reply = await askNerm(chatId, msg.text, userName, userId);
      bot.sendMessage(chatId, reply);
      return;
    }

    // Random butt-in — sometimes Nerm just has something to say
    if (shouldRandomReply(msg.text)) {
      if (Date.now() - lastRandomReply < RANDOM_COOLDOWN_MS) return;
      lastRandomReply = Date.now();

      bot.sendChatAction(chatId, 'typing');

      const buttInContext = hasGameTopic(msg.text)
        ? `[${userName} is discussing game stuff — not talking to you. Butt in with a short opinon or observation. Don't explain mechanics — react like a person.]: "${msg.text}"`
        : `[${userName} said something in chat — not to you. You overheard it and have a reaction. Be yourself — mean, dry, funny. Do NOT bring up the game or card mechanics. Just react to what they said like a weird bitter cat would.]: "${msg.text}"`;

      const reply = await askNerm(chatId, buttInContext, userName, userId);
      bot.sendMessage(chatId, reply, { reply_to_message_id: msg.message_id });
      return;
    }
  });

  bot.on('polling_error', (error) => {
    console.error('❌ Nerm TG polling error:', error.message);
  });
}

module.exports = { startNermBot };
