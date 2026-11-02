/* WahalaVerse — Survive Naija 2.0 SCENARIO PACK: "7 Days to Payday" (salary earner).
   The fully-playable launch scenario. You just paid rent; your account is nearly empty;
   salary lands in 7 days. Survive the week — eat, get to work, stay safe, keep your job,
   and keep the people around you — without collapsing. BROAD survival (not just money):
   wellbeing, safety, livelihood and social support all matter.
   ILLUSTRATIVE Nigerian scenario; humour + community + opportunity, not only hardship.

   Data for survive-engine.js. Exposes window.WAHALA_SURVIVE_PAYDAY / module.exports. */
(function (root, factory) {
  'use strict';
  const pack = factory();
  if (typeof module === 'object' && module.exports) module.exports = pack;
  else root.WAHALA_SURVIVE_PAYDAY = pack;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  return {
    id: 'payday', scenario: 'salary-earner', title: '7 Days to Payday',
    maxDays: 7, apPerDay: 3,
    background: 'A salary earner, broke after rent, 7 days from payday.',
    briefing: {
      hook: 'Rent just cleared your account. Payday is 7 days away and you have ₦9,000 to your name. Make it to Friday — fed, safe, employed, and still on speaking terms with your people.',
      how: ['Each day you have 3 moves (energy). Spend them wisely — you can’t do everything.',
            'Go to work to protect your job, hustle for cash, eat, rest, keep the light on, or call someone.',
            'Choices now cause problems (and payoffs) later. You can recover from a bad day. Salary lands on Day 7.'],
    },

    indicators: [
      { key: 'cash', label: 'Cash', emoji: '💵', fmt: 'naira' },
      { key: 'food', label: 'Food', emoji: '🍚', fmt: 'meals' },
      { key: 'power', label: 'Light', emoji: '⚡', fmt: 'days' },
      { key: 'wellbeing', label: 'Wellbeing', emoji: '🧠', fmt: 'pct' },
      { key: 'safety', label: 'Safety', emoji: '🛡️', fmt: 'pct' },
      { key: 'livelihood', label: 'Job', emoji: '💼', fmt: 'pct' },
      { key: 'support', label: 'Support', emoji: '🤝', fmt: 'pct', derived: true },
    ],

    start: { res: { cash: 9000, food: 3, power: 2, wellbeing: 65, safety: 70, livelihood: 60 } },

    npcs: [
      { id: 'mummy', name: 'Mummy', role: 'family' },
      { id: 'chidi', name: 'Chidi', role: 'best friend' },
      { id: 'oga', name: 'Oga', role: 'boss' },
      { id: 'mama', name: 'Mama Nkechi', role: 'market woman & landlady' },
    ],

    // Standing actions — always-considered moves (filtered by availability + cost).
    actions: [
      { id: 'work', group: 'work', cost: { ap: 1 },
        label: (r) => (r.today.done.work ? '✅ Worked today' : 'Go to work (shift)'),
        available: (r) => !r.today.done.work && !r.flags.sacked,
        apply: (r, c) => {
          const base = r.flags.cheapRoute ? 400 : 700;
          const fare = r.flags.fuelScarcity ? base * 3 : base;
          if (c.get('cash') >= fare) { c.add('cash', -fare); c.react('Shift done. Transport cost ₦' + fare.toLocaleString() + '.'); }
          else { c.add('wellbeing', -6); c.add('safety', -3); c.react('No fare — you trekked. Hard, but you showed up.'); }
          c.add('wellbeing', -5); c.add('livelihood', 5); r.today.done.work = true; c.counter('workedDays');
        } },
      { id: 'hustle', group: 'money', cost: { ap: 1 },
        label: 'Run a side hustle', available: (r) => r.res.wellbeing > 15,
        apply: (r, c) => { let earn = c.randInt(2500, 6000); if (r.flags.noPhone) earn = Math.round(earn * 0.5); c.add('cash', earn); c.add('wellbeing', -8); c.counter('hustleDays'); c.react('Hustle paid ₦' + earn.toLocaleString() + (r.flags.noPhone ? ' (slow without a phone).' : '.')); } },
      { id: 'buyfood', group: 'needs', cost: { ap: 1, cash: 3000 },
        label: 'Buy foodstuff (₦3,000)', available: () => true,
        apply: (r, c) => { const meals = r.flags.marketHike ? 3 : 4; c.add('food', meals); c.react('Stocked ' + meals + ' meals.' + (r.flags.marketHike ? ' Prices are high sha.' : '')); } },
      { id: 'eatout', group: 'needs', cost: { ap: 1, cash: 800 },
        label: 'Buy street food (₦800)', available: () => true,
        apply: (r, c) => { c.add('wellbeing', 6); c.react('Hot amala hits the spot.'); } },
      { id: 'rest', group: 'self', cost: { ap: 1 },
        label: 'Rest & recharge', available: () => true,
        apply: (r, c) => { c.add('wellbeing', 12); c.add('safety', 3); c.react('You took it easy. Mind settles.'); } },
      { id: 'power', group: 'needs', cost: { ap: 1, cash: 1500 },
        label: 'Buy light units / gen fuel (₦1,500)', available: () => true,
        apply: (r, c) => { c.add('power', 3); r.flags.noPower = false; c.react('Light sorted for a few days.'); } },
    ],

    // NPC "calls" — negotiation / support (immediate help now, goodwill + delayed cost later).
    npcAsks: [
      { id: 'mummy_help', npc: 'mummy', group: 'call', cost: { ap: 1 },
        label: 'Call Mummy for help', available: (r) => (r.counters.askedMummy || 0) < 2,
        apply: (r, c) => { c.counter('askedMummy'); const gw = c.npcGoodwill('mummy'); const amt = Math.max(2000, c.randInt(3000, 8000) + gw * 500); c.add('cash', amt); c.add('wellbeing', -4); c.npc('mummy', -1); c.react('Mummy sent ₦' + amt.toLocaleString() + '. “Manage it well o.”'); } },
      { id: 'mummy_greet', npc: 'mummy', group: 'call', cost: { ap: 1 },
        label: 'Call Mummy just to greet', available: () => true,
        apply: (r, c) => { c.add('wellbeing', 6); c.npc('mummy', 2); c.react('Her voice alone is medicine.'); } },
      { id: 'chidi_borrow', npc: 'chidi', group: 'call', cost: { ap: 1 },
        label: 'Borrow ₦5,000 from Chidi', available: (r) => !r.flags.borrowedChidi && (r.npcs.chidi.goodwill >= -2),
        apply: (r, c) => { c.add('cash', 5000); c.npc('chidi', -1); c.flag('borrowedChidi'); c.seed({ id: 'chidi_repay', fireDay: r.day + 3, apply: (rr, cc) => { if (cc.get('cash') >= 5000) { cc.add('cash', -5000); cc.npc('chidi', 1); } else { cc.npc('chidi', -2); } }, note: 'Chidi needed his ₦5,000 back — you were reminded.', cause: 'borrowing from Chidi' }); c.react('Chidi borrowed you ₦5,000. “No vex, but I go need am back o.”'); } },
      { id: 'chidi_hang', npc: 'chidi', group: 'call', cost: { ap: 1, cash: 1500 },
        label: 'Link up with Chidi (₦1,500)', available: () => true,
        apply: (r, c) => { c.add('wellbeing', 8); c.npc('chidi', 2); c.react('Small chops and gist. Your head is lighter.'); } },
      { id: 'oga_advance', npc: 'oga', group: 'call', cost: { ap: 1 },
        label: 'Ask Oga for a salary advance', available: (r) => !r.flags.gotAdvance && !r.flags.sacked,
        apply: (r, c) => { if (r.res.livelihood >= 55) { c.add('cash', 20000); c.flag('gotAdvance'); c.npc('oga', -1); c.react('Oga approved a ₦20,000 advance (comes out of payday).'); } else { c.add('livelihood', -2); c.npc('oga', -1); c.react('Oga said no — “Let your work speak first.”'); } } },
      { id: 'oga_explain', npc: 'oga', group: 'call', cost: { ap: 1 },
        label: 'Smooth things over with Oga', available: (r) => !!r.flags.jobQuery,
        apply: (r, c) => { if (c.npcGoodwill('oga') >= 0 || r.res.livelihood >= 45) { r.flags.jobQuery = false; c.add('livelihood', 6); c.react('You explained; Oga let it slide this time.'); } else { c.add('livelihood', -3); c.react('Oga wasn’t having it. Shape up.'); } } },
      { id: 'mama_credit', npc: 'mama', group: 'call', cost: { ap: 1 },
        label: 'Buy food on credit from Mama Nkechi', available: (r) => !r.flags.mamaCredit && (r.npcs.mama.goodwill >= -1),
        apply: (r, c) => { c.add('food', 4); c.flag('mamaCredit'); c.npc('mama', -1); c.seed({ id: 'mama_due', fireDay: r.day + 3, apply: (rr, cc) => { if (cc.get('cash') >= 3500) { cc.add('cash', -3500); cc.npc('mama', 1); } else { cc.npc('mama', -2); } }, note: 'Mama Nkechi came for her ₦3,500 food credit.', cause: 'buying food on credit' }); c.react('“Oya take, pay me later.” 4 meals on credit.'); } },
      { id: 'mama_greet', npc: 'mama', group: 'call', cost: { ap: 1 },
        label: 'Greet Mama Nkechi properly', available: () => true,
        apply: (r, c) => { c.add('wellbeing', 3); c.npc('mama', 2); c.react('A little respect goes far in this market.'); } },
    ],

    // Scripted beats guarantee a signature rhythm; everything else is a seeded random draw.
    scripted: { 2: ['fuel_scarcity'] },
    eventsPerDay: (day) => (day <= 6 ? 1 : 0),

    deck: [
      { id: 'fuel_scarcity', scriptedOnly: true, mandatory: true, title: 'Fuel scarcity hits ⛽',
        body: 'Queues everywhere; transport fares have tripled across town.',
        choices: [{ id: 'ok', label: 'Brace yourself', apply: (r, c) => { c.flag('fuelScarcity'); c.seed({ id: 'fuel_eases', fireDay: r.day + 2, sets: { fuelScarcity: false } }); c.react('Fares are 3× until it eases in a couple of days.'); } }] },
      { id: 'phone_snatched', weight: 1, mandatory: true, oncePerRun: true, title: 'Phone snatched! 📱',
        body: 'On a rough okada ride, someone grabs your phone and vanishes.',
        choices: [
          { id: 'buy', label: 'Buy a cheap second-hand phone (₦8,000)', cost: { cash: 8000 }, effects: { safety: -4 }, reaction: 'Back online, wallet lighter.' },
          { id: 'manage', label: 'Manage without a phone for now', effects: { safety: -6, wellbeing: -6 }, sets: { noPhone: true }, reaction: 'Hard to hustle, but you’ll cope.' }] },
      { id: 'sick_relative', weight: 1, oncePerRun: true, title: 'The village calls 🏡',
        body: 'A relative is unwell; the family group chat needs ₦10,000.',
        choices: [
          { id: 'send', label: 'Send ₦10,000', cost: { cash: 10000 }, npc: { mummy: 2 }, effects: { wellbeing: -4 }, reaction: 'You showed up for family.' },
          { id: 'small', label: 'Send ₦3,000 and explain', cost: { cash: 3000 }, npc: { mummy: 1 }, reaction: 'You did what you honestly could.' },
          { id: 'rally', label: 'Rally Chidi to chip in', apply: (r, c) => { if (c.npcGoodwill('chidi') >= 0) { c.add('cash', -5000); c.npc('mummy', 1); c.npc('chidi', -1); c.react('Chidi chipped in — together you sent ₦8k.'); } else { c.add('cash', -3000); c.react('Chidi was broke; you managed ₦3k alone.'); } } }] },
      { id: 'nepa_light', weight: 1, title: 'Up NEPA! 💡', body: 'They brought light unexpectedly — rare blessing.',
        choices: [{ id: 'charge', label: 'Charge everything, do your chores', effects: { power: 2, wellbeing: 4 }, reaction: 'Small joys. Everything charged.' }] },
      { id: 'transformer', weight: 1, title: 'Transformer don spoil ⚡', body: 'No public light for days unless you fuel the gen.',
        choices: [
          { id: 'fuel', label: 'Fuel the generator (₦2,000)', cost: { cash: 2000 }, effects: { power: 3 }, reaction: 'Gen dey hum. Comfort restored.' },
          { id: 'endure', label: 'Endure the darkness', effects: { wellbeing: -5 }, sets: { noPower: true }, reaction: 'Candles, hand-fan and patience.' }] },
      { id: 'overtime', weight: 1, precondition: (r) => r.res.livelihood > 30 && !r.flags.sacked, title: 'Oga offers overtime 💼',
        body: 'An extra shift this weekend — extra pay, extra tiredness.',
        choices: [
          { id: 'yes', label: 'Take it (earn ₦7,000)', effects: { cash: 7000, wellbeing: -10, livelihood: 4 }, npc: { oga: 1 }, reaction: 'Oga noticed your hustle.' },
          { id: 'no', label: 'Decline — protect your rest', effects: { wellbeing: 4 }, npc: { oga: -1 }, reaction: 'Rest won; Oga shrugged.' }] },
      { id: 'lucky_refund', weight: 1, oncePerRun: true, title: 'Alert! 💸', body: 'Someone finally repays an old ₦6,000 debt.',
        choices: [{ id: 'nice', label: 'Thank God for small mercies', effects: { cash: 6000, wellbeing: 5 }, reaction: 'Unexpected money hits different.' }] },
      { id: 'owambe', weight: 1, title: 'Owambe invite 🎉', body: 'A friend is getting married. Aso-ebi costs ₦7,000.',
        choices: [
          { id: 'go', label: 'Buy aso-ebi and show face (₦7,000)', cost: { cash: 7000 }, effects: { wellbeing: 8 }, npc: { chidi: 1 }, reaction: 'You belonged. The jollof was worth it.' },
          { id: 'skip', label: 'Politely skip it', effects: { wellbeing: 3 }, npc: { chidi: -1 }, reaction: 'Peace — but they noticed your empty seat.' }] },
      { id: 'area_safety', weight: 1, mandatory: true, title: 'Area wahala 🌃', body: 'Rough boys stop you on your street at night.',
        choices: [
          { id: 'settle', label: 'Settle them (₦2,000)', cost: { cash: 2000 }, effects: { safety: -2 }, reaction: 'You paid and passed quietly.' },
          { id: 'run', label: 'Run for it', effects: { safety: -10, wellbeing: -8 }, reaction: 'You escaped — heart pounding.' },
          { id: 'know', label: 'Greet the one you recognise', apply: (r, c) => { if (c.support() >= 55) { c.add('safety', 4); c.react('Baba from your street waved you through. Respect pays.'); } else { c.add('safety', -8); c.add('cash', -2000); c.react('Nobody vouched for you; you had to settle them.'); } } }] },
      { id: 'market_hike', weight: 1, title: 'Market prices jump 🛒', body: 'Pepper, rice and gas all cost more this week.',
        choices: [{ id: 'ok', label: 'Adjust your budget', apply: (r, c) => { c.flag('marketHike'); c.seed({ id: 'hike_ends', fireDay: r.day + 3, sets: { marketHike: false } }); c.react('Foodstuff go cost small more for a while.'); } }] },
      { id: 'training', weight: 1, oncePerRun: true, precondition: (r) => r.res.wellbeing > 35, title: 'Free skills training 📚',
        body: 'A free weekend workshop could level up your earning power.',
        choices: [
          { id: 'attend', label: 'Attend (costs a move + energy)', cost: { ap: 1 }, effects: { wellbeing: -4, livelihood: 3 }, seeds: [{ id: 'skill_pays', fireDay: 99, effects: { cash: 4000 }, note: 'The skill you learned landed you a paid gig.', cause: 'investing a day in free training' }], apply: (r, c) => { /* schedule payoff a few days out */ const s = r.seeds.find((x) => x.id === 'skill_pays' && x.status === 'armed'); if (s) s.fireDay = Math.min(r.maxDays, r.day + 3); c.react('Knowledge now, money later.'); } },
          { id: 'skip', label: 'Skip it — no time', reaction: 'Maybe next week.' }] },
      { id: 'neighbour_food', weight: 1, precondition: (r) => r.res.safety > 40, title: 'Neighbour shares food 🍲',
        body: 'Mama upstairs cooked plenty and sends a plate down.',
        choices: [{ id: 'accept', label: 'Accept with thanks', effects: { food: 2, wellbeing: 5 }, reaction: 'Community over everything. ❤️' }] },
      { id: 'scam', weight: 1, title: 'Too-sweet offer 🕵🏾', body: 'A stranger pitches a “double your money” POS deal.',
        choices: [
          { id: 'investigate', label: 'Ask around first', apply: (r, c) => { c.add('wellbeing', 3); c.react('You smelled a rat — it was a scam. Dodged it clean.'); } },
          { id: 'bite', label: 'Put in ₦5,000', cost: { cash: 5000 }, apply: (r, c) => { c.add('wellbeing', -6); c.react('It vanished. If e too sweet, e no be am.'); } }] },
      { id: 'flood', weight: 1, title: 'Heavy rain floods the road 🌧️', body: 'Getting anywhere today is a real mission.',
        choices: [
          { id: 'wait', label: 'Wait it out at home', effects: { wellbeing: 2 }, sets: { skipWorkToday: true }, reaction: 'Cozy indoors — but no work today.' },
          { id: 'brave', label: 'Brave the flood', effects: { wellbeing: -6, safety: -4 }, reaction: 'Wet and late, but you made it out.' }] },
      { id: 'favour_returns', weight: 1, precondition: (r, c) => c.support() >= 62, title: 'A favour returns 🤝',
        body: 'Someone you once helped shows up for you unprompted.',
        choices: [{ id: 'nice', label: 'Accept the help', effects: { cash: 4000, wellbeing: 5 }, reaction: 'What you give comes back to you.' }] },
      { id: 'delivery_gig', weight: 1, title: 'Quick delivery gig 🛵', body: 'A neighbour needs a parcel moved across town today.',
        choices: [
          { id: 'take', label: 'Take it (₦3,500, tiring)', effects: { cash: 3500, wellbeing: -7 }, reaction: 'Small money, steady hands.' },
          { id: 'pass', label: 'Pass on it', reaction: 'You let that one go.' }] },
      { id: 'health_warning', weight: 1, precondition: (r) => r.res.wellbeing < 45, title: 'Your body talks 🩺',
        body: 'Headaches and fatigue — you’ve been pushing too hard.',
        choices: [
          { id: 'rest', label: 'Take it easy today', cost: { ap: 1 }, effects: { wellbeing: 14 }, reaction: 'You listened to your body.' },
          { id: 'push', label: 'Push through anyway', effects: { wellbeing: -6 }, seeds: [{ id: 'burnout', fireDay: 99, effects: { wellbeing: -8 }, note: 'Ignoring your health caught up with you.', cause: 'pushing through the warning signs' }], apply: (r, c) => { const s = r.seeds.find((x) => x.id === 'burnout' && x.status === 'armed'); if (s) s.fireDay = Math.min(r.maxDays, r.day + 2); c.react('No time to rest, abi? We’ll see.'); } }] },
      { id: 'innovation_route', weight: 1, oncePerRun: true, title: 'A smarter route 🧠', body: 'You figure out a cheaper keke route to work.',
        choices: [{ id: 'use', label: 'Start using it', sets: { cheapRoute: true }, effects: { wellbeing: 3 }, reaction: 'Naija resourcefulness — transport just got cheaper.' }] },
    ],

    onNight: (r, c, night) => {
      if (!r.today.done.work && !r.flags.sacked && !r.flags.skipWorkToday && r.day <= 5) {
        c.add('livelihood', r.flags.jobQuery ? -16 : -8); // escalates once Oga is already querying you
        const m = c.counter('missedWork');
        if (m >= 2 && !r.flags.jobQuery) { r.flags.jobQuery = true; night.notes.push('Oga is asking why you keep missing work.'); }
      }
      r.flags.skipWorkToday = false;
    },

    onPayday: (r, c) => {
      if (r.res.livelihood <= 15) { r.flags.sacked = true; return; }
      let pay = 120000; if (r.flags.gotAdvance) pay -= 20000;
      c.add('cash', pay); r.flags.paid = true;
    },

    endings: [
      { id: 'sacked', title: 'Sacked!', emoji: '🪧',
        test: (c) => c.flags.sacked,
        blurb: 'You missed work one time too many and the job was gone before payday. A hard week — but you’ll bounce back.',
        share: 'I lost my job before payday 🪧 — think you could survive the week? WahalaVerse: Survive Naija' },
      { id: 'burnt_out', title: 'Burnt Out', emoji: '🪫',
        test: (c) => c.res.wellbeing < 25,
        blurb: 'You reached payday, but you ran your body and mind into the ground to get there. Money isn’t everything.',
        share: 'Made it to payday but I’m wrecked 🪫 — WahalaVerse: Survive Naija' },
      { id: 'owing', title: 'Owing Everybody', emoji: '📉',
        test: (c) => !c.flags.sacked && (c.flags.borrowedChidi || c.flags.mamaCredit || c.flags.gotAdvance) && (c.res.cash < 55000 || c.support < 45),
        blurb: 'Payday came and went straight into debts and favours. You survived — on everybody else’s money. New month, same cycle?',
        share: 'Survived the week but I’m owing everybody 😂 — WahalaVerse: Survive Naija' },
      { id: 'soft_life', title: 'Soft-Life Secured', emoji: '🛋️',
        test: (c) => c.res.cash >= 100000 && c.res.wellbeing >= 55 && c.res.safety >= 50 && c.support >= 55,
        blurb: 'Fed, safe, employed, people intact — and a real buffer in the bank. You didn’t just survive the week, you ran it.',
        share: 'Soft life secured 🛋️ — I survived the week in style. Beat me: WahalaVerse: Survive Naija' },
      { id: 'community', title: 'Community Carried You', emoji: '🤝',
        test: (c) => c.support >= 70,
        blurb: 'You leaned on the right people and showed up for them too. It takes a village — and yours came through.',
        share: 'My people carried me to payday 🤝 — WahalaVerse: Survive Naija' },
      { id: 'hustler', title: 'Street-Smart Hustler', emoji: '🛵',
        test: (c) => (c.counters.hustleDays || 0) >= 3 && c.res.cash >= 60000,
        blurb: 'You didn’t wait for salary alone — you hustled your way through. Resourceful to the core.',
        share: 'Hustled my way to payday 🛵 — WahalaVerse: Survive Naija' },
      { id: 'survived_just', title: 'Survived, Just', emoji: '😮‍💨',
        test: (c) => c.res.cash >= 30000,
        blurb: 'You made it — barely. Tight week, few comforts, but you reached payday standing. We move.',
        share: 'I survived the week, just barely 😮‍💨 — WahalaVerse: Survive Naija' },
      { id: 'made_it', title: 'You Made It Through', emoji: '✅',
        test: () => true,
        blurb: 'Not pretty, not comfortable — but you reached payday in one piece. That counts.',
        share: 'I made it through the week ✅ — WahalaVerse: Survive Naija' },
    ],
  };
});
