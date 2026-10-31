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
  // Built-in Quick Challenge questions are TEMPLATES with subject tokens so they can
  // render from the right perspective: the CREATOR sees them about themselves ("you"),
  // and a RECIPIENT predicting the creator sees them about the creator (their name).
  // Tokens: {they}/{They} = subject (you / Name), {their}/{Their} = possessive (your / Name's).
  // Options are the subject's own answers and are left as authored.
  const Q = [
    {q:'If {they} just received ₦500,000 by mistake, what would {they} most likely do?', a:['Return the full money. Immediately. 😇','Keep ₦50k for emotional damages 😭','First confirm whether it is a miracle 👀']},
    {q:'{Their} crush replies "lol" after a long message. What is {their} next move?', a:['Type another paragraph. They must understand!','Act unbothered and disappear for 3 days','Send a meme and change the topic']},
    {q:'{They} just won ₦2 million unexpectedly. What gets {their} first money?', a:['Investment. The future self must eat.','Soft life, jollof and a flight ✈️','Family first. Everybody go chop.']},
    {q:'A friend posts {their} most embarrassing throwback photo. What would {they} do next?', a:['Beg politely for it to come down','Post something worse. War is war. 😭','Laugh and repost. Nobody can shame them.']},
    {q:'The group chat is planning an outing. What is {their} move?', a:['Organise everything. Somebody has to.','Say "I’m coming" and never appear','Ask how much it will cost first!']},
    {q:'Someone says "we need to talk." What is {their} first thought?', a:['What have I done now? 😭','Finally, some gossip!','Time to switch off the phone.']},
    {q:'{Their} ideal Saturday in Nigeria?', a:['Staying home with a series and snacks','Outside! Anywhere with music and gist','Sleeping until Monday if possible']}
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

  // --- Challenge question perspective ---------------------------------------
  // A friendship challenge asks a RECIPIENT to predict the CREATOR. Built-in questions
  // are templates with subject tokens; render them for the right audience:
  //   mode 'self'  → the creator (about themselves): "you" / "your"
  //   mode 'other' → a recipient (about the creator): the creator's name / "Name's"
  // Only these tokens are substituted — authored prose is never otherwise rewritten.
  function renderSubject(tmpl, name, mode) {
    const n = String(name == null ? '' : name).trim();
    const self = mode === 'self';
    const subj = self ? 'you' : n, Subj = self ? 'You' : n;
    const poss = self ? 'your' : (n + "'s"), Poss = self ? 'Your' : (n + "'s");
    return String(tmpl == null ? '' : tmpl)
      .replace(/\{they\}/g, subj).replace(/\{They\}/g, Subj)
      .replace(/\{their\}/g, poss).replace(/\{Their\}/g, Poss);
  }

  // For CREATOR-AUTHORED (custom) text: substitute ONLY an explicit {name} placeholder
  // with the creator's display name. All other authored text is preserved verbatim
  // (we never blindly rewrite "you"/"I"/"my" in user content).
  function fillName(text, name) {
    return String(text == null ? '' : text).replace(/\{name\}/gi, String(name == null ? '' : name).trim());
  }

  // Detect first-/second-person wording in creator-authored custom text so the Builder
  // can NUDGE the creator to refer to themselves by name (recipients predict the
  // creator, so a bare "you"/"my" is ambiguous). This NEVER rewrites text — it only
  // reports. A question that already uses the {name} placeholder is considered clear.
  const PERSPECTIVE_WORDS = new Set([
    'i', "i'm", "i've", "i'd", "i'll", 'me', 'my', 'mine', 'myself', 'we', "we're", 'our', 'ours', 'us',
    'you', "you're", "you'd", "you'll", 'your', 'yours', 'yourself',
  ]);
  // A question is ambiguous when first/second-person words REMAIN, regardless of whether
  // {name} also appears — e.g. "What would you do? {name}" is still ambiguous (it still
  // says "you"). {name} alone (with no pronouns) is clear.
  function detectPerspective(text) {
    const t = String(text == null ? '' : text);
    const hasName = /\{name\}/i.test(t);
    const toks = t.toLowerCase().replace(/’/g, "'").match(/[a-z']+/g) || [];
    const words = [...new Set(toks.filter(w => PERSPECTIVE_WORDS.has(w)))];
    return { hasName, words, ambiguous: words.length > 0 };
  }
  const hasAmbiguousPerspective = (text) => detectPerspective(text).ambiguous;

  // Creator-initiated, grammar-SAFE replacement of self-referring pronouns with the
  // {name} placeholder (so recipients see the creator's name). Only maps words that stay
  // grammatical when swapped for a name; leaves subject-"I"/plurals/contractions alone
  // (those keep the warning for the creator to edit manually — we never risk mangling
  // meaning). Whole-word only (never touches substrings like "young"/"message").
  const NAME_MAP = { you: '{name}', your: "{name}'s", yours: "{name}'s", yourself: '{name}', my: "{name}'s", mine: "{name}'s", me: '{name}' };
  function resolveToName(text) {
    return String(text == null ? '' : text).replace(/[A-Za-z']+/g, (w) => {
      const key = w.toLowerCase().replace(/’/g, "'");
      return Object.prototype.hasOwnProperty.call(NAME_MAP, key) ? NAME_MAP[key] : w;
    });
  }

  // --- Guest challenge link encoding ----------------------------------------
  // Answers are base64url-encoded into the URL. Observable to technical users —
  // suitable for casual fun, NOT for prizes/competitions.
  // Final share-token length cap. Compressed v2 links for realistic (even heavy,
  // emoji-laden, 10-question) challenges measure a few hundred chars; this cap with
  // a clear "edit it" path handles the rare overflow. Not a claim that every
  // theoretical maximum fits.
  const MAX_TOKEN = 4000;
  const MAX_DECOMPRESSED = 16384; // anti zip-bomb guard on decode
  // Limits for "Create Your Own Wahala" (v2).
  const CUSTOM_LIMITS = Object.freeze({
    minQuestions: 3, maxQuestions: 10, minOptions: 2, maxOptions: 4,
    questionLen: 120, optionLen: 60, nameLen: 30, titleLen: 80,
  });

  const toB64url = (bytes) => btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const fromB64url = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

  function b64urlEncode(obj) { return toB64url(new TextEncoder().encode(JSON.stringify(obj))); }
  function b64urlDecode(token) {
    if (!token || token.length > MAX_TOKEN) throw new Error('Bad link');
    return JSON.parse(new TextDecoder().decode(fromB64url(token)));
  }

  // gzip helpers (Web Streams — available in modern browsers and Node 18+).
  async function gzip(bytes) {
    const cs = new CompressionStream('gzip');
    const w = cs.writable.getWriter(); w.write(bytes); w.close();
    return new Uint8Array(await new Response(cs.readable).arrayBuffer());
  }
  async function gunzip(bytes) {
    const ds = new DecompressionStream('gzip');
    const w = ds.writable.getWriter(); w.write(bytes); w.close();
    return new Uint8Array(await new Response(ds.readable).arrayBuffer());
  }
  const canCompress = typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

  // v1 — Quick Challenge (the 7 preset questions). Unchanged, sync, byte-identical.
  function encodeChallenge(ch) {
    return b64urlEncode({ v: 1, n: ch.owner_name, t: ch.title, a: ch.answers });
  }

  // v2 — Create Your Own Wahala. Carries the author's own questions + options.
  // Compressed (gzip) and prefixed with '~' so it's unambiguous vs the plain v1
  // format; falls back to plain base64url if compression is unavailable. Throws
  // Error('too-long') if the final token exceeds MAX_TOKEN — the builder catches
  // this and asks the creator to trim (never silently drops questions/answers).
  // ch: { owner_name, title, questions:[{q, a:[options]}], answers:[intIndex] }
  async function encodeCustomChallenge(ch) {
    const q = (ch.questions || []).map(x => ({ q: x.q, o: x.a }));
    const json = new TextEncoder().encode(JSON.stringify({ v: 2, n: ch.owner_name, t: ch.title, a: ch.answers, q }));
    let token;
    if (canCompress) {
      try { token = '~' + toB64url(await gzip(json)); }
      catch { token = toB64url(json); }
    } else {
      token = toB64url(json);
    }
    if (token.length > MAX_TOKEN) { const err = new Error('too-long'); err.code = 'too-long'; err.length = token.length; throw err; }
    return token;
  }

  // Pure validator for a custom challenge (used by the builder AND the decoder, so
  // the two can never disagree). Returns { ok:true } or { ok:false, error }.
  function validateCustomChallenge(ch) {
    const L = CUSTOM_LIMITS;
    if (!ch || typeof ch !== 'object') return { ok: false, error: 'empty' };
    const name = String(ch.owner_name || '').trim();
    if (name.length < 2 || name.length > L.nameLen) return { ok: false, error: 'name' };
    const title = String(ch.title || '').trim();
    if (title.length < 1 || title.length > L.titleLen) return { ok: false, error: 'title' };
    const qs = ch.questions;
    if (!Array.isArray(qs) || qs.length < L.minQuestions || qs.length > L.maxQuestions) return { ok: false, error: 'questions-count' };
    if (!Array.isArray(ch.answers) || ch.answers.length !== qs.length) return { ok: false, error: 'answers-count' };
    for (let i = 0; i < qs.length; i++) {
      const q = qs[i];
      if (!q || typeof q.q !== 'string' || !q.q.trim() || q.q.trim().length > L.questionLen) return { ok: false, error: 'question-' + i };
      if (!Array.isArray(q.a) || q.a.length < L.minOptions || q.a.length > L.maxOptions) return { ok: false, error: 'options-count-' + i };
      for (const opt of q.a) {
        if (typeof opt !== 'string' || !opt.trim() || opt.trim().length > L.optionLen) return { ok: false, error: 'option-' + i };
      }
      const ans = ch.answers[i];
      if (!Number.isInteger(ans) || ans < 0 || ans >= q.a.length) return { ok: false, error: 'answer-' + i };
    }
    return { ok: true };
  }

  // Decodes BOTH v1 (Quick, plain) and v2 (Custom, '~'-prefixed gzip OR plain)
  // guest links. Async because v2 may need gunzip. Existing v1 links keep working.
  async function decodeChallenge(token) {
    if (!token || token.length > MAX_TOKEN) throw new Error('Bad link');
    let ch;
    if (token[0] === '~') {
      const bytes = await gunzip(fromB64url(token.slice(1)));
      if (bytes.length > MAX_DECOMPRESSED) throw new Error('Bad link'); // anti zip-bomb
      ch = JSON.parse(new TextDecoder().decode(bytes));
    } else {
      ch = b64urlDecode(token);
    }
    if (ch.v === 1) {
      if (typeof ch.n !== 'string' || ch.n.length > 35
        || typeof ch.t !== 'string' || ch.t.length > 80
        || !Array.isArray(ch.a) || ch.a.length !== QUESTION_COUNT
        || !ch.a.every(x => Number.isInteger(x) && x >= 0 && x <= 2)) {
        throw new Error('Bad challenge');
      }
      return { type: 'guest', owner_name: ch.n, title: ch.t, answers: ch.a, template_version: 1 };
    }
    if (ch.v === 2) {
      const norm = {
        owner_name: ch.n, title: ch.t, answers: ch.a,
        questions: Array.isArray(ch.q) ? ch.q.map(x => ({ q: x && x.q, a: x && x.o })) : null,
      };
      if (!validateCustomChallenge(norm).ok) throw new Error('Bad challenge');
      return { type: 'guest', owner_name: norm.owner_name, title: norm.title, questions: norm.questions, answers: norm.answers, template_version: 2 };
    }
    throw new Error('Bad challenge');
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

  // --- Create Your Own Wahala: device-local draft autosave (pure helpers) -----
  // These power the `wv_cc_draft` localStorage autosave. They are intentionally
  // LENIENT: a draft-in-progress is restored even if it does not yet satisfy the
  // final challenge-generation rules (validateCustomChallenge). They only enforce
  // *safe structure, size and limits*, so a corrupted or oversized blob is rejected.
  const CC_DRAFT_VERSION = 1;

  // Is there anything worth saving? (Avoids persisting a pristine blank builder.)
  function isMeaningfulCustomDraft(name, questions) {
    if ((name || '').trim().length > 0) return true;
    if (!Array.isArray(questions)) return false;
    return questions.some(q => q && (
      ((q.q || '').trim().length > 0) ||
      (Array.isArray(q.a) && q.a.some(o => (o || '').trim().length > 0))
    ));
  }

  // Normalise an untrusted parsed draft into a safe builder shape, or null if it
  // cannot be used. Clamps all text to the field limits, caps question/option
  // counts, pads each question to the minimum option inputs, and drops an
  // out-of-range marked answer. Never throws.
  function sanitizeCustomDraft(raw) {
    const L = CUSTOM_LIMITS;
    if (!raw || typeof raw !== 'object' || raw.v !== CC_DRAFT_VERSION) return null;
    if (!Array.isArray(raw.questions) || raw.questions.length === 0) return null;
    const questions = raw.questions.slice(0, L.maxQuestions).map(q => {
      if (!q || typeof q !== 'object') return null;
      const text = typeof q.q === 'string' ? q.q.slice(0, L.questionLen) : '';
      let a = Array.isArray(q.a) ? q.a.filter(o => typeof o === 'string').map(o => o.slice(0, L.optionLen)) : [];
      a = a.slice(0, L.maxOptions);
      while (a.length < L.minOptions) a.push('');
      let answer = Number.isInteger(q.answer) ? q.answer : null;
      if (answer != null && (answer < 0 || answer >= a.length)) answer = null;
      return { q: text, a, answer };
    });
    if (questions.some(q => q === null)) return null;
    const name = typeof raw.name === 'string' ? raw.name.slice(0, L.nameLen) : '';
    return { name, questions };
  }

  return {
    Q, QUESTION_COUNT, DEMO, SCENES, SIM_START, CUSTOM_LIMITS, CC_DRAFT_VERSION,
    escapeHtml, titleCase, formatNaira, renderSubject, fillName, detectPerspective, hasAmbiguousPerspective, resolveToName,
    encodeChallenge, encodeCustomChallenge, decodeChallenge, validateCustomChallenge,
    isMeaningfulCustomDraft, sanitizeCustomDraft,
    scoreQuiz, applySimChoice, syncableActivities,
  };
});
