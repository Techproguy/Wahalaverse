/* WahalaVerse — "Assume Their Life" ROLE PACK: Breakout Year.
   A fictional rising Nigerian Afrobeats artist. ILLUSTRATIVE FICTION — not a real
   person; no real artist is depicted. Celebrity role pack (per the canonical spec).

   This is DATA for the role-agnostic engine (atl-engine.js). It is the first
   playable slice; Billionaire, CEO/Founder and Political packs are roadmapped and
   will plug into the same engine (declaring their own vars/systems).

   Exposes window.WAHALA_ATL_AFROBEATS (browser) / module.exports (Node). */
(function (root, factory) {
  'use strict';
  const pack = factory();
  if (typeof module === 'object' && module.exports) module.exports = pack;
  else root.WAHALA_ATL_AFROBEATS = pack;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  return {
    id: 'afrobeats-breakout',
    role: 'A rising Nigerian Afrobeats artist',
    title: 'Breakout Year',
    horizonWeeks: 52,
    startEvent: 'E1',

    // Six interacting state variables (money, buzz, fans, credibility, energy,
    // control). Credibility ≠ fame ≠ money ≠ control — they pull against each other.
    vars: {
      cash:    { label: 'Cash',          emoji: '💰', start: 250000, min: 0, max: 999999999, fmt: 'naira' },
      buzz:    { label: 'Buzz',          emoji: '🔥', start: 72, min: 0, max: 100, fmt: 'pct' },
      fans:    { label: 'Fanbase',       emoji: '💚', start: 60, min: 0, max: 100, fmt: 'pct' },
      cred:    { label: 'Credibility',   emoji: '🎤', start: 65, min: 0, max: 100, fmt: 'pct' },
      energy:  { label: 'Energy',        emoji: '🧠', start: 70, min: 0, max: 100, fmt: 'pct' },
      control: { label: 'Control',       emoji: '🪙', start: 90, min: 0, max: 100, fmt: 'pct' },
    },
    stakeholders: ['producer', 'manager', 'oldSquad', 'label', 'promoter'],

    briefing: {
      hook: 'Your freestyle just went viral overnight. Everybody wants a piece. You have one short window to turn a moment into a career.',
      control: 'You decide what you drop and when, which deals you sign, how you treat your team and your fans, and what you say in public.',
      cannot: 'You can’t force a hit, buzz fades on its own, labels own whatever you sign away, and bloggers and fans react how they like.',
      tension: 'A major label is dangling a cash advance and a machine. Your day-one producer and manager are watching to see if you’ll remember them. Rent is due.',
      goal: 'There’s no single “win”. Blow up, stay real, build something lasting, or protect your peace — each one costs you something else.',
    },

    events: {
      E1: {
        week: 1, arc: 'The Deal',
        title: 'The viral moment — the big label calls',
        body: 'Omo, the song don blow. Your phone no dey rest. Then the biggest label in the game calls with a 360 deal: a life-changing advance… if you sign everything over.',
        choices: [
          { id: 'A', label: 'Sign the 360 deal for the big advance',
            reaction: 'The advance hits your account. Overnight you’re “signed”. But the machine now owns a huge piece of you.',
            effects: { cash: 15000000, buzz: 15, control: -45 },
            memory: { label: 2, oldSquad: -1 },
            sets: { signed360: true },
            commit: ['Deliver a debut album within 12 months'],
            seeds: [
              { id: 'S_creativeclash', fireWeek: 20, cond: { var: 'cred', op: '>', value: 60 },
                effects: { cred: -6, energy: -8 },
                cause: 'signing the 360 deal', note: 'The label keeps overruling your creative calls — the deal you signed in Week 1 is the reason.' },
              { id: 'S_albumdispute', fireWeek: 52, cond: (r) => r.flags.signed360 && !r.flags.albumDelivered,
                effects: { control: -10, buzz: -10, cash: -2000000 },
                cause: 'the “album in 12 months” clause you agreed to', note: 'You never delivered the album you promised the label at signing — now they’re enforcing the contract.' },
            ],
            next: 'E2A' },
          { id: 'B', label: 'Stay independent, take a distribution-only deal',
            reaction: 'You keep ownership and a smaller cheque. Now the whole rollout is on you.',
            effects: { cash: 2000000, control: -10, energy: -10 },
            memory: { producer: 1, manager: 1 },
            seeds: [
              { id: 'S_burnout', fireWeek: 16, cond: { var: 'energy', op: '<', value: 45 },
                effects: { energy: -25, buzz: -8 },
                cause: 'carrying the whole rollout alone', note: 'Running everything yourself finally caught up with you — you crashed.' },
            ],
            next: 'E2B' },
          { id: 'C', label: 'Sign nothing yet — ride the wave solo',
            reaction: 'You bet on yourself. No marketing machine, but no chains either.',
            effects: { cash: 0, buzz: -5, cred: 8 },
            seeds: [
              { id: 'S_windowcloses', fireWeek: 10, cond: { var: 'buzz', op: '<', value: 60 },
                effects: { buzz: -15, fans: -8 },
                cause: 'waiting too long to capitalise', note: 'The buzz window closed while you held out — momentum you can’t get back.' },
            ],
            next: 'E2C' },
        ],
      },

      E2A: {
        week: 3, arc: 'The Deal',
        title: 'The label wants a safe pop single',
        body: 'Your A&R loves a radio-friendly record for the first single. You’ve got a grittier song you believe in more.',
        choices: [
          { id: 'A1', label: 'Give them the safe pop single',
            reaction: 'It’s catchy and it climbs the charts — but the fans who found you early go quiet.',
            effects: { buzz: 10, cred: -12, fans: -5 },
            memory: { label: 2 },
            seeds: [
              { id: 'S_sellout', fireWeek: 14, cond: { var: 'cred', op: '<', value: 55 },
                effects: { fans: -20, cred: -10 },
                cause: 'releasing the label’s safe pop single', note: 'Your core fans branded you a sellout over that pop single.' },
            ],
            next: 'E3' },
          { id: 'A2', label: 'Fight for your own record',
            reaction: 'The label grumbles; the real ones respect it.',
            effects: { cred: 6, buzz: -4 }, memory: { label: -2 }, next: 'E3' },
          { id: 'A3', label: 'Compromise: your record, their video budget',
            reaction: 'You both give a little. It works, for now.',
            effects: { cash: -3000000, cred: 2 }, memory: { label: 1 }, next: 'E3' },
        ],
      },

      E2B: {
        week: 3, arc: 'The Team',
        title: 'Self-funded rollout — who’s on the team?',
        body: 'Independent means YOU build the team. Your day-one producer and manager are hungry. A famous industry hit-maker is also sliding into your DMs.',
        choices: [
          { id: 'B1', label: 'Keep your day-one producer and manager',
            reaction: 'Loyalty over clout. Your people go even harder for you.',
            effects: { energy: 5, cred: 6 }, memory: { producer: 3, manager: 2, oldSquad: 2 },
            sets: { keptProducer: true },
            seeds: [
              { id: 'S_loyaltypays', fireWeek: 17,
                effects: { buzz: 12, fans: 10 },
                cause: 'keeping your real team', note: 'Your day-one producer cooked up a surprise hit — loyalty paid off.' },
            ],
            next: 'E3' },
          { id: 'B2', label: 'Hire the famous hit-maker, drop the day-ones',
            reaction: 'Shiny new team. Your old squad feels the betrayal.',
            effects: { cash: -4000000, buzz: 8 }, memory: { oldSquad: -3, producer: -3 },
            seeds: [
              { id: 'S_oldsquadtalks', fireWeek: 15,
                effects: { cred: -8, fans: -6 },
                cause: 'dropping the people who were there first', note: 'Your old team aired the grievances online — it dented your credibility.' },
            ],
            next: 'E3' },
          { id: 'B3', label: 'Try to keep everyone, stretch the budget',
            reaction: 'Nobody’s cut — but the money bleeds.',
            effects: { cash: -6000000, energy: -8 },
            seeds: [
              { id: 'S_cashcrunch', fireWeek: 13, cond: { var: 'cash', op: '<', value: 1000000 },
                effects: { energy: -10, cred: -4 },
                cause: 'overstretching to keep everyone paid', note: 'The budget ran dry and you had to scramble — the cost of keeping everyone.' },
            ],
            next: 'E3' },
        ],
      },

      E2C: {
        week: 3, arc: 'The Wave',
        title: 'A promoter offers a huge show — far from home',
        body: 'A big promoter wants you to headline a show in another city the same weekend as your hometown’s street festival.',
        choices: [
          { id: 'C1', label: 'Take the big out-of-town show',
            reaction: 'Bigger stage, bigger bag. But home notices you didn’t show up.',
            effects: { cash: 5000000, buzz: 10 }, sets: { skippedHomeShow: true },
            seeds: [
              { id: 'S_homebacklash', fireWeek: 12,
                effects: { fans: -15, cred: -5 },
                cause: 'skipping your hometown festival for the bigger cheque', note: '“He forgot where he’s from” started trending — your home fans felt abandoned.' },
            ],
            next: 'E3' },
          { id: 'C2', label: 'Do the smaller hometown show first',
            reaction: 'The city claims you as their own. The love is real.',
            effects: { cash: 800000, fans: 12, cred: 6 }, next: 'E3' },
          { id: 'C3', label: 'Decline both — hold out for a bidding war',
            reaction: 'You wait for a better offer. The buzz cools a little while you do.',
            effects: { buzz: -8 },
            seeds: [
              { id: 'S_windowcloses', fireWeek: 10, cond: { var: 'buzz', op: '<', value: 60 },
                effects: { buzz: -15, fans: -8 },
                cause: 'holding out instead of moving', note: 'The buzz window closed while you waited for a bidding war that never came.' },
            ],
            next: 'E3' },
        ],
      },

      E3: {
        week: 6, arc: 'The Move',
        title: 'A “small” moment that matters',
        body: 'A bigger artist subtweets you. Your phone is full of people telling you to respond. It would be easy clout.',
        choices: [
          { id: 'F1', label: 'Fire back — start the beef for clout',
            reaction: 'The internet erupts. Your name is everywhere… but so is the smoke.',
            effects: { buzz: 12, cred: -5 }, sets: { startedBeef: true },
            seeds: [
              { id: 'S_beefescalates', fireWeek: 19, cond: { var: 'buzz', op: '>', value: 70 },
                effects: { buzz: 8, energy: -15, cred: -3 },
                cause: 'starting beef for clout', note: 'The bigger artist clapped back for weeks — it drained you even as it fed the buzz.' },
            ],
            next: 'E4' },
          { id: 'F2', label: 'Stay humble, big up your city instead',
            reaction: 'You take the high road. The real fans love you for it.',
            effects: { fans: 8, cred: 2 }, next: 'E4' },
          { id: 'F3', label: 'Go quiet and focus on the music',
            reaction: 'You log off and lock in. The noise dies; so does a little of the buzz.',
            effects: { energy: 10, buzz: -6 }, next: 'E4' },
        ],
      },

      E4: {
        week: 20, arc: 'The Reckoning Builds',
        title: 'Months later — the consequences land',
        body: 'The decisions you made months ago are catching up — some good, some not. The timeline has opinions. How do you handle the noise?',
        choices: [
          { id: 'D1', label: 'Address it head-on — statement and fix it',
            reaction: 'You own it publicly and put in the work. Grown-up move.',
            effects: { cash: -500000, cred: 5, fans: 5, energy: -10 }, next: 'E5' },
          { id: 'D2', label: 'Double down — feed the algorithm',
            reaction: 'You lean all the way in. Engagement spikes; so does the exhaustion.',
            effects: { buzz: 5, cred: -8, energy: -10 }, next: 'E5' },
          { id: 'D3', label: 'Go dark — let the music do the talking',
            reaction: 'You disappear and drop visuals only. It resets the vibe.',
            effects: { energy: 10, buzz: -6, fans: 4 }, next: 'E5' },
        ],
      },

      E5: {
        week: 50, arc: 'The Finale',
        title: 'Year-end — your defining move',
        body: 'It’s been a year since the freestyle. One last decision defines what this breakout actually was.',
        choices: [
          { id: 'G1', label: 'Drop the album now',
            reaction: 'You deliver the body of work. Whatever it is, it’s YOURS to stand on.',
            effects: { buzz: 8, fans: 5, energy: -10 }, sets: { albumDelivered: true }, next: 'END' },
          { id: 'G2', label: 'Hold it for a bigger moment',
            reaction: 'You wait for the perfect rollout. It’s a gamble on timing.',
            effects: { buzz: -10 }, next: 'END' },
          { id: 'G3', label: 'Pivot to a big brand endorsement deal',
            reaction: 'You cash in the fame for a huge endorsement. The bag is real; some call it a sellout.',
            effects: { cash: 8000000, cred: -6, control: -5 }, next: 'END' },
          { id: 'G4', label: 'Step back to protect your peace',
            reaction: 'You choose your health over the hype. The industry doesn’t wait, but you’re still standing.',
            effects: { energy: 20, buzz: -15, fans: -5, cred: 4 }, next: 'END' },
        ],
      },
    },

    // Endings are tried in order; first match wins. Each explains WHY, keyed to
    // the final state + which delayed consequences actually fired.
    endings: [
      { id: 'burnt_out', title: 'Burnt Out', emoji: '🪫',
        test: (c) => c.vars.energy < 30,
        blurb: 'You ran yourself into the ground chasing the moment. The talent was there — the tank wasn’t.',
        share: 'I blew up but burnt out 🪫 — play WahalaVerse: Assume Their Life' },
      { id: 'cancelled', title: 'Cancelled', emoji: '🚫',
        test: (c) => c.vars.cred < 45 && c.vars.fans < 45 &&
          (c.fired.includes('S_sellout') || c.fired.includes('S_homebacklash') || c.fired.includes('S_oldsquadtalks') || c.fired.includes('S_beefescalates')),
        blurb: 'A reputation cascade you set in motion months ago finally caught up with you. The buzz couldn’t save the trust you lost.',
        share: 'I got cancelled in my breakout year 🚫 — can you survive WahalaVerse: Assume Their Life?' },
      { id: 'label_puppet', title: 'Label Puppet', emoji: '🎭',
        test: (c) => c.vars.control < 40 && c.vars.cash >= 10000000 && c.vars.cred < 55,
        blurb: 'The bag was real — but you signed yourself away. Famous, paid, and no longer in charge of your own sound.',
        share: 'I went platinum but I don’t own my masters 🎭 — WahalaVerse: Assume Their Life' },
      { id: 'global_breakout', title: 'Global Breakout', emoji: '🌍',
        test: (c) => c.vars.buzz >= 80 && c.vars.fans >= 65 && c.vars.control >= 50,
        blurb: 'You blew up AND kept your people and your ownership. A real breakout on your own terms.',
        share: 'I went GLOBAL on my own terms 🌍 — beat my run on WahalaVerse: Assume Their Life' },
      { id: 'street_legend', title: 'Street Legend, Small Bag', emoji: '👑',
        test: (c) => c.vars.cred >= 70 && c.vars.fans >= 65 && c.vars.cash < 3000000,
        blurb: 'You kept it 100 and the city loves you forever. The money just hasn’t caught up to the legend yet.',
        share: 'Street legend, small bag 👑 — WahalaVerse: Assume Their Life' },
      { id: 'one_hit_wonder', title: 'One-Hit Wonder', emoji: '📉',
        test: (c) => c.vars.buzz < 45,
        blurb: 'The window closed while you hesitated or chased the wrong move. One moment, then quiet.',
        share: 'I fumbled my one shot 📉 — think you’d do better? WahalaVerse: Assume Their Life' },
      { id: 'steady_comeup', title: 'Steady Come-Up', emoji: '📈',
        test: () => true,
        blurb: 'No explosion, no disaster — a real, sustainable career start. You’re still here, and still building.',
        share: 'Slow and steady come-up 📈 — WahalaVerse: Assume Their Life' },
    ],
  };
});
