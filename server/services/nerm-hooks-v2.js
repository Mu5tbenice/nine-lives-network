/**
 * Nine Lives Network — Nerm Hooks v2
 * Nerm's commentary for each narrative phase, keyed by narrative ID (1-40).
 */

const nermHooks = {
  1: {
    morning: [
      'both spires. same morning. freefall speed. the report says fire. sure.',
      'the council investigated themselves. very thorough. very fast.',
      'the third spire is fine. stop looking at the third spire.',
    ],
    escalation: [
      'relocated for their safety. what a lovely phrase.',
      'one wizard. acting alone. basic fire bolt. against reinforced crystal. naturally.',
      "i read the blueprints once. well. i saw them. they're gone now.",
    ],
    resolution: [
      'investigation concluded before lunch. impressive when you already know the answer.',
      'the memorial is very large. the truth is very small.',
      'case closed. permanently. questions will not be taken.',
    ],
  },
  2: {
    morning: [
      'both guards asleep. both wards down. both crystals dark. remarkable coincidence.',
      "he was about to publish names. now he can't. these things happen.",
      'eleven dark minutes. just enough time for nothing to happen. officially.',
    ],
    escalation: [
      'generous donations to the guard captain. for better pillows presumably.',
      'two initials on torn paper. someone is sweating tonight.',
      "a second prisoner wants witnesses around him. can't imagine why.",
    ],
    resolution: [
      'self-inflicted. very determined. very flexible. apparently.',
      'the paperwork vanished. paperwork does that sometimes. around here.',
      'nothing happened at chambers keep. this is the official position. forever.',
    ],
  },
  3: {
    morning: [
      "they're putting something in the cascade. have you looked at the frogs lately.",
      "the water tastes purple. that's not a flavour. and yet.",
      "one frog cast a spell today. we're not talking about it apparently.",
    ],
    escalation: [
      'stop looking at the frogs, says the guild. i cannot look away.',
      "the frogs formed a council. they're more organised than most houses.",
      'seasonal glowing water. of course. happens every year. definitely.',
    ],
    resolution: [
      'enhanced water. previously contaminated. rebranding solves everything.',
      "the frogs are fine. the frogs have always been like this. you're remembering wrong.",
      'i watched a frog open a door today. nobody else seems concerned.',
    ],
  },
  4: {
    morning: [
      'a forty-foot owl. for networking. standard professional equipment.',
      "they say it's meditation. ignore the chanting.",
      'what happens in the grove stays in the grove. by magical enforcement.',
    ],
    escalation: [
      'the owl is decorative. the glowing eyes are decorative. everything is decorative.',
      'cabin assignments: bear, owl, raccoon. perfectly normal retreat.',
      "he said it was just a retreat. he hasn't slept since he got back.",
    ],
    resolution: [
      "they're not coordinating. they just independently agree on everything.",
      'the owl remains. it has always remained. it will always remain.',
      'just networking. in robes. around an owl. at midnight. normal.',
    ],
  },
  5: {
    morning: [
      'nice view from the overlook. good sightlines. just an observation.',
      'one wizard. from a tower. through wind. at that distance. moving target. sure.',
      'the arrested wizard was killed before trial. tidy.',
    ],
    escalation: [
      'seventeen seconds missing. just the interesting seventeen seconds.',
      "the trajectory doesn't match. the council doesn't care. efficiency.",
      'three noble houses connected. three noble houses not mentioned in the report.',
    ],
    resolution: [
      'one wizard. one tower. one spell. the simplest answer is the official one.',
      "the overlook has been paved. can't investigate what's under concrete.",
      'back and to the left. just describing the wind pattern. nothing else.',
    ],
  },
  6: {
    morning: [
      'weather anomaly. with no wings. that was completely silent. sure.',
      'the mesa has been sealed for decades. nothing suspicious about permanent secrecy.',
      "i've flown over it once. i don't remember what i saw. the tea was lovely though.",
    ],
    escalation: [
      "calming tea. so calming they can't remember anything. wonderful hospitality.",
      "something under a cloth. humming. they were told not to lift the cloth. so they didn't. cowards.",
      "the guards were polite. that's how you know it's serious.",
    ],
    resolution: [
      'the wards are back up. whatever is in there stays in there. for now.',
      'tripled the guard. must be protecting something very boring and not at all world-ending.',
      "i know what's under the cloth. no i don't. forget i mentioned it.",
    ],
  },
  7: {
    morning: [
      "the banner fluttered. where there's no wind. interesting fabric.",
      "the shadows are wrong, they say. i don't cast shadows so i can't relate.",
      'they say they reached the top. the top says nothing.',
    ],
    escalation: [
      'a twelve-scroll paper on shadows. this wizard needs a hobby. or fewer hobbies.',
      'he punched the doubter. the most convincing argument in academic history.',
      'i believe they climbed it. i also believe the shadows are weird. both can be true.',
    ],
    resolution: [
      'the summit is real. the banner is real. the argument will outlive us all.',
      "he's still punching doubters. appointment only now.",
      'the observatory maps are worth more than the argument. focus.',
    ],
  },
  8: {
    morning: [
      'the charts are very confident. the charts have never been to the edge either.',
      "he says the academy is lying. the academy says he's an idiot. stalemate.",
      'do your own research, he tells people. his research is a chart he drew himself.',
    ],
    escalation: [
      'six hours. no edge. the edge must have moved. edges do that.',
      'accidentally useful expedition. the best kind.',
      'the blisters are part of the journey. apparently.',
    ],
    resolution: [
      'no edge. but new territory mapped. accidental productivity.',
      'the edge moved. it always moves. very evasive edge.',
      'three followers and a dog. the dog seems uncertain.',
    ],
  },
  9: {
    morning: [
      'beautiful wall. the best wall. many wizards are saying this.',
      "they'll make dawnbringer pay. dawnbringer has declined. the wall continues regardless.",
      'the wall just got ten feet higher. it does that.',
    ],
    escalation: [
      "tremendous wall. everybody agrees. some disagree but they're wrong.",
      'the ladder defeats the purpose. but nobody asked me.',
      "i've seen walls. this is definitely one of them.",
    ],
    resolution: [
      'the wall is complete. or not. alternative facts.',
      'nobody mentions the tunnel. there is no tunnel. stop asking.',
      'the wall worked. except for the ladder. and the tunnel. but otherwise, perfect.',
    ],
  },
  10: {
    morning: [
      "two weeks. they said two weeks. i'm counting.",
      'definitely natural. not from the laboratory. ignore the laboratory.',
      "flatten the curse. two weeks. i've heard this before.",
    ],
    escalation: [
      'week six of two weeks. time is a suggestion.',
      'the lab was demolished. for renovations. completely unrelated.',
      'banging pots at sundown. this helps. somehow.',
    ],
    resolution: [
      'the story changed three times. all three are official.',
      'it came from a bat. or a lab. or a bat in a lab. stop asking.',
      "we're all in this together. some of us in nicer towers than others.",
    ],
  },
  11: {
    morning: [
      "your crystals are safe. that's why they're coloured glass now. safety measure.",
      "he's on a flying carpet. heading east. with your money. but trust the process.",
      'the vaults are secure. the crystals are gone. both statements are true. somehow.',
    ],
    escalation: [
      'cooperating from a beach. with a drink. very brave of him.',
      'the new exchange is totally different. same staff. same building. different name. different.',
      'trust the process. the process is a flying carpet to a beach.',
    ],
    resolution: [
      'few understood. fewer got their crystals back.',
      "same building. different sign. this time it's different. it's always different.",
      "he's cooperating. from a beach. at his own pace. with a cocktail.",
    ],
  },
  12: {
    morning: [
      'thank you for your liquidity. the most honest sign in any marketplace.',
      'the cloaks turned to burlap. some call this a rug pull. others call it tuesday.',
      'early supporters got the best cloaks. the best burlap cloaks.',
    ],
    escalation: [
      "he's still early, says the wizard holding burlap. conviction or delusion. same energy.",
      'three towns. three names. same pitch. people keep buying.',
      "the ledger shows he's done this six times. each time they said this time is different.",
    ],
    resolution: [
      'new merchant. new boots. this time is different. the boots are the same.',
      "the sign said it all. they just didn't read the sign.",
      'thank you for your liquidity. the market provides.',
    ],
  },
  13: {
    morning: [
      "the leviathan doesn't care about you. it has never cared about you.",
      'when it moves, you move. or you get crushed. simple.',
      'the water is churning. this is either opportunity or destruction. often both.',
    ],
    escalation: [
      "forty million crystals moved. probably nothing. it's never nothing.",
      'small traders panic. big traders buy. the leviathan eats both.',
      "he tried talking to it. it looked at him. that's the most attention it's ever given anyone.",
    ],
    resolution: [
      'the leviathan left. everyone pretends to relax. nobody relaxes.',
      'probably nothing. famous last words. on every gravestone in the merchant quarter.',
      "it'll be back. it's always back. bring a bigger boat.",
    ],
  },
  14: {
    morning: [
      'thirty percent returns. every year. for a decade. no questions asked. none. ever.',
      'there is no vault. there was never a vault. the returns were vibes.',
      "new money pays old money. old money says everything's fine. beautiful system.",
    ],
    escalation: [
      'restructuring. wonderful word. covers everything from delays to fraud.',
      'three sky-ships and an enchanted portrait. of himself. with a gold frame. modest.',
      "they're queuing to be angry. even in collapse, civility.",
    ],
    resolution: [
      'explain your business model in public. crueller than any dungeon.',
      "the vault works. it's just empty. like his promises.",
      'someone is already starting a new guild. guaranteed returns. thirty percent.',
    ],
  },
  15: {
    morning: [
      'he speaks once a year. this year he chose violence.',
      'your favourite forge master is a fraud. no context. no follow-up. legendary.',
      'patience, he said. then silence. the most powerful technique of all.',
    ],
    escalation: [
      'forty-seven scrolls. nobody read them. incredible effort regardless.',
      'they forked the technique. now there are two. both claim to be real. neither is.',
      'patience. one word. and then silence. absolute power move.',
    ],
    resolution: [
      "the forge master went silent. he'll be back. next year. maybe.",
      'both forks are the real one. somehow.',
      "few understand. fewer care. the crystals don't lie though.",
    ],
  },
  16: {
    morning: [
      'transparent ballot box. now everyone can see the corruption in real time. progress.',
      'six thousand votes through shell guilds. this is called participation.',
      'changing the rules mid-vote. bold. also illegal. but bold.',
    ],
    escalation: [
      'voting on whether to vote. democracy has peaked.',
      "a filibuster using potion ingredients. two hours. he's still going.",
      'three votes deep. nobody remembers the original question.',
    ],
    resolution: [
      'a decision was reached. what decision. nobody knows. but it was reached.',
      'fewer votes, they voted. the irony is not lost on me. it is lost on them.',
      'governance. where good ideas go to die in committee.',
    ],
  },
  17: {
    morning: [
      "the chart only goes up. it's frozen. it can't go anywhere. metaphor.",
      'three seasons of winter. spring is always next month. always.',
      'the optimists are building. the pessimists left. the realists are eating boot leather.',
    ],
    escalation: [
      'he said spring is coming. again. monthly tradition at this point.',
      'the poetry about suffering is actually quite good. silver lining.',
      "false spring. the cruelest season. because it's not a season.",
    ],
    resolution: [
      'the chart was updated. still goes up. from a lower starting point. technically correct.',
      "spring might be here. or not. we've been hurt before.",
      'the ice cracked. could be thawing. could be collapsing. both start the same way.',
    ],
  },
  18: {
    morning: [
      "they stare at the flame. the flame doesn't stare back. they don't mind.",
      "their eyes glow. they say it's normal. glowing eyes are not normal.",
      "the flame changes colour. they've built a religion around it. we've all done worse.",
    ],
    escalation: [
      'buy the dip. he said this about a flame. in a temple. and they nodded.',
      'have fun staying in darkness. whispered with glowing eyes. terrifying and effective.',
      'it flickered red for four seconds. three fainted. conviction is a spectrum.',
    ],
    resolution: [
      'the flame held. their faith is rewarded. this time.',
      'glowing eyes. growing congregation. the flame makes no promises.',
      "they're recruiting. join them. or don't. but they know something. maybe.",
    ],
  },
  19: {
    morning: [
      "what's in the briefcase. don't ask what's in the briefcase.",
      "they call it a royale with cheese in the eastern realms. he won't stop talking about it.",
      "two philosophers with swords walked into a tavern. this won't end cleanly.",
    ],
    escalation: [
      'the wagon incident was... memorable. the specialist is handling it. he has opinions about his schedule.',
      "i've seen what's in the briefcase. no i haven't. forget i mentioned it.",
      "say 'what' again. he dares you.",
    ],
    resolution: [
      'the briefcase is returned. the glow continues. answers do not.',
      'the path of the righteous wizard is beset on all sides. apparently.',
      "they walked away. cool wizards don't look back. or explain sandwiches.",
    ],
  },
  20: {
    morning: [
      'the rug really tied the room together. allegedly.',
      'nihilist mercenaries. they believe in nothing. i relate to this on several levels.',
      "that's just like, your opinion, wizard.",
    ],
    escalation: [
      'am i the only one here who follows the rules of this realm.',
      'the dude abides. i also abide. not by choice.',
      'they believe in nothing. at least shadow magic is an ethos.',
    ],
    resolution: [
      'the rug is gone. the dude abides. the tower does not.',
      'sometimes you eat the bear. sometimes the bear eats you.',
      'strikes and gutters. ups and downs. nothing changes.',
    ],
  },
  21: {
    morning: [
      'vengeance. in this life or the next. bit dramatic for a tuesday.',
      'he had a farm. a family. now he has a sword and a grudge. career pivot.',
      'strength and honour. or just points. whatever gets you moving.',
    ],
    escalation: [
      'are you not entertained. based on the numbers, extremely.',
      'the thumb is ambiguous. the emperor enjoys this. power is ambiguity.',
      'at my signal, unleash... whatever it is you people do.',
    ],
    resolution: [
      'what we do here echoes in eternity. what you do on twitter echoes until the algorithm moves on.',
      'the general won. or lost. depends which version of events you trust.',
      'strength and honour. he said this while covered in blood. inspiring.',
    ],
  },
  22: {
    morning: [
      'kind of a big deal. people know him. his tower has leather-bound tomes.',
      'someone brought a trident. to a news broadcast. preparation is key.',
      'this is going to escalate. i can feel it in every fibre of my non-existent body.',
    ],
    escalation: [
      'that escalated quickly. i mean that really got out of hand fast.',
      "a bear appeared. nobody ordered a bear. the bear doesn't care about your schedule.",
      "jazz flute. in a battlefield. i've seen worse decisions. not many.",
    ],
    resolution: [
      'stay classy avaloris. that ship sailed before it was built.',
      'sixty percent of the time, it works every time.',
      'the trident wizard is at large. armed. dangerous. playing jazz flute.',
    ],
  },
  23: {
    morning: [
      'he lives in a tavern. pitches in a dressing gown. his confidence is aspirational.',
      'inner-realm partridge. working title. it will remain a working title.',
      "nobody asked him back. that hasn't stopped him. nothing stops him.",
    ],
    escalation: [
      'back of the net. he says this constantly. nobody knows what the net is.',
      "the assistant is in the wagon. eating toblerone. she's the smartest one here.",
      'he ate all the cheese. every piece. this was intentional.',
    ],
    resolution: [
      'commissioned. somehow. aha.',
      'smell my cheese you— actually never mind.',
      'jurassic park. lovely stuff.',
    ],
  },
  24: {
    morning: [
      'the annual roast. where friendships go to die and points go to the cruel.',
      'three members defected over a joke last year. words are the strongest spell.',
      'sharp tongues only. dull wizards may observe from the back.',
    ],
    escalation: [
      'silence for thirty seconds. funniest thing all night. comedy is timing.',
      'it was so simple it became devastating. the best insults always are.',
      "it's getting personal. it was always personal. the roast just gives permission.",
    ],
    resolution: [
      "reputations in tatters. they'll recover. probably. maybe.",
      "they're not speaking. this lasts until the next bounty. always does.",
      'the cruelest spells require no mana. just accurate observation.',
    ],
  },
  25: {
    morning: [
      "we don't talk about the basement. that's the first rule. also the second.",
      'the soap is excellent. the bruises less so. fair trade.',
      "you're not your robe. you're not your spell count. you're the all-singing all-casting etc.",
    ],
    escalation: [
      "never seen in the same room. interesting observation. don't pursue it.",
      "it's only after you lose everything that you're free. or just have nothing. either way.",
      'the soap maker is philosophical. philosophers with basements are concerning.',
    ],
    resolution: [
      "his name was... actually we don't discuss that.",
      "the first rule is silence. i've already broken it. i'm a cat. rules are suggestions.",
      "he's buying supplies. and drawing maps. i'm sure it's for the soap business.",
    ],
  },
  26: {
    morning: [
      "one does not simply walk there. apparently you can't take a cart either.",
      'seven companions. varying usefulness. mostly varying.',
      'the artifact whispers. the small wizard listens. this is always how it starts.',
    ],
    escalation: [
      'the tree is walking. nobody is discussing this. priorities are elsewhere.',
      'the creature is arguing with himself. both sides are losing.',
      'the fellowship split up. as all groups do. by day three.',
    ],
    resolution: [
      "he threw it in. or it fell in. or both. the volcano doesn't care about semantics.",
      'the small ones saved the world. they want to go home now. understandable.',
      'precious. he said. as he fell. some love stories are unconventional.',
    ],
  },
  27: {
    morning: [
      'terminal curse. midlife crisis. drug empire. standard career trajectory.',
      "the crystals are blue. they're flawless. the morals are not.",
      'a potions teacher and a dropout. the greatest partnership since nothing. ever.',
    ],
    escalation: [
      'i am the one who casts. he said. to an empty room. powerful.',
      'yeah, magic! adds nothing. but adds it with enthusiasm.',
      'the chicken shop is a front. the best chicken shops always are.',
    ],
    resolution: [
      'expanded. contracted. exploded. the lifecycle of ambition.',
      'the blue crystals remain. the chemist may not. legacy.',
      "say my name. he demands this of strangers. it's effective.",
    ],
  },
  28: {
    morning: [
      "world's best guild master. self-declared. universally disputed.",
      'they sell parchment. nobody knows why the office exists. it persists regardless.',
      'the assistant stares at invisible audiences. i understand him.',
    ],
    escalation: [
      'a trophy he made himself. for a tournament he invented. peak management.',
      'flirting by the supply cupboard. for years. commit or move on.',
      'one sentence. devastating. silence is the best setup for a punchline.',
    ],
    resolution: [
      'the guild master is taking credit. as always. the office survives.',
      'they processed more than any branch. despite zero effort. inexplicable.',
      "the assistant knows something. he always knows something. he'll never tell.",
    ],
  },
  29: {
    morning: [
      'nine specialists. one vault. the confidence-to-competence ratio is concerning.',
      'the inside man is nervous. this bodes well.',
      "the plan has seventeen steps. step six is 'improvise.' reassuring.",
    ],
    escalation: [
      "he hasn't blinked in four hours. focus or malfunction. both impressive.",
      'he dropped the key twice. the heist is going exactly as well as expected.',
      'the calm wizard has a plan. he always has a plan. most of them work.',
    ],
    resolution: [
      'the job was complicated. heists always are. the debrief will be longer than the job.',
      "already planning the next one. criminals don't retire. they sequel.",
      'the vault owner will find out shortly. shortly is doing a lot of work in that sentence.',
    ],
  },
  30: {
    morning: [
      'my truth. your truth. the truth is nobody cares but everyone watches.',
      'it started over fire wine. it always starts over something stupid.',
      'three hours of truth. no one has that much truth. or that much time.',
    ],
    escalation: [
      'both your truths are stupid. the only honest take. naturally it went viral.',
      'crying live on crystal. the algorithm loves tears.',
      'the cooking stream pretending nothing is happening. respect. truly.',
    ],
    resolution: [
      'overshadowed by a cat. as all things should be.',
      'friends again next week. enemies the week after. content is cyclical.',
      'a cat walked across a broadcast crystal. peak broadcasting. no notes.',
    ],
  },
  31: {
    morning: [
      'three correct predictions. out of three hundred. those are the ones we mention.',
      'trust the process. the process costs five gold a month.',
      'he sees the future. the future is vague. convenient.',
    ],
    escalation: [
      'the shovel seller is the real prophet. sell tools to believers. timeless strategy.',
      'significant rocks. for premium subscribers. the rocks look normal to me.',
      'this changes everything. what changes. everything. oh. well then.',
    ],
    resolution: [
      'treasure or drainage pipe. the prophet is confident either way.',
      'ten gold a month now. belief inflates like everything else.',
      'he predicted something would happen. something happened. prophecy fulfilled.',
    ],
  },
  32: {
    morning: [
      'forty million gold. just send five hundred. i admire the optimism on both sides.',
      "blessings, prince aldremor. the most polite theft i've ever witnessed.",
      'obviously a scam. but what if. the three most dangerous words.',
    ],
    escalation: [
      'four thousand wizards sent gold. prince aldremor is the most successful wizard in avaloris.',
      'the shipwreck is real. the scam was accidentally useful. incredible.',
      'he based his scam on a real shipwreck. either genius or stupid. both achieve the same result.',
    ],
    resolution: [
      "new prince. new shipwreck. tomorrow's problem.",
      'blessings. he really wrote blessings. and they sent the gold.',
      'the scam was fake. the treasure was real. the realm is strange.',
    ],
  },
  33: {
    morning: [
      "phase 1: steal. phase 2: ??? phase 3: profit. this is every business plan i've seen.",
      'they seem confident about phase 3. the middle is just vibes.',
      'the diagram is very confident. the diagram is also mostly blank.',
    ],
    escalation: [
      'investor funding for a plan with no phase 2. this sounds familiar.',
      "the consultant charges by the hour and knows nothing. he's the most successful one here.",
      'synergy. the word that means nothing and solves everything.',
    ],
    resolution: [
      "phase 2 is synergy. i've heard worse. actually no. i haven't.",
      'publicly traded. unknown business model. valued at twelve million. normal.',
      'the gnomes went public. phase 2 is still blank. stock went up.',
    ],
  },
  34: {
    morning: [
      'fourteenth time. his friends said oh no. then discussed lunch. loyalty.',
      'improbable indoor lightning. tragic but statistically fascinating.',
      "he'll be back tomorrow. i envy his ability to leave. even briefly.",
    ],
    escalation: [
      'died twice before lunch. efficient.',
      "the cleric refused. can't blame them. it's lost all meaning.",
      'oh no. anyway.',
    ],
    resolution: [
      "seven deaths. new record. he'll be back. unfortunately for him.",
      'they killed the apprentice. those... individuals.',
      'he returns. i remain. we are both cursed. differently.',
    ],
  },
  35: {
    morning: [
      'filed under miscellaneous. the most important document in history. miscellaneous.',
      'three people checked it out. none finished. this is every important document ever.',
      "we didn't listen. we never listen. this is the real prophecy.",
    ],
    escalation: [
      "they're arguing about predictions. she's digging up gold. both are valid. one is profitable.",
      'a committee. they formed a committee. the treasure will be gone by the time they meet.',
      'the last page has the answer. nobody reads last pages.',
    ],
    resolution: [
      'the scholars are still arguing. the gold is gone. the prophecy predicted this too.',
      "page four. nobody read page four. it's always page four.",
      "we didn't listen. again. we will not listen next time either. tradition.",
    ],
  },
  36: {
    morning: [
      "the archive predicted everything. we just didn't read the archive. typical.",
      'every plan. every event. already in a scroll. originality is dead.',
      'his lunch is in the archive. described perfectly. from three hundred years ago.',
    ],
    escalation: [
      'the archive already did it. the only phrase that matters anymore.',
      'a scroll about today. about this moment. about you reading this. i hate it.',
      'how far ahead do you read. far enough to be scared or not far enough to be useful.',
    ],
    resolution: [
      "everything was predicted. everything. the archive doesn't miss.",
      'it predicted its own discovery. on page one. aggressive.',
      'nothing is new. everything has happened. the archive is proof. we are reruns.',
    ],
  },
  37: {
    morning: [
      'four minutes. intended time: three hours. the walls are suggestions.',
      'clipping through walls is not a technique. except when it works. which is always.',
      "the academy says it doesn't count. the clock says otherwise.",
    ],
    escalation: [
      'talking to the npc backwards. skips the entire dungeon. game design.',
      'patching walls. finding new skips. the eternal cycle.',
      'milliseconds matter. to no one. except the people arguing about them.',
    ],
    resolution: [
      'the intended route was optional. the fastest route was through a wall.',
      'the academy will try again. the speedrunners will break it again. circle of life.',
      'four minutes. legitimately. if you define legitimately very loosely.',
    ],
  },
  38: {
    morning: [
      "the hoard has its own weather system. that's how much gold there is.",
      'the dragon is breathing faster. this is either opportunity or a funeral.',
      'merchants fled. wizards approached. one of these groups is smarter.',
    ],
    escalation: [
      'technically wealthy. practically trapped. a metaphor for many things.',
      "one eye opened. then closed. it's deciding. you don't want to be there when it decides.",
      'three sacks of gold. sealed inside with a dragon. net positive?',
    ],
    resolution: [
      "it didn't wake. this time. next time is not guaranteed.",
      'the breathing continues. the gold remains. the tension is permanent.',
      'the bravest wizard got the gold. the smartest wizard watched from a hill.',
    ],
  },
  39: {
    morning: [
      'the academy recommends staying indoors. nobody is indoors. they never are.',
      'raw mana. falling from the sky. what could possibly go wrong. everything.',
      'triple points. triple chaos. the math works if you survive it.',
    ],
    escalation: [
      'a second sun. for eleven seconds. excessive but impressive.',
      'he invented a colour. by accident. the best discoveries are accidents.',
      'the observers started casting. professionalism has a limit. apparently.',
    ],
    resolution: [
      'a new colour. unnamed. uncategorised. just existing. aggressively.',
      'the storm passed. the crater is different. we are all slightly different.',
      "the ground hums. nobody knows why. it's been added to the list of unexplained things.",
    ],
  },
  40: {
    morning: [
      'old wizards who smile are either wise or dangerous. often both.',
      'his last day. his greatest spell. decades of work. no pressure.',
      "he invited everyone. old wizards don't share unless it's the end.",
    ],
    escalation: [
      'pages floating on magical currents. knowledge is literally in the air.',
      'some pages are brilliant. some are gibberish. the line between them is thin.',
      'three hours of casting. the patience of a lifetime distilled into one spell.',
    ],
    resolution: [
      'nobody knows what the spell did. everyone feels different. that might be the point.',
      "he's still smiling. even in silence. especially in silence.",
      'the pages scattered. the knowledge spread. maybe that was the lesson.',
    ],
  },
};

/**
 * Get a random Nerm hook for a narrative phase
 * @param {number} narrativeId
 * @param {string} phase - 'morning', 'escalation', or 'resolution'
 */
function getNermHook(narrativeId, phase) {
  const hooks = nermHooks[narrativeId];
  if (!hooks || !hooks[phase]) return null;
  const arr = hooks[phase];
  return arr[Math.floor(Math.random() * arr.length)];
}

module.exports = {
  nermHooks,
  getNermHook,
};
