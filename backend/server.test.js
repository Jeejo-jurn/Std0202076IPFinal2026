const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { app, kMeans1D } = require('./server');

let server;
let base;
const auth = { Authorization: 'Bearer mock-jwt-token', 'Content-Type': 'application/json' };

before(async () => {
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://localhost:${server.address().port}/api`;
});
after(() => server.close());

const post = (path, body, headers = auth) =>
  fetch(base + path, { method: 'POST', headers, body: JSON.stringify(body) });

test('login: correct credentials -> 200 + token', async () => {
  const res = await post('/login', { username: 'admin', password: 'password123' }, { 'Content-Type': 'application/json' });
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(await res.json(), { success: true, token: 'mock-jwt-token' });
});

test('login: wrong credentials -> 401', async () => {
  const res = await post('/login', { username: 'admin', password: 'nope' }, { 'Content-Type': 'application/json' });
  assert.strictEqual(res.status, 401);
});

test('employees without token -> 401', async () => {
  const res = await fetch(`${base}/employees`);
  assert.strictEqual(res.status, 401);
});

test('GET employees returns at least 5 records with correct schema', async () => {
  const res = await fetch(`${base}/employees`, { headers: auth });
  const data = await res.json();
  assert.strictEqual(res.status, 200);
  assert.ok(data.length >= 5);
  for (const e of data) {
    assert.strictEqual(typeof e.id, 'string');
    assert.ok(['Active', 'On Leave'].includes(e.status));
    assert.strictEqual(typeof e.salary, 'number');
  }
});

test('POST employee: empty / invalid fields -> 400', async () => {
  for (const body of [
    {},
    { name: '', position: 'Dev', salary: 1000 },
    { name: 'A', position: '   ', salary: 1000 },
    { name: 'A', position: 'Dev', salary: '' },
    { name: 'A', position: 'Dev', salary: 'abc' },
    { name: 'A', position: 'Dev', salary: -5 },
  ]) {
    const res = await post('/employees', body);
    assert.strictEqual(res.status, 400, JSON.stringify(body));
  }
});

test('POST employee accepts salary with thousands separator', async () => {
  const res = await post('/employees', { name: 'Comma', position: 'Intern', salary: '20,000' });
  assert.strictEqual(res.status, 201);
  const created = await res.json();
  assert.strictEqual(created.salary, 20000);
  await fetch(`${base}/employees/${created.id}`, { method: 'DELETE', headers: auth });
});

test('POST, toggle status, DELETE flow', async () => {
  const created = await (await post('/employees', { name: 'Test', position: 'QA', salary: 33000 })).json();
  assert.strictEqual(created.status, 'Active');
  assert.strictEqual(created.salary, 33000);

  const toggle = () => fetch(`${base}/employees/${created.id}/status`, { method: 'PUT', headers: auth });
  assert.strictEqual((await (await toggle()).json()).status, 'On Leave');
  assert.strictEqual((await (await toggle()).json()).status, 'Active');

  const del = await fetch(`${base}/employees/${created.id}`, { method: 'DELETE', headers: auth });
  assert.strictEqual(del.status, 200);
  const again = await fetch(`${base}/employees/${created.id}`, { method: 'DELETE', headers: auth });
  assert.strictEqual(again.status, 404);
});

test('salary-clusters returns 3 tiers whose counts sum to employee count', async () => {
  const employees = await (await fetch(`${base}/employees`, { headers: auth })).json();
  const res = await fetch(`${base}/employees/salary-clusters`, { headers: auth });
  const data = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.clusters.length, 3);
  assert.deepStrictEqual(data.clusters.map((c) => c.group), ['Tier 1', 'Tier 2', 'Tier 3']);
  assert.strictEqual(data.clusters.reduce((s, c) => s + c.count, 0), employees.length);
});

test('kMeans1D handles edge cases without crashing', () => {
  assert.deepStrictEqual(kMeans1D([]), []);
  assert.strictEqual(kMeans1D([5000]).length, 1);
  assert.strictEqual(kMeans1D([100, 100, 100, 100]).length, 1);
  assert.strictEqual(kMeans1D([1, 2]).length, 2);
  const r = kMeans1D([10, 11, 12, 50, 51, 52, 100, 101, 102]);
  assert.deepStrictEqual(r.map((c) => [c.centroid, c.count]), [[11, 3], [51, 3], [101, 3]]);
});
