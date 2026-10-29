// Deterministic tests for the CEO Life role pack on the shared engine.
// Run with: npm run test:unit
const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../atl-engine.js');
const PACK = require('../atl-pack-ceo.js');

function play(seq) {
  const run = E.createRun(PACK);
  for (const id of seq) E.choose(PACK, run, id);
  return run;
}

const OUSTED = ['C', 'E', 'H', 'K', 'O', 'P', 'S'];       // proxy fight + weak numbers -> board removes you
const TURNAROUND = ['A', 'D', 'G', 'L', 'N', 'P', 'S'];   // invest, settle, deliver
const SHORT_TERM = ['A', 'E', 'H', 'K', 'N', 'P', 'S'];   // numbers up, reputation spent
const SOLD = ['A', 'D', 'G', 'L', 'N', 'P', 'T'];         // sell the company
const MULTISEED = ['B', 'E', 'H', 'L', 'O', 'P', 'S'];    // cuts -> morale/exec/channel cascades

test('CEO starts as a hired boss: small equity + a 5-seat board', () => {
  const run = E.createRun(PACK);
  assert.equal(run.currentEventId, 'E1');
  assert.equal(run.custom.board.friendly + run.custom.board.independent + run.custom.board.activist, 5);
  assert.equal(run.custom.board.activist, 0);
  // CEO owns a small slice, not the company (distinct from Founder Life)
  const S = require('../atl-systems.js');
  assert.ok(S.capOwnership(run.custom.cap, 'ceo') <= 0.1);
});

test('CEO variables are operating/governance metrics (distinct from Founder)', () => {
  assert.deepEqual(Object.keys(PACK.vars).sort(),
    ['boardConfidence', 'cash', 'marketShare', 'morale', 'reputation', 'revenue'].sort());
});

test('DISTINCT MECHANIC — the board can remove the CEO', () => {
  const run = play(OUSTED);
  assert.equal(run.ending.id, 'ousted_by_board');
  assert.ok(run.custom.board.activist >= 2, 'an activist bloc formed');
  assert.ok(run.vars.boardConfidence < 42, 'confidence was too low to survive');
});

test('activist actions change board composition (seats flip from independents)', () => {
  const run = E.createRun(PACK);
  for (const id of ['A', 'D', 'G', 'K']) E.choose(PACK, run, id); // K = public proxy fight
  assert.equal(run.custom.board.activist, 2);
  assert.equal(run.custom.board.independent, 0);
});

test('DELAYED consequences: cuts cascade into later misses, traced back', () => {
  const run = play(MULTISEED);
  const ids = run.fired.map(f => f.id);
  assert.ok(run.fired.length >= 2, 'two or more delayed consequences');
  assert.ok(ids.includes('S_moralecrash') || ids.includes('S_execgap'));
  for (const f of run.fired) { assert.ok(f.cause && f.note); assert.ok(f.firedWeek > 1); }
});

test('DIVERGENT outcomes from different leadership', () => {
  assert.equal(play(TURNAROUND).ending.id, 'turnaround_hero');
  assert.equal(play(SHORT_TERM).ending.id, 'short_term_winner');
  assert.equal(play(OUSTED).ending.id, 'ousted_by_board');
  assert.notEqual(play(TURNAROUND).ending.id, play(OUSTED).ending.id);
});

test('as a HIRED CEO, selling nets you little (you do not own the company)', () => {
  const run = play(SOLD);
  assert.equal(run.ending.id, 'sold_the_company');
  assert.ok(run.custom.dealValue > 0);
  // CEO's take is dominated by the parachute, not ownership (small stake)
  assert.ok(run.custom.ceoProceeds < run.custom.dealValue * 0.2);
});

test('deterministic: same choices -> identical state and ending', () => {
  const a = play(OUSTED), b = play(OUSTED);
  assert.deepEqual(a.vars, b.vars);
  assert.equal(a.ending.id, b.ending.id);
  assert.equal(a.custom.board.activist, b.custom.board.activist);
});

test('Reckoning explains the CEO year (deltas, traced surprises, pivotal decisions)', () => {
  const r = E.reckoning(PACK, play(MULTISEED));
  assert.equal(r.deltas.length, Object.keys(PACK.vars).length);
  assert.ok(r.surprises.length >= 2 && r.surprises.every(s => s.cause && s.note));
  assert.ok(r.pivotal.length >= 2 && r.pivotal.every(p => p.label && p.why));
  assert.ok(r.ending.title && r.ending.blurb);
});
