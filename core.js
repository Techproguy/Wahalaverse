/* WahalaVerse core — pure, framework-free logic shared by the browser app and the
   Node test suite. Loaded as a classic <script> (exposes window.WahalaCore) OR
   required in Node (module.exports). No DOM, no network, no side effects. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WahalaCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // --- Content ---------------------------------------------------------------
  const Q = [
    {q:'You mistakenly receive ₦500,000. What are you most likely to do?', a:['Return the full money. Immediately. 😇','Keep ₦50k for emotional damages 😭','First confirm whether it is a miracle 👀']},
    {q:'Your crush replies "lol" after your long message. Your next move?', a:['Type another paragraph. They must understand!','Act unbothered and disappear for 3 days','Send a meme and change the topic']},
    {q:'You win ₦2 million unexpectedly. What gets the first money?', a:['Investment. My future self must eat.','Soft life, jollof and a flight ✈️','Family first. Everybody go chop.']},
    {q:'A friend posts your very embarrassing throwback photo. What next?', a:['Beg politely for it to come down','Post something worse. War is war. 😭','Laugh and repost. Nobody can shame me.']},
    {q:'The group chat is planning an outing. You?', a:['Organise everything. Somebody has to.','Say "I’m coming" and never appear','Ask how much it will cost first!']},
    {q:'Someone says "we need to talk." You immediately think...', a:['What have I done now? 😭','Finally, some gossip!','Let me switch off my phone.']},
    {q:'Pick your ideal Saturday in Nigeria.', a:['Staying home with a series and snacks','Outside! Anywhere with music and gist','Sleeping until Monday if possible']}
  ];
  const QUESTION_COUNT = Q.length;

  const DEMO = {type:'sample',title:'Can you predict my wahala?',owner_name:'WahalaVerse Crew',answers:[2,1,2,1,2,0,1],template_version:1};

  const SCENES = [
    {title:'Salary don enter! 🎉',emoji:'💸',text:'Your ₦180,000 salary lands. Your friends want an expensive Friday night out.',choices:[
      {label:'Go out. You only live once!',money:-45000,peace:15,street:20,reply:'Big flex! But the month just started. 👀'},
      {label:'Say you are "on your way" and stay home',money:0,peace:18,street:-10,reply:'Your wallet says thank you. Your friends have questions.'},
      {label:'Set a ₦10k enjoyment budget',money:-10000,peace:12,street:8,reply:'Responsible enjoyment. Rare but possible!'}]},
    {title:'Family group chat is active',emoji:'📲',text:'Your cousin wants ₦35,000 urgently. Your rent is due soon.',choices:[
      {label:'Send the ₦35,000 now',money:-35000,peace:-8,street:15,reply:'You are the family hero. Your account balance disagrees.'},
      {label:'Offer ₦10,000 and explain',money:-10000,peace:8,street:5,reply:'Boundaries! But the aunties may discuss you.'},
      {label:'Pretend your phone has spoiled',money:0,peace:-18,street:-8,reply:'Seven missed calls. One voice note. Trouble.'}]},
    {title:'Transport wahala 🚕',emoji:'🚦',text:'Rain falls. Ride-hailing prices triple. You have somewhere to be.',choices:[
      {label:'Pay ₦18,000 to get there',money:-18000,peace:12,street:8,reply:'Comfort is expensive in this economy.'},
      {label:'Enter public transport for ₦3,000',money:-3000,peace:-10,street:10,reply:'You survived and saved money. Character development.'},
      {label:'Cancel everything and go home',money:0,peace:15,street:-8,reply:'Peace won. Your group chat did not.'}]},
    {title:'The final temptation',emoji:'🛍️',text:'You find a sneaker you love for ₦65,000, and payday is far away.',choices:[
      {label:'Buy it. Drip is forever.',money:-65000,peace:16,street:18,reply:'Your feet look rich. Your wallet looks confused.'},
      {label:'Close the tab. Discipline wins.',money:0,peace:10,street:2,reply:'Financial maturity has entered the chat.'},
      {label:'Wait for a sale. Maybe next month.',money:0,peace:12,street:6,reply:'A patient legend. Your bank app smiles.'}]}
  ];

  const SIM_START = {money:180000, peace:55, street:40};

  // --- Helpers ---------------------------------------------------------------
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const titleCase = s => String(s || '').trim().slice(0, 30);

  const formatNaira = n => '₦' + Number(n).toLocaleString('en-NG');

  // --- Guest challenge link encoding ----------------------------------------
  // Answers are base64url-encoded into the URL. Observable to technical users —
  // suitable for casual fun, NOT for prizes/competitions.
  function encodeChallenge(ch) {
    const src = JSON.stringify({v:1, n:ch.owner_name, t:ch.title, a:ch.answers});
    const bytes = new TextEncoder().encode(src);
    return btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function decodeChallenge(token) {
    if (!token || token.length > 3500) throw new Error('Bad link');
    const b64 = token.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    const ch = JSON.parse(new TextDecoder().decode(bytes));
    if (ch.v !== 1
      || typeof ch.n !== 'string' || ch.n.length > 35
      || typeof ch.t !== 'string' || ch.t.length > 80
      || !Array.isArray(ch.a) || ch.a.length !== QUESTION_COUNT
      || !ch.a.every(x => Number.isInteger(x) && x >= 0 && x <= 2)) {
      throw new Error('Bad challenge');
    }
    return {type:'guest', owner_name:ch.n, title:ch.t, answers:ch.a, template_version:1};
  }

  // --- Game logic ------------------------------------------------------------
  function scoreQuiz(playAnswers, answers) {
    return (playAnswers || []).reduce((n, ans, i) => n + (ans === answers[i] ? 1 : 0), 0);
  }

  // Apply one Survive Naija choice to a {money,peace,street} snapshot. Pure.
  function applySimChoice(stats, choice) {
    return {
      money: Math.max(0, stats.money + choice.money),
      peace: Math.min(100, Math.max(0, stats.peace + choice.peace)),
      street: Math.min(100, Math.max(0, stats.street + choice.street)),
    };
  }

  // --- Activity sync eligibility (privacy) -----------------------------------
  // Returns the locally-stored activities that may be uploaded for `userId`.
  // An item is eligible only if it is NOT already synced AND one of:
  //   - it is owned by this same user (already attributed to them), OR
  //   - it is an UNOWNED guest item created in THIS browser session
  //     (`it.session === sessionId`).
  // localStorage persists across sessions and across different people on a
  // shared browser, so an unowned item WITHOUT a matching session id is never
  // auto-attached to a signed-in account — this prevents silently importing
  // another guest's history, and prevents one account's activity leaking into
  // another account that later signs in on the same browser.
  function syncableActivities(items, userId, sessionId) {
    if (!userId) return [];
    return (items || []).filter(it => {
      if (it.synced) return false;
      if (it.owner === userId) return true;        // already this user's
      if (it.owner) return false;                  // owned by a different user
      return !!sessionId && it.session === sessionId; // guest item, this session only
    });
  }

  // --- Pending signup display name (privacy) ---------------------------------
  // A display name typed at sign-in is stashed locally as {email, name, ts} so it
  // can seed the profile when the magic link/OTP completes. It must ONLY be used
  // for the SAME email and within a TTL, or one person's pending name could seed a
  // different account that signs in later on the same browser. Returns the name
  // only when the stored record matches `email` (case-insensitive) and is fresh.
  const PENDING_NAME_TTL_MS = 60 * 60 * 1000; // 1 hour
  function pendingNameFor(raw, email, now, ttlMs) {
    if (!raw || !email) return null;
    const ttl = (typeof ttlMs === 'number') ? ttlMs : PENDING_NAME_TTL_MS;
    let obj;
    try { obj = JSON.parse(raw); } catch { return null; }
    if (!obj || typeof obj !== 'object') return null;
    if (typeof obj.email !== 'string' || typeof obj.name !== 'string' || typeof obj.ts !== 'number') return null;
    if (obj.email.trim().toLowerCase() !== String(email).trim().toLowerCase()) return null;
    if (ttl > 0 && (now - obj.ts) > ttl) return null;
    return obj.name;
  }

  return {
    Q, QUESTION_COUNT, DEMO, SCENES, SIM_START,
    escapeHtml, titleCase, formatNaira,
    encodeChallenge, decodeChallenge,
    scoreQuiz, applySimChoice, syncableActivities,
    pendingNameFor, PENDING_NAME_TTL_MS,
  };
});
