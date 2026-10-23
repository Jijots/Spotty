import test from 'node:test';
import assert from 'node:assert/strict';
import { LIBRARY } from '../src/data/exercises';
import { buildMenu, buildMessages, extractJson, parseAiProgram } from '../src/lib/aiProgram';
import { normalizeUrl } from '../src/lib/ollama';

const menu = buildMenu(LIBRARY, ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight']);
const ids = menu.map((m) => m.id);

test('the menu holds only curated exercises that fit the equipment', () => {
  assert.ok(menu.length > 30 && menu.length < 120);
  assert.ok(menu.every((m) => ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight'].includes(m.equipment)));
  assert.equal(buildMenu(LIBRARY, []).length, 0);
});

test('the prompt lists every allowed exercise id and carries the request', () => {
  const [sys, user] = buildMessages('  4 days, bring up my chest  ', menu);
  assert.equal(sys.role, 'system');
  assert.ok(ids.every((id) => sys.content.includes(id)));
  assert.equal(user.content, '4 days, bring up my chest');
  assert.equal(buildMessages('x'.repeat(5000), menu)[1].content.length, 1200);
});

test('a good reply becomes a program, with numbers clamped and swapped into order', () => {
  const reply = JSON.stringify({
    name: 'Chest Focus',
    days: [{ name: 'Push', items: [
      { exerciseId: ids[0], sets: 40, repMin: 12, repMax: 6, rir: 9 },
      { exerciseId: ids[1], sets: 3, repMin: 8, repMax: 12, rir: 2 },
      { exerciseId: ids[2], sets: 0, repMin: 5, repMax: 8, rir: 1 },
    ] }],
  });
  const r = parseAiProgram('```json\n' + reply + '\n```', menu);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.draft.name, 'Chest Focus');
  const [a, b, c] = r.draft.days[0].items;
  assert.deepEqual([a.sets, a.repMin, a.repMax, a.rir], [6, 6, 12, 4]);
  assert.deepEqual([b.sets, b.repMin, b.repMax], [3, 8, 12]);
  assert.equal(c.sets, 1);
});

test('invented and repeated exercises are dropped, and reported', () => {
  const reply = JSON.stringify({ name: 'X', days: [{ name: 'A', items: [
    { exerciseId: ids[0], sets: 3, repMin: 8, repMax: 10, rir: 1 },
    { exerciseId: 'Totally_Fake_Move', sets: 3, repMin: 8, repMax: 10, rir: 1 },
    { exerciseId: ids[0], sets: 2, repMin: 8, repMax: 10, rir: 1 },
    { exerciseId: menu[1].name.toUpperCase(), sets: 3, repMin: 8, repMax: 10, rir: 1 },
    { exerciseId: ids[2], sets: 3, repMin: 8, repMax: 10, rir: 1 },
  ] }] });
  const r = parseAiProgram(reply, menu);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.deepEqual(r.draft.days[0].items.map((i) => i.exerciseId), [ids[0], menu[1].id, ids[2]]);
  assert.ok(r.notes.some((n) => n.includes('Totally_Fake_Move')));
});

test('unusable replies are rejected with a plain message', () => {
  for (const bad of ['', 'sorry I cannot', '{}', '{"days":[]}', '{"name":"x","days":[{"name":"d","items":[{"exerciseId":"nope","sets":3,"repMin":5,"repMax":8,"rir":1}]}]}']) {
    const r = parseAiProgram(bad, menu);
    assert.ok(!r.ok, bad);
    if (!r.ok) assert.ok(r.error.length > 10);
  }
  // too few valid exercises overall
  const two = JSON.stringify({ name: 'x', days: [{ name: 'd', items: ids.slice(0, 2).map((id) => ({ exerciseId: id, sets: 3, repMin: 5, repMax: 8, rir: 1 })) }] });
  assert.ok(!parseAiProgram(two, menu).ok);
});

test('extractJson finds an object inside chatter', () => {
  assert.deepEqual(extractJson('Sure! {"a":1} hope that helps'), { a: 1 });
  assert.equal(extractJson('no json here'), null);
  assert.equal(extractJson('{broken'), null);
});

test('server addresses are tidied, and nonsense is refused', () => {
  assert.equal(normalizeUrl('192.168.1.20'), 'http://192.168.1.20:11434');
  assert.equal(normalizeUrl(' http://my-pc.local:11434/ '), 'http://my-pc.local:11434');
  assert.equal(normalizeUrl('https://ollama.example.com'), 'https://ollama.example.com:11434');
  assert.equal(normalizeUrl('10.0.0.5:8080'), 'http://10.0.0.5:8080');
  assert.equal(normalizeUrl(''), null);
  assert.equal(normalizeUrl('two words'), null);
  assert.equal(normalizeUrl('host:99999'), null);
});
