/**
 * Nine Lives Network — Narrative Engine v2
 * 
 * 40 Story Narratives in new 4-tweet format
 * Tweet 1: Pre-written hook (edgy, crypto Twitter humor)
 * Tweets 2-4: AI-generated at runtime using prompts + live data
 * 
 * Image naming: {id}.1.png through {id}.4.png
 * 
 * Houses, zones, and nerm hooks are in separate files:
 * - houses-zones.js
 * - nerm-hooks.js
 */

const narratives = [

  // ===========================
  // CONSPIRACY & POLITICAL (1-10)
  // ===========================

  {
    id: 1,
    title: "The Fall of the Twin Spires",
    theme: "Conspiracy parody — two ancient crystal towers collapsed simultaneously under suspicious circumstances. Communities race to salvage scrolls from the rubble before the Council seals the site.",
    tweet_1: "🚨 BREAKING: Two ancient crystal spires collapsed at dawn. Both of them. Same morning.\n\nThe Arcane Council says a single rogue fire spell brought them down — both reinforced towers, into their own foundations.\n\nThe library vaults may still be intact beneath the dust. Scrolls are scattered everywhere.\n\nWhich community recovers the most knowledge?\nRally your people — reply to join the raid! 🐱‍👤",
    tweet_2_prompt: "Continue the Twin Spires collapse story. The official report says one wizard acting alone caused it — play up how suspicious this is. Mention that witnesses have been 'relocated for their safety' and a third spire nearby has been cordoned off. Include the live community standings as a scoreboard showing who's recovering the most scrolls. Keep the conspiratorial, deadpan tone. Short story section, then scoreboard.",
    tweet_3_prompt: "Escalate the conspiracy — the investigation concluded suspiciously fast, before lunch. The third spire is 'fine' but nobody can visit it. Create urgency: the Council is about to seal the site permanently. Show updated standings. If it's close between communities, play up the tension. Time is running out to salvage knowledge.",
    tweet_4_prompt: "Resolve the story — excavation complete, the site has been sealed by Council order. Announce the winning community as the one that recovered the most scrolls and earned rebuilding rights. The official story is now carved into a memorial stone in very large letters. The investigation concluded before lunch. Show final scoreboard, name the MVP. End with 'Full intel at 9lv.net' — keep the conspiracy deadpan tone.",
    images: ["1.1.png", "1.2.png", "1.3.png", "1.4.png"]
  },

  {
    id: 2,
    title: "The Chambers Keep Incident",
    theme: "Epstein parody — the most important prisoner in Avaloris was found dead under impossible circumstances. His list of powerful names has gone missing. Communities race to find the list before it disappears forever.",
    tweet_1: "🚨 The most important prisoner in Avaloris was found dead in his cell.\n\nBoth anti-magic wards failed simultaneously. Both guards fell asleep at the same hour. Surveillance crystals went dark for exactly eleven minutes.\n\nHe had a list of names. The list is missing.\n\nWhich community finds the list first?\nRally your people — reply to join the raid! 🐱‍👤",
    tweet_2_prompt: "Continue the Chambers Keep story. Noble houses are suddenly very interested in 'prison reform' — several have made generous donations to the guard captain. A torn page with two initials was found. A second prisoner has requested transfer to a more public cell because 'he keeps records too.' Include live community standings as a scoreboard of who's gathering the most intelligence. Conspiratorial and darkly funny tone.",
    tweet_3_prompt: "Build urgency — the Council is about to seal Chambers Keep permanently. The second prisoner was transferred, then un-transferred, then the paperwork vanished. Show updated standings. Play up how close it is between top communities. The names could reshape the realm. Time is running out.",
    tweet_4_prompt: "Resolve — Chambers Keep has been sealed by Council order. Announce the winning community as the one that recovered the most intelligence before the doors closed. Official verdict: 'self-inflicted spell damage.' The second prisoner's paperwork vanished. Show final scoreboard, name MVP. End with 'Full intel at 9lv.net' — nothing happened at Chambers Keep, this is the official position forever.",
    images: ["2.1.png", "2.2.png", "2.3.png", "2.4.png"]
  },

  {
    id: 3,
    title: "The Veiled Cascade Contamination",
    theme: "Turning the frogs gay parody — something is in the water at the cascade, mutating frogs into magical spellcasting creatures. The Alchemist's Guild insists everything is fine while the frogs form a governing council.",
    tweet_1: "⚠️ Something is wrong with the water at the cascade.\n\nThe frogs have changed — bigger, shimmering with arcane energy. One was spotted casting a minor cantrip.\n\nThe Alchemist's Guild calls it 'naturally occurring mineral enrichment.'\n\nResidents say the water tastes purple.\n\nWhich community collects the most specimens before the Guild seals the area?\nRally your people — reply to join the raid! 🐱‍👤",
    tweet_2_prompt: "Continue the contaminated water story. The Guild released a statement: 'The frogs are fine. Stop looking at the frogs.' Meanwhile three new frog species have been documented and one formed a small governing body. The water glows at night now — the Guild says this is 'seasonal' despite it never happening before. Include live standings as specimen collection scoreboard. Absurd, deadpan conspiracy tone.",
    tweet_3_prompt: "Escalate — the frogs are organizing, one opened a door today. The Guild is about to seal the area for 'routine maintenance.' Show updated standings. Create urgency about collecting specimens before the area is closed. If communities are close, mention the frogs seem to be picking sides.",
    tweet_4_prompt: "Resolve — the Guild sealed the area. The cascade has been reclassified from 'contaminated' to 'enhanced.' Announce winner as the community that collected the most specimens. The frogs remain changed. The water still glows. Show final scoreboard, name MVP. End with 'Full intel at 9lv.net' — the frogs are fine, they've always been like this.",
    images: ["3.1.png", "3.2.png", "3.3.png", "3.4.png"]
  },

  {
    id: 4,
    title: "The Gathering at Bonewood Grove",
    theme: "Bohemian Grove parody — the most powerful wizards meet annually in a forest with a forty-foot stone owl, claiming it's just networking. Communities spy on the gathering to learn their plans.",
    tweet_1: "🦉 Every year the most powerful wizards in Avaloris gather at Bonewood Grove.\n\nRobes. Rituals. An enormous stone owl.\n\nThey say it's just networking. Nobody networks in front of a forty-foot owl while chanting in unison.\n\nWhich community uncovers the most about what they're planning?\nRally your people — reply to join the raid! 🐱‍👤",
    tweet_2_prompt: "Continue the Bonewood Grove story. A leaked scroll shows the seating chart — every Archmage, every Guild Master. Cabin assignments named after forest animals. An attendee was spotted leaving early, looking disturbed. He says it was 'just a retreat' and 'the owl is decorative.' The owl's eyes glow at night. Decoratively. Include live community standings showing who's uncovered the most intelligence. Conspiratorial tone.",
    tweet_3_prompt: "Build tension — more details leaking about what happens in the grove. The gathering is ending soon and all evidence will be magically sealed. Show updated standings. If it's close between top communities, play up the race to uncover the most before the wards go back up.",
    tweet_4_prompt: "Resolve — the gathering ended. Attendees returned to their posts, refreshed and 'definitely not coordinating anything.' Announce winner as the community that uncovered the most. The owl remains. It always remains. Show final scoreboard, name MVP. End with 'Full intel at 9lv.net'.",
    images: ["4.1.png", "4.2.png", "4.3.png", "4.4.png"]
  },

  {
    id: 5,
    title: "The Procession at Grassy Overlook",
    theme: "JFK assassination parody — a beloved Archmagus struck down during a public procession. The Council says lone wizard from a tower, witnesses say the spell came from a grassy overlook. Communities raid his now-unguarded library.",
    tweet_1: "💀 The beloved Archmagus was struck by a spell during a public procession through the lower quarter.\n\nThe Council says a lone wizard fired from a tower window. Witnesses swear the spell came from behind a grassy overlook on the opposite side.\n\nThe tower wizard was arrested, then killed before trial.\n\nHis library is unguarded. Which community claims the most?\nRally your people — reply to join the raid! 🐱‍👤",
    tweet_2_prompt: "Continue the Archmagus assassination story. A crystal recording was found but seventeen seconds are missing. The arrested wizard's connections to three noble houses are being quietly buried. Meanwhile the library is being raided by communities. A bystander found a second spell trajectory that doesn't match the tower angle. Include live standings as a scoreboard of who's claiming the most tomes. Conspiratorial, dark tone.",
    tweet_3_prompt: "Escalate — the Council is about to seal the library and pave over the grassy overlook. Seventeen missing seconds will never be recovered. Create urgency. Show updated standings. If top communities are close, play up the race for the last rare spellbooks.",
    tweet_4_prompt: "Resolve — the library has been picked clean and the overlook paved over. Announce winner as the community that claimed the most valuable tomes. Official story remains: one wizard, one tower, one spell. Show final scoreboard, name MVP. End with 'Full intel at 9lv.net'.",
    images: ["5.1.png", "5.2.png", "5.3.png", "5.4.png"]
  },

  {
    id: 6,
    title: "The Restricted Mesa",
    theme: "Area 51 parody — a warded mesa in the desert that's been sealed for decades. The wards flickered last night and something flew over a village — silent, fast, no wings. Communities race to breach the mesa.",
    tweet_1: "👽 There is a mesa in the desert that has been warded by the Council for as long as anyone remembers.\n\nNo one goes in. Nothing comes out.\n\nExcept last night the wards flickered and something flew over the nearest village — silent, fast, no wings.\n\nThe Council says it was a weather anomaly.\n\nWhich community breaches the mesa first?\nRally your people — reply to join the raid! 🐱‍👤",
    tweet_2_prompt: "Continue the Restricted Mesa story. Several wizards breached the outer ward — found empty corridors, locked vaults, and one room with something under a cloth that was humming. A guard told them to leave but gave them tea first. Very calming tea. None of them can clearly remember what they saw. The tea was excellent though. Include live community standings showing who's gathered the most intelligence. X-Files conspiratorial tone.",
    tweet_3_prompt: "Build urgency — the wards are being restored, last chance to get inside. The thing under the cloth is still humming. The Council has tripled the guard. Show updated standings. Create FOMO about the window closing.",
    tweet_4_prompt: "Resolve — the wards are back up. Whatever was inside remains inside. Announce winner as the community that gathered the most intelligence during the breach. The Council tripled the guard. The something under the cloth is still humming. Show final scoreboard, name MVP. End with 'Full intel at 9lv.net'.",
    images: ["6.1.png", "6.2.png", "6.3.png", "6.4.png"]
  },

  {
    id: 7,
    title: "The First Ascent of Silver Summit",
    theme: "Moon landing conspiracy parody — two wizards planted a banner on the highest peak but the banner fluttered where there should be no wind. Communities race to the summit observatory for star-maps.",
    tweet_1: "🏔️ Two wizards from House Dawnbringer planted their banner on Silver Summit — the highest point in Avaloris.\n\nThe whole realm watched through broadcast crystals.\n\nExcept some wizards are pointing out the banner fluttered where there should be no wind. And the shadows seem wrong.\n\nThe observatory up there has star-maps. Which community claims them?\nRally your people — reply to join the raid! 🐱‍👤",
    tweet_2_prompt: "Continue the Silver Summit story. A Nighthollow scholar released a twelve-scroll paper on 'shadow inconsistencies.' Dawnbringer is furious. One of the original climbers punched a doubter in a tavern. Meanwhile communities are racing to the summit for the observatory data. Include live standings showing who's claiming the most star-map data. Mix conspiracy humor with adventure tone.",
    tweet_3_prompt: "Build urgency — the weather is closing in on the summit. Last chance to reach the observatory before the pass freezes. Show updated standings. If communities are close, mention different routes to the top.",
    tweet_4_prompt: "Resolve — multiple communities reached the summit. The banner is real, the observatory is real. Announce winner as the community that claimed the most star-map data. The shadow debate continues in taverns. Show final scoreboard, name MVP. End with 'Full intel at 9lv.net'.",
    images: ["7.1.png", "7.2.png", "7.3.png", "7.4.png"]
  },

  {
    id: 8,
    title: "The Expedition to World's Edge",
    theme: "Flat earth parody — a confident wizard says Avaloris is flat and has organized an expedition to 'the edge.' Communities profit from the accidentally useful exploration of new territory.",
    tweet_1: "🌍 A wizard from House Stonebark has gathered a following. He says Avaloris is flat and he can prove it.\n\nHe's organised an expedition to 'the edge.' The Academy says there is no edge. He says the Academy is lying.\n\nHe has charts. The charts are very confident.\n\nWhich community profits most from the new territory mapped along the way?\nRally your people — reply to join the raid! 🐱‍👤",
    tweet_2_prompt: "Continue the flat earth expedition story. Six hours of walking, no edge found. The wizard says they need to go further. His followers are blistering. A cartographer following at a safe distance has been documenting new terrain nobody has mapped before — accidentally useful expedition. Include live community standings. Deadpan absurdist tone.",
    tweet_3_prompt: "Build urgency — the expedition is about to turn back. New terrain is still being discovered. Show updated standings. Play up the absurdity while emphasizing the real value of the mapped territory.",
    tweet_4_prompt: "Resolve — no edge was found. The wizard says it moved. Three followers and a dog remain. But new territory WAS mapped. Announce winner. Show final scoreboard, name MVP. End with 'Full intel at 9lv.net' — the expedition continues tomorrow.",
    images: ["8.1.png", "8.2.png", "8.3.png", "8.4.png"]
  },

  {
    id: 9,
    title: "The Great Wall of Umbra",
    theme: "Trump border wall parody — House Nighthollow building a tremendous wall and making House Dawnbringer pay for it. Communities fight over the trade gate's tariff revenue.",
    tweet_1: "🧱 House Nighthollow is building a wall along the northern border. A big wall. They say it will be beautiful. The best wall Avaloris has ever seen.\n\nAnd they're going to make House Dawnbringer pay for it.\n\nDawnbringer has declined. The wall just got ten feet higher.\n\nWhich community controls the trade gate?\nRally your people — reply to join the raid! 🐱‍👤",
    tweet_2_prompt: "Continue the wall story. The wall is forty feet of shadow crystal — impressive, frankly. 'Many people are saying it's the best wall.' Dawnbringer responded by building a ladder. Nighthollow added ten more feet. Include live community standings. Trumpian bombast meets fantasy deadpan.",
    tweet_3_prompt: "Build urgency — the wall debate is reaching its climax. Someone started digging a tunnel. Show updated standings. Time running out to pick a side.",
    tweet_4_prompt: "Resolve — the wall stands. Or fell. Depends who you ask. Announce winner. Nighthollow says success. Dawnbringer says 'what wall.' Nobody mentions the tunnel. Show final scoreboard, name MVP. End with 'Full intel at 9lv.net'.",
    images: ["9.1.png", "9.2.png", "9.3.png", "9.4.png"]
  },

  {
    id: 10,
    title: "The Two Weeks Quarantine",
    theme: "COVID lockdown parody — a mysterious plague (definitely not from the Alchemist's Guild lab) leads to a 'two-week' lockdown that keeps extending. Communities loot the abandoned quarantine zone.",
    tweet_1: "🦠 A mysterious plague has emerged from a source that is definitely NOT the Alchemist's Guild laboratory.\n\nThe Council has announced a two-week lockdown of the zone. Just two weeks. To flatten the curse.\n\nAll wizards must cast from their towers.\n\nIt's been six weeks. Which community loots the quarantine zone?\nRally your people — reply to join the raid! 🐱‍👤",
    tweet_2_prompt: "Continue the quarantine story. Week six of the 'two-week' lockdown. Wizards baking enchanted bread. One hasn't worn proper robes in a month. Council recommends banging pots at sundown. The Guild laboratory has been 'quietly demolished — unrelated.' Include live community standings. COVID humor, darkly funny.",
    tweet_3_prompt: "Build urgency — lockdown is about to lift (maybe). The quarantine zone still has unclaimed gear. Show updated standings. Create FOMO about last chance to loot.",
    tweet_4_prompt: "Resolve — lockdown lifted. The plague came from a bat, or a market, or the lab — the story changed three times. Announce winner. Show final scoreboard, name MVP. End with 'Full intel at 9lv.net' — we're not doing this again. Probably.",
    images: ["10.1.png", "10.2.png", "10.3.png", "10.4.png"]
  },

  // ===========================
  // CRYPTO & FINANCE (11-18)
  // ===========================

  {
    id: 11,
    title: "The Eastern Exchange Collapse",
    theme: "FTX collapse parody — a crystal exchange collapsed overnight, the Exchange Master fled on a flying carpet. Communities race to breach the vaults.",
    tweet_1: "💎 The Eastern Crystal Exchange collapsed overnight. Millions in enchanted gems — gone.\n\nMerchants who tried to withdraw found coloured glass where their crystals should be.\n\nThe Exchange Master was last seen boarding a flying carpet heading east. 'Your assets are safe. Trust the process.'\n\nWhich community breaches the vault first?\nRally your people — reply to join the raid! 🐱‍👤",
    tweet_2_prompt: "Continue the exchange collapse story. The Exchange Master spotted in the Palman Isles — no extradition. 'Cooperating from abroad' (from a beach, with a cocktail). His apprentice launching a new exchange — 'totally different,' same building, different sign. Include live community standings. SBF/FTX energy.",
    tweet_3_prompt: "Build urgency — vault doors weakening but Council about to freeze remaining assets. Show updated standings. Last chance to recover anything.",
    tweet_4_prompt: "Resolve — the Exchange Master is 'cooperating from abroad.' Announce winner. The new exchange opens Tuesday — same building, different sign. Show final scoreboard, name MVP. End with 'Full intel at 9lv.net'.",
    images: ["11.1.png", "11.2.png", "11.3.png", "11.4.png"]
  },

  {
    id: 12,
    title: "The Vanishing Merchant of Brass Bazaar",
    theme: "Rug pull parody — a merchant sold enchanted cloaks that turned to burlap overnight. His sign reads 'thank you for your liquidity.' Communities loot his abandoned shop.",
    tweet_1: "🧥 A merchant set up shop three days ago selling enchanted cloaks at prices too good to question.\n\n'Early supporters get the best cloaks,' he promised.\n\nThis morning the shop is empty. The cloaks have turned to burlap. His sign now reads: 'thank you for your liquidity.'\n\nWhich community recovers the most from his shop?\nRally your people — reply to join the raid! 🐱‍👤",
    tweet_2_prompt: "Continue the rug pull story. Back room had maps, ledgers, merchant's next three stops — he's done this before. A wizard holding burlap says he's 'still early.' Include live community standings. Crypto rug pull humor.",
    tweet_3_prompt: "Build urgency — the ledgers reveal more hidden stashes. Show updated standings. A new merchant appeared selling boots — 'this time is different.'",
    tweet_4_prompt: "Resolve — merchant is three towns ahead. Announce winner. A new merchant selling boots appeared. 'This time is different.' Show final scoreboard, name MVP. End with 'Full intel at 9lv.net'.",
    images: ["12.1.png", "12.2.png", "12.3.png", "12.4.png"]
  },

  {
    id: 13,
    title: "The Leviathan of the Deep Vault",
    theme: "Whale wallet movements parody — a crystal leviathan holding more wealth than most kingdoms is surfacing. When it moves, markets swing wildly.",
    tweet_1: "🐋 Something massive stirred in the deep vault beneath the harbour last night.\n\nA crystal leviathan — ancient, vast, holding more wealth than most kingdoms.\n\nWhen it shifts left, markets crash. When it shifts right, they soar.\n\nIt's surfacing. Every merchant in the realm is watching the water.\n\nWhich community reads the movements best?\nRally your people — reply to join the raid! 🐱‍👤",
    tweet_2_prompt: "Continue the leviathan/whale story. Markets swinging wildly. Small traders panicking, large traders buying the panic. A wizard tried talking to it; it moved forty million crystals to a new vault. 'Probably nothing.' Include live community standings. Crypto whale humor.",
    tweet_3_prompt: "Build tension — the leviathan is about to submerge again. Last chance to position. Show updated standings. 'Probably nothing' energy.",
    tweet_4_prompt: "Resolve — the leviathan submerged. Markets settling. Announce winner. Vault tracker shows another shift next week. 'Probably nothing.' Show final scoreboard, name MVP. End with 'Full intel at 9lv.net'.",
    images: ["13.1.png", "13.2.png", "13.3.png", "13.4.png"]
  },

  {
    id: 14,
    title: "The Golden Promise Guild",
    theme: "Ponzi scheme / Madoff parody — a guild offered guaranteed 30% returns for a decade. There was never a vault. Communities storm the building.",
    tweet_1: "📈 The Golden Promise Guild offered guaranteed returns for a decade. Thirty percent. Every year.\n\nNew members paid in, old members got paid. Everyone was happy.\n\nUntil yesterday, when someone asked to see the actual vault.\n\nThere is no vault. There was never a vault.\n\nWhich community claims the building?\nRally your people — reply to join the raid! 🐱‍👤",
    tweet_2_prompt: "Continue the Ponzi story. Guild Master emerged to say funds are 'restructuring,' retreated behind reinforced door. Ledger found showing: three sky-ships, a private island, enchanted self-portrait with gold frame. Members queuing to be angry in an orderly fashion. Include live standings. Madoff humor.",
    tweet_3_prompt: "Build urgency — the Guild Master is about to be dragged out. Last chance to claim the building. Show updated standings.",
    tweet_4_prompt: "Resolve — Guild Master dragged out, sentenced to explain his business model in public. Announce winner. Someone already starting a new guild — 'guaranteed returns, thirty percent.' Show final scoreboard, name MVP. End with 'Full intel at 9lv.net'.",
    images: ["14.1.png", "14.2.png", "14.3.png", "14.4.png"]
  },

  {
    id: 15,
    title: "The Forge Master's Decree",
    theme: "Bitcoin mining wars parody — the most powerful Forge Master tweeted 'your favourite Forge Master's technique is a fraud.' Mining guilds splitting. Communities claim unguarded forges.",
    tweet_1: "⛏️ The most powerful Forge Master in Avaloris broke his silence today.\n\nOne message: 'Your favourite Forge Master's most profitable technique is a fraud.'\n\nNo context. No follow-up. He's been mining spell crystals quietly for years. Now he's chosen violence.\n\nThree rival mining guilds have declared war.\n\nWhich community claims the most forges?\nRally your people — reply to join the raid! 🐱‍👤",
    tweet_2_prompt: "Continue the forge war story. The Forge Master posted one word: 'Patience.' His operation outproduces all rivals. A guild leader responded with a forty-seven scroll manifesto nobody read. Someone forked the mining technique — two versions, both claim to be original. Include live standings. Bitcoin maximalist energy.",
    tweet_3_prompt: "Build urgency — forges being claimed fast, few unmanned ones remain. Show updated standings. The hash wars are peaking.",
    tweet_4_prompt: "Resolve — hash wars ended quietly. Announce winner. The Forge Master returned to silence. The manifesto remains unread. Both forks claim legitimacy — this will never be resolved. Show final scoreboard, name MVP. End with 'Full intel at 9lv.net'.",
    images: ["15.1.png", "15.2.png", "15.3.png", "15.4.png"]
  },

  {
    id: 16,
    title: "The Disputed Council Vote",
    theme: "DAO governance drama parody — a realm-wide vote went sideways. Someone bought 6,000 votes through shell guilds. Communities stuff ballots.",
    tweet_1: "🗳️ The Council called a realm-wide vote on new trade regulations. Every citizen gets one vote.\n\nExcept someone bought six thousand votes through shell guilds. And someone proposed changing the voting rules mid-vote.\n\nThe ballot box is enchanted to be transparent. This has made everything worse.\n\nWhich community stuffs the most ballots?\nRally your people — reply to join the raid! 🐱‍👤",
    tweet_2_prompt: "Continue the governance drama. A wizard proposed voting on whether to continue the vote — this passed. Then someone proposed voting on THAT vote. Three votes deep. A delegate filibustering by reading potion ingredients. The original question forgotten. Include live standings. DAO governance humor.",
    tweet_3_prompt: "Build urgency — a decision is about to be forced. The ballot box is overflowing. Show updated standings. 'Does your vote even matter?'",
    tweet_4_prompt: "Resolve — a decision was reached. Nobody agrees on what it was. Announce winner. Next vote tomorrow — it's about whether to have fewer votes. Show final scoreboard, name MVP. End with 'Full intel at 9lv.net'.",
    images: ["16.1.png", "16.2.png", "16.3.png", "16.4.png"]
  },

  {
    id: 17,
    title: "The Endless Winter at Frostfang",
    theme: "Bear market depression parody — Frostfang Pass frozen for three seasons. A wizard with a frozen chart that 'only goes up.' Communities break through ice to claim frozen cargo.",
    tweet_1: "❄️ Frostfang Pass has been frozen for three seasons now.\n\nMerchants who were certain spring was coming have run out of supplies. The optimists are building shelters. The pessimists left months ago.\n\nOne wizard sits by a dead fire holding a chart that only goes up. The chart is frozen solid.\n\nWhich community breaks through the ice first?\nRally your people — reply to join the raid! 🐱‍👤",
    tweet_2_prompt: "Continue the bear market winter story. A wizard announced spring is coming — he announces this every month. Some eating emergency rations. One writing poetry about suffering (actually quite good). The frozen cargo is starting to crack. Include live standings. Bear market gallows humor.",
    tweet_3_prompt: "Build urgency — is this the thaw or another false spring? The ice is cracking wider. Show updated standings. 'We've been hurt before.'",
    tweet_4_prompt: "Resolve — a crack in the ice. Might be spring. Might be wishful thinking. Announce winner. The chart was updated — still only goes up, from a lower starting point. Show final scoreboard, name MVP. End with 'Full intel at 9lv.net'.",
    images: ["17.1.png", "17.2.png", "17.3.png", "17.4.png"]
  },

  {
    id: 18,
    title: "The Temple of the Green Flame",
    theme: "Laser eyes / number go up cult parody — a cult worships a flame that changes color. When green, points double. Their eyes glow. They insist this is normal.",
    tweet_1: "🟢 A cult has formed around a single enchanted flame that changes colour.\n\nWhen it burns green, they celebrate. When it burns red, they say 'temporary.'\n\nThey've been staring at this flame for months. Their eyes glow slightly. They insist this is normal.\n\nThe flame is green right now. Double points.\n\nWhich community earns the most while it lasts?\nRally your people — reply to join the raid! 🐱‍👤",
    tweet_2_prompt: "Continue the green flame cult story. Flame flickered red for four seconds — three devotees fainted. High priest said 'buy the dip.' A devotee whispered 'Have fun staying in darkness' to a skeptic. Include live standings showing doubled-point earnings. Laser eyes maximalist parody.",
    tweet_3_prompt: "Build urgency — the flame is holding green but flickering. Double points won't last forever. Show updated standings. 'Few understand' energy.",
    tweet_4_prompt: "Resolve — the flame held green. This time. Announce winner. Devotees recruiting with glowing eyes — 'the flame will burn green forever.' The flame has made no such promise. Show final scoreboard, name MVP. End with 'Full intel at 9lv.net'.",
    images: ["18.1.png", "18.2.png", "18.3.png", "18.4.png"]
  },

  // ===========================
  // MOVIES & TV (19-28)
  // ===========================

  {
    id: 19,
    title: "The Glowing Briefcase",
    theme: "Pulp Fiction parody — two philosophical enforcers, a glowing briefcase nobody can identify, and an endless sandwich debate.",
    tweet_1: "💼 Two enforcers from House Nighthollow walked into a tavern to retrieve a briefcase.\n\nA glowing briefcase. Nobody knows what's inside.\n\nThe enforcers are unexpectedly philosophical about their work. One won't stop debating sandwich nomenclature across the eastern realms.\n\nWhich community holds the briefcase longest?\nRally your people — reply to join the raid! 🐱‍👤",
    tweet_2_prompt: "Continue the Pulp Fiction briefcase story. Briefcase changed hands four times. One enforcer discharged a spell in a wagon. A calm specialist called to clean up, mostly complaining about his morning. Sandwich debate continues. Include live standings. Tarantino energy.",
    tweet_3_prompt: "Build urgency — the briefcase's owner wants it back. Time running out. Show updated standings. 'Say what again' energy.",
    tweet_4_prompt: "Resolve — briefcase returned. What's inside? Nobody knows. Announce winner. Enforcers still arguing about sandwiches. Show final scoreboard, name MVP. End with 'Full intel at 9lv.net'.",
    images: ["19.1.png", "19.2.png", "19.3.png", "19.4.png"]
  },

  {
    id: 20,
    title: "The Stolen Rug of Binding",
    theme: "Big Lebowski parody — an enchanted rug that held a wizard tower's magic together has been defaced. Nihilist mercenaries, a marmot, and The Dude who abides.",
    tweet_1: "🎳 Someone defaced an enchanted rug. Not just any rug — the Rug of Binding, which held an entire wizard tower's magic together.\n\nThe owner, a remarkably relaxed wizard known as 'The Dude,' wants it replaced.\n\nNihilist mercenaries. A severed toe. A possibly-enchanted marmot.\n\nThe tower is destabilising. Which community salvages the most?\nRally your people — reply to join the raid! 🐱‍👤",
    tweet_2_prompt: "Continue the Lebowski story. Nihilists threatening to 'destroy ze remaining furnishings.' They believe in nothing. The Dude spotted bowling at Mystic Falls, unconcerned. His associate agitated about 'drawing a line in the sand.' Include live standings. Lebowski energy — absurd, laid-back chaos.",
    tweet_3_prompt: "Build urgency — the tower is creaking, about to lose more floors. Last chance to salvage. Show updated standings. The Dude abides but the tower does not.",
    tweet_4_prompt: "Resolve — rug not recovered. Tower lost three floors. Announce winner. Nihilists defeated by a marmot. The Dude abides. Show final scoreboard, name MVP. End with 'Full intel at 9lv.net'.",
    images: ["20.1.png", "20.2.png", "20.3.png", "20.4.png"]
  },

  {
    id: 21,
    title: "The Arena of the Fallen General",
    theme: "Gladiator parody — a former general in the fighting pits demanding vengeance. Triple points. The Emperor's thumb direction is ambiguous.",
    tweet_1: "⚔️ A former general, stripped of rank and sold into the fighting pits, stood in the arena today.\n\nHe removed his helmet. 'My name is Maximus Decimus Meridius,' he announced. He would have his vengeance. In this life or the next.\n\nThe crowd went absolutely mental.\n\nTriple points for anyone who enters the arena.\nRally your people — reply to join the raid! 🐱‍👤",
    tweet_2_prompt: "Continue the Gladiator story. The Emperor doing the thumb thing — nobody can tell which direction. The general asked 'Are you not entertained?' Based on participation, yes. Include live standings. Epic, dramatic, slightly over-the-top.",
    tweet_3_prompt: "Build urgency — arena gates closing soon. The general is still standing. Final chance for glory. Show updated standings. 'Strength and honour.'",
    tweet_4_prompt: "Resolve — dust settles. Announce winner. The Emperor's thumb interpreted seven different ways. 'What we do here echoes in eternity. Or until tomorrow.' Show final scoreboard, name MVP. End with 'Full intel at 9lv.net'.",
    images: ["21.1.png", "21.2.png", "21.3.png", "21.4.png"]
  },

  {
    id: 22,
    title: "The Great News Crystal Wars",
    theme: "Anchorman parody — rival broadcasters, a trident, jazz flute on the battlefield, an unexplained bear. Communities claim abandoned equipment.",
    tweet_1: "📡 A territorial dispute between rival crystal broadcasters has escalated beyond reason.\n\nThe lead broadcaster insists he's 'kind of a big deal' and that 'his tower has many leather-bound tomes.'\n\nRival houses assembled their own news teams. Someone brought a trident.\n\nWhich community secures the most equipment?\nRally your people — reply to join the raid! 🐱‍👤",
    tweet_2_prompt: "Continue the Anchorman story. 'That escalated quickly.' Trident, fire, jazz flute on the battlefield. Someone punted off a bridge by a bear nobody can explain. Include live standings. Anchorman energy — absurd escalation, stay classy.",
    tweet_3_prompt: "Build urgency — crystal wars peaking. Equipment scattered everywhere. Show updated standings. The trident wizard is still at large.",
    tweet_4_prompt: "Resolve — crystal wars over. Barely. Announce winner. Several wizards trapped in a glass case of emotion. Trident wizard still at large. Show final scoreboard, name MVP. End with 'Full intel at 9lv.net' — stay classy, Avaloris.",
    images: ["22.1.png", "22.2.png", "22.3.png", "22.4.png"]
  },

  {
    id: 23,
    title: "The Grand Pitch at Dawn",
    theme: "Alan Partridge parody — a washed-up broadcaster pitching 'Inner-Realm Partridge' in a dressing gown. He's eaten all the cheese. His scripts contain useful zone intel.",
    tweet_1: "📺 A washed-up court broadcaster arrived at the Crystal Broadcasting Tower in a dressing gown, demanding a second season for his show.\n\nHe's been living at a roadside tavern. His pitch involves a monkey, a military hospital, and 'Inner-Realm Partridge.'\n\nNobody asked for this. But his scripts contain zone intel.\n\nWhich community acquires the most intelligence?\nRally your people — reply to join the raid! 🐱‍👤",
    tweet_2_prompt: "Continue the Partridge pitch story. Four hours of pitching. 'Back of the net' after every idea. All cheese eaten. 'Digital' mentioned — he pretended to understand. Assistant in the wagon eating Toblerone, sighing. Maps in scripts are accurate. Include live standings. Cringe confidence energy.",
    tweet_3_prompt: "Build urgency — he's about to leave. Last chance to copy the maps. Show updated standings.",
    tweet_4_prompt: "Resolve — pitch concluded. Announce winner. He got a show — nobody knows what they commissioned. 'Jurassic Park.' Show final scoreboard, name MVP. End with 'Full intel at 9lv.net'.",
    images: ["23.1.png", "23.2.png", "23.3.png", "23.4.png"]
  },

  {
    id: 24,
    title: "The Grand Roast at the Broken Tankard",
    theme: "Comedy roast — every house sends their sharpest tongue. Last year's joke caused three defections. Creative devastation earns bonus points.",
    tweet_1: "🎤 The Broken Tankard is hosting its annual roast — every house sends their sharpest tongue.\n\nLast year's champion told a joke so devastating about House Manastorm that three members temporarily defected.\n\nThe crowd wants blood. Metaphorical blood. Probably.\n\nWhich community delivers the most crowd-approved devastation?\nRally your people — reply to join the raid! 🐱‍👤",
    tweet_2_prompt: "Continue the roast story. A Smoulders joke about Stonebark so simple it circled back to devastating. A Nighthollow wizard stood in silence for thirty seconds — funniest thing all night. Crowd choosing sides. Mead running out. Include live standings. Sharp and cruel comedy energy.",
    tweet_3_prompt: "Build urgency — last round of roasts. Getting personal. Show updated standings. 'The cruelest spells require no mana.'",
    tweet_4_prompt: "Resolve — roast over. Reputations in tatters. Announce winner. Two houses aren't speaking — will last approximately one bounty. Show final scoreboard, name MVP. End with 'Full intel at 9lv.net'.",
    images: ["24.1.png", "24.2.png", "24.3.png", "24.4.png"]
  },

  {
    id: 25,
    title: "The Gathering Beneath the Soap Shop",
    theme: "Fight Club parody — a soap maker hosting something in his basement. First rule: don't talk about it. Entry fee: one secret.",
    tweet_1: "🧼 A soap maker in the lower quarter has been hosting something in his basement.\n\nWizards go in clean and come out bruised. Nobody talks about what happens down there.\n\nThe first rule, apparently, is that you're not supposed to discuss it. The second rule is the same.\n\nThe soap is excellent though.\n\nEntry fee: one secret. Which community wins the most bouts?\nRally your people — reply to join the raid! 🐱‍👤",
    tweet_2_prompt: "Continue the Fight Club story. Basement packed — wizards from every house, ranks cast aside. The soap maker philosophical about destruction. A wizard noticed the soap maker and his lieutenant are never in the same room. Include live standings. Anti-establishment, philosophical violence.",
    tweet_3_prompt: "Build urgency — basement closes at dawn. Last chance to fight and gather intelligence. Show updated standings. The soap maker is drawing maps now.",
    tweet_4_prompt: "Resolve — basement empty by dawn. Announce winner. The soap maker is buying supplies and drawing maps. His name was... actually, we don't discuss that. Show final scoreboard, name MVP. End with 'Full intel at 9lv.net'.",
    images: ["25.1.png", "25.2.png", "25.3.png", "25.4.png"]
  },

  {
    id: 26,
    title: "The Journey of the Small Ones",
    theme: "Lord of the Rings parody — a very small wizard carrying a corrupting artifact to a volcano. The fellowship has split. A walking tree. Communities escort or intercept.",
    tweet_1: "💍 A small wizard — very small, barely reaches the tavern bar — has been entrusted with destroying an artifact of terrible power.\n\nHe needs to carry it to a volcano. He has one loyal friend, an unreliable creature who keeps calling it 'precious,' and seven companions of varying usefulness.\n\nOne does not simply walk to the volcano.\n\nWhich community contributes most to the journey?\nRally your people — reply to join the raid! 🐱‍👤",
    tweet_2_prompt: "Continue the LOTR story. Fellowship has split — canoe, chasing enemies, creature arguing with himself in a cave, small wizard still walking. A tree started walking — nobody acknowledging it. Include live standings. Epic fantasy meets deadpan.",
    tweet_3_prompt: "Build urgency — the volcano is close. The artifact is getting heavier. Show updated standings. The small wizard needs help.",
    tweet_4_prompt: "Resolve — the artifact was destroyed. The volcano erupted. Announce winner. The creature fell in with the artifact — seemed happy about it. Show final scoreboard, name MVP. End with 'Full intel at 9lv.net'.",
    images: ["26.1.png", "26.2.png", "26.3.png", "26.4.png"]
  },

  {
    id: 27,
    title: "The Alchemist of the Bleached Flats",
    theme: "Breaking Bad parody — a mild-mannered potions teacher with a terminal curse cooks the purest blue spell crystals. 'I am the one who casts.'",
    tweet_1: "🔵 A mild-mannered potions teacher has been diagnosed with a terminal curse.\n\nRather than accept his fate, he's partnered with a former student of questionable judgement to cook the purest spell crystals ever seen. They're blue. They're flawless.\n\nEvery criminal enterprise in Avaloris wants the recipe.\n\n'I am the one who casts.'\n\nWhich community finds the stockpile?\nRally your people — reply to join the raid! 🐱‍👤",
    tweet_2_prompt: "Continue the Breaking Bad story. Teacher evolved, no longer mild-mannered. Student says 'yeah, magic!' A calm distributor hides behind a fried chicken shop. Teacher declined a buyout. Include live standings. BB tension — morality crumbling.",
    tweet_3_prompt: "Build urgency — the operation is about to explode (literally). Last chance to acquire crystals. Show updated standings. The chicken shop is a front.",
    tweet_4_prompt: "Resolve — operation expanded, contracted, then exploded. Announce winner. The blue crystals remain unmatched. Show final scoreboard, name MVP. End with 'Full intel at 9lv.net'.",
    images: ["27.1.png", "27.2.png", "27.3.png", "27.4.png"]
  },

  {
    id: 28,
    title: "The Guild Office at Merchant Row",
    theme: "The Office parody — the most boring building in Avaloris. 'World's best guild master.' The assistant stares at invisible audiences. Controls all trade permits.",
    tweet_1: "🏢 The Merchant Row guild office is the most boring building in Avaloris.\n\nThe guild master insists on declaring himself 'world's best guild master' despite universal disagreement.\n\nHe throws parties nobody wants to attend. His assistant stares directly at invisible audiences.\n\nThe office processes all trade permits. Control it, control the economy.\n\nWhich community takes over?\nRally your people — reply to join the raid! 🐱‍👤",
    tweet_2_prompt: "Continue The Office story. Guild master organized a tournament with a self-made trophy. Two workers flirting by the supply cupboard for years. A quiet back-room wizard said one devastating sentence. Include live standings. Cringe, deadpan, oddly productive.",
    tweet_3_prompt: "Build urgency — parchment orders critically behind. Does anyone work here? Show updated standings. The assistant is still smirking.",
    tweet_4_prompt: "Resolve — the office somehow processed more orders than any other branch. Despite everything. Announce winner. Guild master taking credit. The assistant still smirking at nobody. Show final scoreboard, name MVP. End with 'Full intel at 9lv.net'.",
    images: ["28.1.png", "28.2.png", "28.3.png", "28.4.png"]
  },

  // ===========================
  // INTERNET CULTURE (29-32)
  // ===========================

  {
    id: 29,
    title: "The Nine-Wizard Vault Job",
    theme: "Ocean's Eleven heist parody — a calm wizard, nine specialists, a nervous inside man. Plan has seventeen steps, step six is 'improvise.'",
    tweet_1: "🎰 A wizard with an extremely calm demeanour has assembled a team of nine specialists to rob the most secure vault in Avaloris.\n\nThe plan is elaborate. The disguises are decent. The inside man is nervous.\n\nThe vault belongs to a very unpleasant wizard who won it in a card game.\n\nJoin the heist or defend the vault?\nRally your people — reply to join the raid! 🐱‍👤",
    tweet_2_prompt: "Continue the Ocean's Eleven story. Phase one complete — inside, locks bypassed. Inside man dropped key twice. Calm wizard hasn't blinked in four hours. Vault owner showed up early. Include live standings. Heist movie energy — cool, tense, stylish.",
    tweet_3_prompt: "Build urgency — final chamber. Vault owner getting suspicious. Show updated standings. The calm wizard 'has a plan for this.'",
    tweet_4_prompt: "Resolve — the job was 'complicated.' Announce winner. Calm wizard already planning the next one. Vault owner 'will find out shortly.' Show final scoreboard, name MVP. End with 'Full intel at 9lv.net'.",
    images: ["29.1.png", "29.2.png", "29.3.png", "29.4.png"]
  },

  {
    id: 30,
    title: "The Great Broadcast Feud",
    theme: "Streamer/influencer drama — two broadcasters feuding over fire wine. 'My Truth' vs 'Your Truth Is Wrong: A Response.' Communities pick sides.",
    tweet_1: "🎙️ Two of Avaloris's most popular crystal broadcasters are feuding.\n\nIt started over a recipe for fire wine. It escalated to personal attacks, defection demands, and one releasing a three-hour recording titled 'My Truth.'\n\nThe other responded with 'Your Truth Is Wrong: A Response.'\n\nThe realm is split. Which community generates the most engagement?\nRally your people — reply to join the raid! 🐱‍👤",
    tweet_2_prompt: "Continue the streamer feud. 'My Truth' at 100k views. 'Your Truth Is Wrong' at 200k. A third broadcaster: 'Both Your Truths Are Stupid' — currently #1. One crying live, the other cooking stream pretending nothing is happening. Include live standings. Influencer drama energy.",
    tweet_3_prompt: "Build urgency — feud is peaking. Last chance to pick sides. Show updated standings.",
    tweet_4_prompt: "Resolve — feud ended when both overshadowed by a cat walking across a broadcast crystal. Announce winner. They'll be friends next week, enemies the week after. Show final scoreboard, name MVP. End with 'Full intel at 9lv.net'.",
    images: ["30.1.png", "30.2.png", "30.3.png", "30.4.png"]
  },

  {
    id: 31,
    title: "The Prophet of Starfall Crater",
    theme: "Crypto influencer / 'trust the process' parody — a wizard who predicted three things correctly, 2,000 followers, premium access for 5 gold/month.",
    tweet_1: "⭐ A wizard appeared at Starfall Crater claiming he can see the future.\n\nHe predicted three things correctly. Now he has two thousand followers.\n\nHis predictions are vague — 'something will change' and 'trust the process.' He sells premium access for five gold a month.\n\nThe prophet says treasure is buried in the crater.\n\nWhich community profits most — digging or selling shovels?\nRally your people — reply to join the raid! 🐱‍👤",
    tweet_2_prompt: "Continue the prophet story. Latest prediction: 'The stars align at dusk. This changes everything.' 2,000 wizards digging. Found rocks. Prophet says rocks are 'significant' — premium subscribers told WHICH rocks. Shovel seller making more than anyone digging. Include live standings. 'Few understand' energy.",
    tweet_3_prompt: "Build urgency — the alignment is almost upon them. Last chance to dig. Show updated standings. 'Trust the process.'",
    tweet_4_prompt: "Resolve — they found... something. Treasure or drainage pipe. Prophet says it confirms his vision. Announce winner. Premium now costs ten gold. Show final scoreboard, name MVP. End with 'Full intel at 9lv.net'.",
    images: ["31.1.png", "31.2.png", "31.3.png", "31.4.png"]
  },

  {
    id: 32,
    title: "The Letter from the Distant Prince",
    theme: "Nigerian prince scam parody — 'Prince Aldremor' requesting 500 gold to unlock a 40 million gold shipwreck. The scam is fake but the shipwreck is real.",
    tweet_1: "📜 Every wizard in Avaloris received the same scroll this morning:\n\n'Greetings. I am Prince Aldremor of the Farlands. I have 40 million gold trapped in a shipwreck and require your assistance. Please send 500 gold. You will receive 30%.'\n\nObviously a scam. But... the shipwreck he mentioned matches actual port records.\n\nWhich community reaches the wreck first?\nRally your people — reply to join the raid! 🐱‍👤",
    tweet_2_prompt: "Continue the Nigerian prince story. 4,000 wizards sent 500 gold — 'Prince Aldremor' has two million. But the shipwreck IS real. The cargo IS real. The scam was accidentally based on truth. Include live standings showing wreck recovery. Internet scam humor meets actual treasure hunt.",
    tweet_3_prompt: "Build urgency — the wreck is being claimed fast. Show updated standings. 'Blessings, Prince Aldremor.'",
    tweet_4_prompt: "Resolve — wreck found, cargo split. Announce winner. Prince Aldremor sent a follow-up thanking everyone for their 'partnership.' A new scroll arrived tonight — different prince, different shipwreck. Show final scoreboard, name MVP. End with 'Full intel at 9lv.net'.",
    images: ["32.1.png", "32.2.png", "32.3.png", "32.4.png"]
  },

  // ===========================
  // ABSURDIST / SOUTH PARK (33-37)
  // ===========================

  {
    id: 33,
    title: "The Underpants Operation of Ironbark",
    theme: "Underpants gnomes parody — Phase 1: Steal, Phase 2: ???, Phase 3: Profit. They got investor funding. Their HQ has blueprints for everything.",
    tweet_1: "📋 Tiny creatures have been raiding storerooms across Stonebark territory.\n\nTheir operation has three phases:\nPhase 1: Steal supplies\nPhase 2: ???\nPhase 3: Profit\n\nWhen questioned, they produced a very confident diagram. Phase 2 remains blank. They seem completely unbothered.\n\nTheir HQ has blueprints for everything.\n\nWhich community profits from Phase 3?\nRally your people — reply to join the raid! 🐱‍👤",
    tweet_2_prompt: "Continue the gnomes story. They now have HQ, mission statement, and investor funding. Phase 2 still blank. A consultant hired to define Phase 2 — doesn't know, charges by the hour. The gnomes consider this Phase 2. Blueprints show every building. Include live standings. Startup culture satire.",
    tweet_3_prompt: "Build urgency — gnomes about to 'go public,' blueprints will be locked away. Last chance to raid HQ. Show updated standings.",
    tweet_4_prompt: "Resolve — gnomes secured funding, went public. Phase 2 listed as 'synergy' in crystal filings. Stock went up. Announce winner. Show final scoreboard, name MVP. End with 'Full intel at 9lv.net'.",
    images: ["33.1.png", "33.2.png", "33.3.png", "33.4.png"]
  },

  {
    id: 34,
    title: "The Curse of the Hooded Apprentice",
    theme: "Kenny dies parody — a hooded apprentice who dies constantly and comes back. 'Oh no. Anyway.' Every death scatters free spell components.",
    tweet_1: "💀 A hooded apprentice died again today. This is the fourteenth time this season.\n\nCrushed by a cart. Eaten by a griffin. Struck by extremely improbable lightning indoors.\n\nEvery morning he comes back. Every evening something kills him.\n\n'Oh no,' says one friend. 'Anyway,' says the other.\n\nEvery death scatters spell components. Which community collects the most?\nRally your people — reply to join the raid! 🐱‍👤",
    tweet_2_prompt: "Continue the Kenny death story. Died twice since this morning — chandelier, then griffin. Cleric refuses to resurrect anymore. Friends discussing lunch. Apprentice reappeared at tavern door, confused. Include live standings. Dark, absurd, weirdly casual about death.",
    tweet_3_prompt: "Build urgency — the apprentice is about to walk into something dangerous again. Position yourself. Show updated standings. Death count approaching a record.",
    tweet_4_prompt: "Resolve — hooded apprentice died seven times today. New record. Announce winner. He'll be back tomorrow. 'Oh no. They killed the apprentice. Those individuals.' Show final scoreboard, name MVP. End with 'Full intel at 9lv.net'.",
    images: ["34.1.png", "34.2.png", "34.3.png", "34.4.png"]
  },

  {
    id: 35,
    title: "The Prophecy Nobody Read",
    theme: "'We didn't listen!' parody — an ancient prophecy predicted everything, filed under 'miscellaneous.' The last page describes buried treasure.",
    tweet_1: "📖 An ancient prophecy was discovered in the library.\n\nIt predicted everything that happened this season — the plagues, the wars, the exact date the Exchange collapsed.\n\nIt was filed under 'miscellaneous.' Three people checked it out. None of them finished it.\n\nThe last page contains instructions for finding massive buried treasure.\n\nWhich community digs while everyone else debates?\nRally your people — reply to join the raid! 🐱‍👤",
    tweet_2_prompt: "Continue the unread prophecy story. Realm in chaos over predictions. Scholars arguing, Council formed a committee. Nobody read the last page about treasure. One wizard read the whole thing — digging quietly while everyone yells. Include live standings. 'We didn't listen' energy.",
    tweet_3_prompt: "Build urgency — the committee about to seal the prophecy 'for study.' Treasure location won't be public much longer. Show updated standings.",
    tweet_4_prompt: "Resolve — scholars still arguing. Treasure was found. Announce winner as the community that dug while everyone debated. The prophecy predicted this too — page four. Nobody read page four. Show final scoreboard, name MVP. End with 'Full intel at 9lv.net'.",
    images: ["35.1.png", "35.2.png", "35.3.png", "35.4.png"]
  },

  {
    id: 36,
    title: "The Archive That Predicted Everything",
    theme: "Simpsons did it parody — an archive where every event was predicted centuries ago. 'The archive already did it!'",
    tweet_1: "📚 A dusty archive was found in the basement of a comedy theatre.\n\nIt contains scrolls dating back centuries. Every major event in Avaloris was described in these scrolls years before it happened.\n\nEvery time someone announces a plan, a scholar finds the scroll where it already happened.\n\nThe scrolls describe tomorrow. Which community claims the most?\nRally your people — reply to join the raid! 🐱‍👤",
    tweet_2_prompt: "Continue the Simpsons-did-it story. Three houses have researchers stationed. Every plan proposed — 'the archive already did it!' A wizard checked if his lunch is in there — it is, from 300 years ago. The archive contains a scroll about TODAY, about this exact event. Include live standings. Meta-humor, 'nothing is original.'",
    tweet_3_prompt: "Build urgency — archive about to be split among houses. Last chance to claim predictive scrolls. Show updated standings.",
    tweet_4_prompt: "Resolve — archive split. Announce winner. A wizard checked if the archive predicted its own discovery — it did, page one. Show final scoreboard, name MVP. End with 'Full intel at 9lv.net'.",
    images: ["36.1.png", "36.2.png", "36.3.png", "36.4.png"]
  },

  {
    id: 37,
    title: "The Great Speed Trial",
    theme: "Speedrunning parody — a trial dungeon meant to take 3 hours completed in 4 minutes by clipping through walls. 'The Academy says this doesn't count. The wizard says it absolutely counts.'",
    tweet_1: "🏃 The Academy set up a trial dungeon — a standard combat-puzzle-treasure course meant to take three hours.\n\nA wizard completed it in four minutes by clipping through a wall, skipping the boss via a geometry exploit, and finishing before the treasure room loaded properly.\n\nThe Academy says this doesn't count. The wizard says it absolutely counts.\n\nFastest time wins. Method optional.\nRally your people — reply to join the raid! 🐱‍👤",
    tweet_2_prompt: "Continue the speedrun story. Legitimate runners on floor three. Speedrunners already finished TWICE, arguing milliseconds. One wizard discovered you can skip the dungeon by talking to an NPC backwards. Academy patching walls — speedrunners finding new skips. Include live standings. Speedrun community energy.",
    tweet_3_prompt: "Build urgency — trial closing soon. Academy patches creating new exploits. Show updated standings. 'The walls are suggestions.'",
    tweet_4_prompt: "Resolve — trial closed. The fastest time used none of the intended route. Announce winner. Academy announced a second trial — speedrunners already mapping it. Show final scoreboard, name MVP. End with 'Full intel at 9lv.net'.",
    images: ["37.1.png", "37.2.png", "37.3.png", "37.4.png"]
  },

  // ===========================
  // PURE FANTASY / ORIGINALS (38-40)
  // ===========================

  {
    id: 38,
    title: "The Sleeper Beneath Dragon's Rest",
    theme: "Dragon hoard raid — something enormous shifted underground. Cracks reveal gold. The dragon hasn't opened its eyes yet but it's breathing faster. High risk, high reward.",
    tweet_1: "🐉 Something enormous shifted beneath Dragon's Rest last night.\n\nThe ground is warm. Cracks have appeared in the earth, revealing glimpses of gold below — a hoard so vast it has its own weather system.\n\nMerchants fled at dawn. The dragon hasn't opened its eyes yet. But it's breathing faster.\n\nHow much do you grab before it wakes?\nRally your people — reply to join the raid! 🐱‍👤",
    tweet_2_prompt: "Continue the dragon hoard story. Braver wizards descended — gold is real, everywhere. One eye opened briefly, then closed. Temperature risen ten degrees. A wizard filled three sacks before a tail sealed the crack — technically wealthy, practically trapped. Include live standings. Dragon heist energy — greed vs survival.",
    tweet_3_prompt: "Build urgency — cracks widening but dragon stirring more. Both eyes could open any moment. Show updated standings. Time vs greed.",
    tweet_4_prompt: "Resolve — dragon shifted but didn't fully wake. Cracks resealed. Announce winner. The ground is still warm, breathing continues. Next time it might open both eyes. Show final scoreboard, name MVP. End with 'Full intel at 9lv.net'.",
    images: ["38.1.png", "38.2.png", "38.3.png", "38.4.png"]
  },

  {
    id: 39,
    title: "The Mana Storm at Starfall Crater",
    theme: "Raw magical chaos — a mana storm amplifying all spells wildly. Triple points but unpredictable surges. A wizard accidentally invented a new colour.",
    tweet_1: "⚡ A mana storm has formed over Starfall Crater. Raw magical energy is falling like rain.\n\nSpells cast in the storm are amplified wildly — a cantrip might level a building, a healing spell might resurrect something that was never alive.\n\nThe Academy recommends staying indoors. Nobody is staying indoors.\n\nTriple points. Triple chaos.\nRally your people — reply to join the raid! 🐱‍👤",
    tweet_2_prompt: "Continue the mana storm story. A light spell created a second sun for eleven seconds. A shield spell made someone invisible. A fire bolt invented a new colour. Academy observers now casting too — professionalism collapsed. Include live standings. Magical chaos energy — triple everything.",
    tweet_3_prompt: "Build urgency — storm at its peak. Maximum amplification, maximum chaos. Show updated standings. The storm could end any moment. 'The math works if you survive it.'",
    tweet_4_prompt: "Resolve — storm passed. Crater changed — new formations, strange plants, humming ground. Announce winner. A new colour exists — nobody has named it. Show final scoreboard, name MVP. End with 'Full intel at 9lv.net'.",
    images: ["39.1.png", "39.2.png", "39.3.png", "39.4.png"]
  },

  {
    id: 40,
    title: "The Final Lesson at the Ancient Ruins",
    theme: "The old wizard's last day — casting his greatest spell. Pages from his spellbook scatter on magical currents. Some brilliant, some gibberish, some both.",
    tweet_1: "🧙 The oldest wizard in Avaloris has announced this is his last day.\n\nHe's going to cast one final spell — his greatest work, decades in the making — at the Ancient Ruins.\n\nHe says the spell will 'teach everyone something different.' He's smiling.\n\nOld wizards who smile are either wise or dangerous.\n\nPages from his spellbook are scattering. Which community collects the most?\nRally your people — reply to join the raid! 🐱‍👤",
    tweet_2_prompt: "Continue the old wizard's final lesson story. Three hours of casting — slow, layered, impossibly complex. Pages drifting on magical currents across the ruins. Each reveals a different enchantment — some brilliant, some gibberish, some both. He's still casting. Include live standings. Poignant fantasy tone — epic but melancholy.",
    tweet_3_prompt: "Build urgency — his knowledge won't float forever. Pages dispersing further. Show updated standings. Rare pages landing in contested areas. The wizard is still smiling.",
    tweet_4_prompt: "Resolve — spell completed. Nobody sure what it did but everyone feels slightly different. Announce winner. The old wizard sat down, closed his eyes. Still breathing. Still smiling. Show final scoreboard, name MVP. End with 'Full intel at 9lv.net'.",
    images: ["40.1.png", "40.2.png", "40.3.png", "40.4.png"]
  },

];

// ============================================
// HELPER FUNCTIONS
// ============================================

function getRandomNarrative(recentIds = []) {
  const available = narratives.filter(n => !recentIds.includes(n.id));
  if (available.length === 0) return narratives[Math.floor(Math.random() * narratives.length)];
  return available[Math.floor(Math.random() * available.length)];
}

function getNarrativeById(id) {
  return narratives.find(n => n.id === id) || null;
}

function getAllNarrativeIds() {
  return narratives.map(n => ({ id: n.id, title: n.title, theme: n.theme }));
}

module.exports = {
  narratives,
  getRandomNarrative,
  getNarrativeById,
  getAllNarrativeIds,
};