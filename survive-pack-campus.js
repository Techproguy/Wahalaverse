/* WahalaVerse — Survive Naija 2.0 SCENARIO PACK: "Campus Survival" (student / young adult).
   BETA scenario (architecture + content in active scope; Payday is the fully-tuned launch
   scenario). Same engine, a student's week: a tight allowance, classes and an exam looming,
   a squad that has your back, and all the small temptations and dangers of campus life.
   Exposes window.WAHALA_SURVIVE_CAMPUS / module.exports. */
(function (root, factory) {
  'use strict';
  const pack = factory();
  if (typeof module === 'object' && module.exports) module.exports = pack;
  else root.WAHALA_SURVIVE_CAMPUS = pack;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  return {
    id: 'campus', scenario: 'student', title: 'Campus Survival',
    maxDays: 7, apPerDay: 3,
    background: 'A student on a tight weekly allowance with an exam looming. (Beta)',
    briefing: {
      hook: 'It’s a heavy week on campus: ₦7,000 to last seven days, classes you can’t miss, an exam on the horizon — and all the gist, temptations and wahala of student life.',
      how: ['3 moves a day. Attend class and study to protect your grades, or gig for small money.',
            'Your roommate, your squad and even a lecturer remember how you treat them.',
            'A rough day is survivable. By week’s end you’ll see how your academics, money and sanity held up.'],
    },
    indicators: [
      { key: 'cash', label: 'Cash', emoji: '💵', fmt: 'naira' },
      { key: 'food', label: 'Food', emoji: '🍚', fmt: 'meals' },
      { key: 'power', label: 'Light', emoji: '⚡', fmt: 'days' },
      { key: 'wellbeing', label: 'Wellbeing', emoji: '🧠', fmt: 'pct' },
      { key: 'safety', label: 'Safety', emoji: '🛡️', fmt: 'pct' },
      { key: 'livelihood', label: 'Academics', emoji: '📚', fmt: 'pct' },
      { key: 'support', label: 'Squad', emoji: '🫂', fmt: 'pct', derived: true },
    ],
    start: { res: { cash: 7000, food: 3, power: 2, wellbeing: 70, safety: 70, livelihood: 55 } },
    npcs: [
      { id: 'tobi', name: 'Tobi', role: 'roommate' },
      { id: 'ada', name: 'Ada', role: 'classmate' },
      { id: 'okon', name: 'Dr. Okon', role: 'lecturer' },
      { id: 'mummy', name: 'Mummy', role: 'family' },
    ],
    actions: [
      { id: 'class', group: 'work', cost: { ap: 1 }, label: (r) => (r.today.done.work ? '✅ Attended class' : 'Go to class'), available: (r) => !r.today.done.work,
        apply: (r, c) => { c.add('livelihood', 5); c.add('wellbeing', -4); r.today.done.work = true; c.counter('classDays'); c.react('Lecture done. Attendance counts.'); } },
      { id: 'study', group: 'self', cost: { ap: 1 }, label: 'Study hard', available: () => true, apply: (r, c) => { c.add('livelihood', 6); c.add('wellbeing', -6); c.counter('studyDays'); c.react('Head in the books. Future you says thanks.'); } },
      { id: 'gig', group: 'money', cost: { ap: 1 }, label: 'Do a small gig (typing/runs)', available: (r) => r.res.wellbeing > 15, apply: (r, c) => { const earn = c.randInt(1500, 4000); c.add('cash', earn); c.add('wellbeing', -7); c.react('Side gig paid ₦' + earn.toLocaleString() + '.'); } },
      { id: 'buyfood', group: 'needs', cost: { ap: 1, cash: 2500 }, label: 'Buy foodstuff (₦2,500)', available: () => true, apply: (r, c) => { c.add('food', 4); c.react('Noodles and garri secured. 4 meals.'); } },
      { id: 'eatout', group: 'needs', cost: { ap: 1, cash: 700 }, label: 'Buy from the buttery (₦700)', available: () => true, apply: (r, c) => { c.add('wellbeing', 6); c.react('Small chops, big morale.'); } },
      { id: 'rest', group: 'self', cost: { ap: 1 }, label: 'Rest & recharge', available: () => true, apply: (r, c) => { c.add('wellbeing', 12); c.add('safety', 2); c.react('You logged off and slept well.'); } },
      { id: 'power', group: 'needs', cost: { ap: 1, cash: 1200 }, label: 'Buy data / charge up (₦1,200)', available: () => true, apply: (r, c) => { c.add('power', 3); r.flags.noPower = false; c.react('Online and charged.'); } },
    ],
    npcAsks: [
      { id: 'tobi_borrow', npc: 'tobi', group: 'call', cost: { ap: 1 }, label: 'Borrow ₦3,000 from Tobi', available: (r) => !r.flags.borrowedTobi && r.npcs.tobi.goodwill >= -2, apply: (r, c) => { c.add('cash', 3000); c.npc('tobi', -1); c.flag('borrowedTobi'); c.seed({ id: 'tobi_repay', fireDay: r.day + 3, handler: 'tobi_repay', note: 'Tobi needed his ₦3,000 back.', cause: 'borrowing from your roommate' }); c.react('Tobi borrowed you ₦3,000. “Chairman, no forget o.”'); } },
      { id: 'ada_study', npc: 'ada', group: 'call', cost: { ap: 1 }, label: 'Study with Ada’s group', available: () => true, apply: (r, c) => { c.add('livelihood', 4); c.npc('ada', 2); c.add('wellbeing', 2); c.seed({ id: 'group_pays', fireDay: Math.min(r.maxDays, r.day + 3), effects: { livelihood: 6 }, note: 'The group study paid off — you smashed a surprise test.', cause: 'studying with your squad' }); c.react('Two heads are better than one. Squad +.'); } },
      { id: 'mummy_topup', npc: 'mummy', group: 'call', cost: { ap: 1 }, label: 'Beg Mummy for allowance top-up', available: (r) => (r.counters.askedMummy || 0) < 2, apply: (r, c) => { c.counter('askedMummy'); const amt = c.randInt(2000, 5000); c.add('cash', amt); c.npc('mummy', -1); c.add('wellbeing', -2); c.react('Mummy sent ₦' + amt.toLocaleString() + '. “This one na the last o.”'); } },
      { id: 'okon_extension', npc: 'okon', group: 'call', cost: { ap: 1 }, label: 'Ask Dr. Okon for a deadline extension', available: (r) => !!r.flags.assignmentDue, apply: (r, c) => { if (c.npcGoodwill('okon') >= 0 || r.res.livelihood >= 55) { r.flags.assignmentDue = false; c.add('livelihood', 4); c.react('Dr. Okon granted a few more days. Respect.'); } else { c.add('livelihood', -3); c.react('“Deadlines are deadlines.” No luck.'); } } },
      { id: 'okon_officehours', npc: 'okon', group: 'call', cost: { ap: 1 }, label: 'Attend Dr. Okon’s office hours', available: () => true, apply: (r, c) => { c.npc('okon', 2); c.add('livelihood', 2); c.react('A good impression with the lecturer never hurts.'); } },
    ],
    seedHandlers: {
      tobi_repay: (r, c) => { if (c.get('cash') >= 3000) { c.add('cash', -3000); c.npc('tobi', 1); } else c.npc('tobi', -2); },
    },
    scripted: { 2: ['group_assignment'] }, eventsPerDay: (day) => (day <= 6 ? 1 : 0),
    deck: [
      { id: 'group_assignment', scriptedOnly: true, mandatory: true, title: 'Group assignment drops 📝', body: 'A graded group assignment is due in a few days — and your group is… a group.', choices: [{ id: 'lead', label: 'Step up and lead it', effects: { livelihood: 4, wellbeing: -6 }, npc: { ada: 1 }, reaction: 'Stressful, but your grade is in your hands.' }, { id: 'coast', label: 'Coast and hope', apply: (r, c) => { c.flag('assignmentDue'); c.seed({ id: 'assign_miss', fireDay: Math.min(r.maxDays, r.day + 3), cond: (rr) => rr.flags.assignmentDue, effects: { livelihood: -8 }, note: 'The group assignment flopped — you coasted and it showed.', cause: 'not pulling your weight on the assignment' }); c.react('You leave it to the group. Risky.'); } }] },
      { id: 'exam_pressure', weight: 2, title: 'Exam is close 😰', body: 'A major test is coming and you’re not fully ready.', choices: [{ id: 'cram', label: 'Cram tonight', effects: { livelihood: 5, wellbeing: -8 }, reaction: 'Burning the midnight fuel.' }, { id: 'balance', label: 'Study a bit, sleep well', effects: { livelihood: 2, wellbeing: 3 }, reaction: 'Steady wins the race.' }] },
      { id: 'fellowship', weight: 1, title: 'Campus fellowship + free food 🍛', body: 'A fellowship programme has free food and good vibes.', choices: [{ id: 'go', label: 'Attend', effects: { food: 2, wellbeing: 6 }, npc: { tobi: 1 }, reaction: 'Fed body and soul. Community wins.' }] },
      { id: 'night_safety', weight: 1, mandatory: true, title: 'Walking back at night 🌃', body: 'It’s late and the route to your hostel feels sketchy.', choices: [{ id: 'squad', label: 'Walk with your squad', apply: (r, c) => { if (c.support() >= 50) { c.add('safety', 3); c.react('Safety in numbers — you got home fine.'); } else { c.add('safety', -8); c.add('wellbeing', -5); c.react('You walked mostly alone. Scary.'); } } }, { id: 'keke', label: 'Pay for a keke (₦500)', cost: { cash: 500 }, reaction: 'Small money for peace of mind.' }] },
      { id: 'asuu_rumor', weight: 1, title: 'ASUU strike rumour 📢', body: 'Word is the lecturers may go on strike. Chaos and uncertainty.', choices: [{ id: 'focus', label: 'Ignore the noise, keep studying', effects: { livelihood: 3 }, reaction: 'You control what you can.' }, { id: 'panic', label: 'Join the panic WhatsApp groups', effects: { wellbeing: -5 }, reaction: 'Hours lost to rumours.' }] },
      { id: 'pickpocket', weight: 1, mandatory: true, title: 'Pickpocket in the crowd 👀', body: 'In a packed shuttle, a hand goes for your pocket.', choices: [{ id: 'alert', label: 'Stay alert, hold your stuff', effects: { safety: 2 }, reaction: 'You clocked them early. Nothing lost.' }, { id: 'distracted', label: 'You were on your phone', effects: { cash: -2000, wellbeing: -4 }, reaction: 'They got ₦2,000. Painful.' }] },
      { id: 'crush_moment', weight: 1, oncePerRun: true, title: 'A moment with someone 💘', body: 'Someone you like asks you to hang out this evening.', choices: [{ id: 'go', label: 'Go for it (₦1,500)', cost: { cash: 1500 }, effects: { wellbeing: 10 }, npc: { ada: 1 }, reaction: 'Butterflies. Worth it.' }, { id: 'study', label: 'Rain check — exam first', effects: { livelihood: 2 }, reaction: 'Discipline. The books call.' }] },
      { id: 'hostel_nepa', weight: 1, title: 'Hostel blackout 🔦', body: 'No light in the hostel for days.', choices: [{ id: 'readingroom', label: 'Use the reading room', effects: { livelihood: 3, wellbeing: -3 }, reaction: 'You adapt — study where there’s light.' }, { id: 'endure', label: 'Endure the dark', effects: { wellbeing: -5 }, sets: { noPower: true }, reaction: 'Phone torch and vibes.' }] },
      { id: 'free_gig', weight: 1, title: 'Quick campus gig 💻', body: 'A senior needs help typing a project — small pay.', choices: [{ id: 'take', label: 'Take it (₦2,500)', effects: { cash: 2500, wellbeing: -5 }, reaction: 'Small money, useful money.' }, { id: 'pass', label: 'Pass — focus on your own work', effects: { livelihood: 2 }, reaction: 'Priorities.' }] },
      { id: 'squad_support', weight: 1, precondition: (r, c) => c.support() >= 60, title: 'Your squad shows up 🫂', body: 'When you’re low, your friends pool together to help.', choices: [{ id: 'accept', label: 'Accept the love', effects: { food: 2, wellbeing: 6, cash: 1500 }, reaction: 'Real friends are a whole safety net.' }] },
    ],
    onNight: (r, c, night) => {
      if (!r.today.done.work && r.day <= 5) { c.add('livelihood', -5); const m = c.counter('skippedClass'); if (m >= 2) night.notes.push('Skipping classes is hurting your grades.'); }
    },
    onPayday: (r, c) => { c.add('cash', 4000); r.flags.newAllowance = true; }, // next week's allowance lands
    endings: [
      { id: 'burnt_out', title: 'Burnt Out', emoji: '🪫', test: (c) => c.res.wellbeing < 25, blurb: 'You pushed through the week on fumes. The grades may survive; you need serious rest.', share: 'Campus burnt me out this week 🪫 — WahalaVerse: Survive Naija' },
      { id: 'carryover', title: 'Carryover Loading', emoji: '📕', test: (c) => c.res.livelihood < 28, blurb: 'Too many skipped classes and dodged work — the academics slipped badly. Carryover is calling.', share: 'My grades no gree this week 📕 — WahalaVerse: Survive Naija' },
      { id: 'broke', title: 'Broke Student', emoji: '📉', test: (c) => c.res.cash < 800, blurb: 'The allowance vanished fast. You made it, but you’re surviving on garri and faith.', share: 'Broke student life 📉 — WahalaVerse: Survive Naija' },
      { id: 'deans_list', title: 'Dean’s List Energy', emoji: '🎓', test: (c) => c.res.livelihood >= 68 && c.res.wellbeing >= 45, blurb: 'Classes attended, exam prepped, head intact — a genuinely strong academic week.', share: 'Dean’s list energy this week 🎓 — WahalaVerse: Survive Naija' },
      { id: 'campus_legend', title: 'Campus Legend', emoji: '🫂', test: (c) => c.support >= 68, blurb: 'Grades or not, everybody knows you and loves you. Your squad is your superpower.', share: 'Campus legend, squad deep 🫂 — WahalaVerse: Survive Naija' },
      { id: 'scraped', title: 'Scraped Through', emoji: '😮‍💨', test: () => true, blurb: 'Not pretty, but you survived another campus week with your sanity (mostly) intact.', share: 'Scraped through another campus week 😮‍💨 — WahalaVerse: Survive Naija' },
    ],
  };
});
