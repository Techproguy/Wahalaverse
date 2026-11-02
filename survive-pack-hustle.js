/* WahalaVerse — Survive Naija 2.0 SCENARIO PACK: "7 Days of Hustle" (small-business owner).
   BETA scenario (architecture + content in active scope; Payday is the fully-tuned launch
   scenario). Same engine, a different Naija life: you run a small market business on thin
   working capital through a volatile week. Income is your own hustle, not a salary — so
   every day you decide what to restock, who to sell to, and who to trust.
   Exposes window.WAHALA_SURVIVE_HUSTLE / module.exports. */
(function (root, factory) {
  'use strict';
  const pack = factory();
  if (typeof module === 'object' && module.exports) module.exports = pack;
  else root.WAHALA_SURVIVE_HUSTLE = pack;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  return {
    id: 'hustle', scenario: 'small-business', title: '7 Days of Hustle',
    maxDays: 7, apPerDay: 3,
    background: 'A market trader with thin capital, surviving a volatile business week. (Beta)',
    briefing: {
      hook: 'You run a small stall on ₦20,000 working capital. No salary is coming — what you eat this week, you must sell for. Restock smart, keep customers, and don’t let the market finish you.',
      how: ['3 moves a day. Restock & sell to earn, man the stall, or chase bigger orders.',
            'Market events swing prices and demand — read them. Your supplier and loyal customers remember you.',
            'A bad day is recoverable. On Day 7 you tally the week’s takings.'],
    },
    indicators: [
      { key: 'cash', label: 'Cash', emoji: '💵', fmt: 'naira' },
      { key: 'food', label: 'Food', emoji: '🍚', fmt: 'meals' },
      { key: 'power', label: 'Light', emoji: '⚡', fmt: 'days' },
      { key: 'wellbeing', label: 'Wellbeing', emoji: '🧠', fmt: 'pct' },
      { key: 'safety', label: 'Safety', emoji: '🛡️', fmt: 'pct' },
      { key: 'livelihood', label: 'Business', emoji: '🏪', fmt: 'pct' },
      { key: 'support', label: 'Support', emoji: '🤝', fmt: 'pct', derived: true },
    ],
    start: { res: { cash: 20000, food: 3, power: 2, wellbeing: 65, safety: 65, livelihood: 55 } },
    npcs: [
      { id: 'supplier', name: 'Oga Danjuma', role: 'supplier' },
      { id: 'bisi', name: 'Sister Bisi', role: 'loyal customer' },
      { id: 'chidi', name: 'Chidi', role: 'friend' },
      { id: 'mummy', name: 'Mummy', role: 'family' },
    ],
    actions: [
      { id: 'restock', group: 'money', cost: { ap: 1, cash: 5000 },
        label: 'Restock & sell (₦5,000 goods)', available: () => true,
        apply: (r, c) => { const demand = r.flags.priceCrash ? 0.5 : (r.flags.boom ? 1.8 : 1); const take = Math.round(c.randInt(4000, 11000) * demand * (0.7 + 0.006 * r.res.livelihood)); c.add('cash', take); c.add('livelihood', 3); c.add('wellbeing', -6); c.counter('salesDays'); c.react('Sold through. Takings: ₦' + take.toLocaleString() + (demand < 1 ? ' (slow market).' : demand > 1 ? ' (market dey hot!)' : '.')); } },
      { id: 'stall', group: 'work', cost: { ap: 1 },
        label: 'Man the stall all day', available: () => true,
        apply: (r, c) => { const take = c.randInt(800, 2500); c.add('cash', take); c.add('livelihood', 2); c.add('wellbeing', -5); c.react('Walk-in customers trickled in: ₦' + take.toLocaleString() + '.'); } },
      { id: 'buyfood', group: 'needs', cost: { ap: 1, cash: 3000 }, label: 'Buy foodstuff (₦3,000)', available: () => true, apply: (r, c) => { c.add('food', 4); c.react('Stocked 4 meals.'); } },
      { id: 'eatout', group: 'needs', cost: { ap: 1, cash: 800 }, label: 'Buy street food (₦800)', available: () => true, apply: (r, c) => { c.add('wellbeing', 6); c.react('Quick bite, back to work.'); } },
      { id: 'rest', group: 'self', cost: { ap: 1 }, label: 'Rest & recharge', available: () => true, apply: (r, c) => { c.add('wellbeing', 12); c.add('safety', 3); c.react('You caught your breath.'); } },
      { id: 'power', group: 'needs', cost: { ap: 1, cash: 1500 }, label: 'Buy light units / gen fuel (₦1,500)', available: () => true, apply: (r, c) => { c.add('power', 3); r.flags.noPower = false; c.react('Stall stays lit into the evening.'); } },
    ],
    npcAsks: [
      { id: 'supplier_credit', npc: 'supplier', group: 'call', cost: { ap: 1 }, label: 'Take goods on credit from Oga Danjuma', available: (r) => !r.flags.supplierCredit && r.npcs.supplier.goodwill >= -1,
        apply: (r, c) => { c.add('livelihood', 4); c.flag('supplierCredit'); c.npc('supplier', -1); c.seed({ id: 'supplier_due', fireDay: r.day + 3, handler: 'supplier_due', note: 'Oga Danjuma came for his ₦6,000 goods credit.', cause: 'taking goods on credit' }); c.react('“Pay me after you sell.” More stock to move.'); } },
      { id: 'supplier_greet', npc: 'supplier', group: 'call', cost: { ap: 1 }, label: 'Settle & greet Oga Danjuma', available: () => true, apply: (r, c) => { c.npc('supplier', 2); c.add('livelihood', 2); c.react('Good rapport means better prices next time.'); } },
      { id: 'bisi_loyal', npc: 'bisi', group: 'call', cost: { ap: 1, cash: 500 }, label: 'Give Sister Bisi a loyalty discount', available: () => true, apply: (r, c) => { c.npc('bisi', 2); c.add('wellbeing', 3); c.seed({ id: 'bisi_bulk', fireDay: r.day + 2, effects: { cash: 5000 }, note: 'Sister Bisi brought her whole group to buy from you.', cause: 'looking after a loyal customer' }); c.react('Loyalty builds — she’ll bring her people.'); } },
      { id: 'chidi_borrow', npc: 'chidi', group: 'call', cost: { ap: 1 }, label: 'Borrow ₦5,000 from Chidi', available: (r) => !r.flags.borrowedChidi && r.npcs.chidi.goodwill >= -2, apply: (r, c) => { c.add('cash', 5000); c.npc('chidi', -1); c.flag('borrowedChidi'); c.seed({ id: 'chidi_repay', fireDay: r.day + 3, handler: 'chidi_repay', note: 'Chidi wanted his ₦5,000 back.', cause: 'borrowing from Chidi' }); c.react('Chidi borrowed you ₦5,000.'); } },
      { id: 'mummy_greet', npc: 'mummy', group: 'call', cost: { ap: 1 }, label: 'Call Mummy to greet', available: () => true, apply: (r, c) => { c.add('wellbeing', 6); c.npc('mummy', 2); c.react('Her prayers steady you.'); } },
    ],
    seedHandlers: {
      chidi_repay: (r, c) => { if (c.get('cash') >= 5000) { c.add('cash', -5000); c.npc('chidi', 1); } else c.npc('chidi', -2); },
      supplier_due: (r, c) => { if (c.get('cash') >= 6000) { c.add('cash', -6000); c.npc('supplier', 1); } else { c.npc('supplier', -2); c.add('livelihood', -5); } },
    },
    scripted: {}, eventsPerDay: (day) => (day <= 6 ? 1 : 0),
    deck: [
      { id: 'price_crash', weight: 1, title: 'Prices crash 📉', body: 'A glut hits the market; your goods barely move today.', choices: [{ id: 'hold', label: 'Hold stock, wait it out', apply: (r, c) => { c.flag('priceCrash'); c.seed({ id: 'crash_ends', fireDay: r.day + 2, sets: { priceCrash: false } }); c.react('You wait for prices to recover.'); } }, { id: 'dump', label: 'Dump at a loss for cash', effects: { cash: 3000, livelihood: -4 }, reaction: 'Quick cash, bruised margins.' }] },
      { id: 'bulk_order', weight: 1, oncePerRun: true, title: 'Big bulk order 📦', body: 'A caterer wants a large supply — if you can fund it.', choices: [{ id: 'fund', label: 'Fund it (₦8,000 up front)', cost: { cash: 8000 }, effects: { cash: 18000, livelihood: 6 }, npc: { bisi: 1 }, reaction: 'Risk paid off — tidy profit.' }, { id: 'pass', label: 'Too risky, pass', reaction: 'Safe, but you wonder.' }] },
      { id: 'boom', weight: 1, title: 'Market dey hot 🔥', body: 'Festive demand spikes for a couple of days.', choices: [{ id: 'ride', label: 'Ride the wave', apply: (r, c) => { c.flag('boom'); c.seed({ id: 'boom_ends', fireDay: r.day + 2, sets: { boom: false } }); c.add('wellbeing', 3); c.react('Sell, sell, sell while it lasts!'); } }] },
      { id: 'spoilage', weight: 1, title: 'Goods spoil 🥵', body: 'Heat and no light spoil some of your stock.', choices: [{ id: 'absorb', label: 'Absorb the loss', effects: { cash: -3000, livelihood: -3 }, reaction: 'Painful, but you keep moving.' }, { id: 'discount', label: 'Flash-sale the rest cheap', effects: { cash: 1500 }, npc: { bisi: 1 }, reaction: 'Customers love a bargain.' }] },
      { id: 'fake_money', weight: 1, mandatory: true, title: 'Fake note! 💵', body: 'A customer pays with a suspicious ₦1,000 note.', choices: [{ id: 'check', label: 'Check it carefully', apply: (r, c) => { c.add('wellbeing', 2); c.react('You caught it — no loss today.'); } }, { id: 'accept', label: 'Rush, accept it', effects: { cash: -1000 }, reaction: 'It was fake. Lesson learned.' }] },
      { id: 'union_levy', weight: 1, mandatory: true, title: 'Market union levy 🧾', body: 'The association comes for this week’s dues.', choices: [{ id: 'pay', label: 'Pay the ₦1,500 levy', cost: { cash: 1500 }, effects: { safety: 3 }, reaction: 'Paid up, no wahala.' }, { id: 'dodge', label: 'Dodge them today', effects: { safety: -6 }, sets: { levyOwed: true }, reaction: 'They’ll remember at your stall.' }] },
      { id: 'fuel_scarcity', weight: 1, title: 'Fuel scarcity ⛽', body: 'Transporting goods costs more for a few days.', choices: [{ id: 'ok', label: 'Adjust', apply: (r, c) => { c.add('cash', -2000); c.react('Logistics ate ₦2,000 extra.'); } }] },
      { id: 'viral_product', weight: 1, oncePerRun: true, title: 'A product goes viral 📱', body: 'One of your items is trending on WhatsApp status.', choices: [{ id: 'push', label: 'Push it hard', effects: { cash: 7000, livelihood: 5, wellbeing: -4 }, reaction: 'Naija internet is money when you move fast.' }] },
      { id: 'community_support', weight: 1, precondition: (r, c) => c.support() >= 60, title: 'Fellow traders rally 🤝', body: 'The other traders cover your stall while you sort something out.', choices: [{ id: 'thanks', label: 'Accept the help', effects: { wellbeing: 6, cash: 2000 }, reaction: 'Market community carries its own.' }] },
      { id: 'area_safety', weight: 1, mandatory: true, title: 'Trouble after close 🌃', body: 'Rough boys eye your takings as you lock up.', choices: [{ id: 'settle', label: 'Settle them (₦2,000)', cost: { cash: 2000 }, reaction: 'You paid and got home safe.' }, { id: 'run', label: 'Hurry home the back way', effects: { safety: -8, wellbeing: -6 }, reaction: 'Heart pounding, but safe.' }] },
    ],
    onNight: (r, c, night) => {
      if ((r.counters.salesDays || 0) === 0 && (r.counters.stallDays || 0) === 0 && r.day <= 5) { c.add('livelihood', -5); night.notes.push('A day with no trading — the stall went quiet.'); }
    },
    onPayday: (r, c) => { const takings = Math.round(r.res.livelihood / 100 * 30000); c.add('cash', takings); r.flags.weekTakings = takings; },
    endings: [
      { id: 'burnt_out', title: 'Burnt Out', emoji: '🪫', test: (c) => c.res.wellbeing < 25, blurb: 'You ground yourself down chasing sales. The business lived; you barely did.', share: 'Hustled till I burnt out 🪫 — WahalaVerse: Survive Naija' },
      { id: 'market_casualty', title: 'Market Casualty', emoji: '📉', test: (c) => c.res.livelihood < 25 || c.res.cash < 3000, blurb: 'The volatile week swallowed your capital. Down, but traders always rise again.', share: 'The market humbled me this week 📉 — WahalaVerse: Survive Naija' },
      { id: 'owing', title: 'Owing Suppliers', emoji: '🧾', test: (c) => (c.flags.supplierCredit || c.flags.borrowedChidi) && c.res.cash < 15000, blurb: 'You survived on credit — now you owe everybody who backed you. New week, new debts.', share: 'Survived on credit, now owing everybody 😂 — WahalaVerse: Survive Naija' },
      { id: 'thriving', title: 'Thriving Trader', emoji: '🏆', test: (c) => c.res.cash >= 45000 && c.res.livelihood >= 60 && c.res.wellbeing >= 45, blurb: 'Smart restocking, loyal customers, clean books — your small business had a great week.', share: 'Great week for the business 🏆 — WahalaVerse: Survive Naija' },
      { id: 'community', title: 'The Market Family', emoji: '🤝', test: (c) => c.support >= 68, blurb: 'You looked after your people and they looked after you. In the market, that’s real wealth.', share: 'My market people carried me 🤝 — WahalaVerse: Survive Naija' },
      { id: 'steady', title: 'Steady Stall', emoji: '🏪', test: () => true, blurb: 'No boom, no bust — you kept the stall open another week. In this economy, that counts.', share: 'Kept my stall alive another week 🏪 — WahalaVerse: Survive Naija' },
    ],
  };
});
