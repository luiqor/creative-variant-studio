import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

test('serves the static page', async () => {
  const server = createApp().listen(0);
  const { port } = server.address();
  const res = await fetch(`http://localhost:${port}/`);
  const html = await res.text();
  server.close();
  assert.equal(res.status, 200);
  assert.match(html, /id="app"/);
});

const ten = (p) => Array.from({ length: 10 }, (_, i) => `${p} ${i}`);
const stub = (input) => ({
  models: { generateContent: async () => ({ functionCalls: [{ name: 'submit_ideas', args: input }] }) },
});
async function post(client, body) {
  const server = createApp({ client, model: 'm' }).listen(0);
  const res = await fetch(`http://localhost:${server.address().port}/api/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  server.close();
  return { status: res.status, json };
}

test('POST /api/generate returns a batch with one list per chosen type', async () => {
  const input = { hook: ten('h'), cta: ten('c') };
  const { status, json } = await post(stub(input), { script: 'Hook: hi', types: ['hook', 'cta'], count: 10 });
  assert.equal(status, 200);
  assert.deepEqual(json, input);
});

test('POST /api/generate uses a count of 10 when none is given and passes the note on', async () => {
  const calls = [];
  const client = {
    models: {
      generateContent: async (params) => {
        calls.push(params);
        return { functionCalls: [{ name: 'submit_ideas', args: { hook: ten('h') } }] };
      },
    },
  };
  const { status } = await post(client, { script: 's', types: ['hook'], note: 'be playful' });
  assert.equal(status, 200);
  assert.match(calls[0].contents, /10 new hooks/);
  assert.match(calls[0].contents, /be playful/);
});

const invalidBodies = [
  ['an empty script', { script: '  ', types: ['hook'] }],
  ['no types', { script: 's', types: [] }],
  ['missing types', { script: 's' }],
  ['a type name with spaces or capitals', { script: 's', types: ['My Type'] }],
  ['duplicate types', { script: 's', types: ['hook', 'hook'] }],
  ['more than 8 types', { script: 's', types: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'] }],
  ['a count of 0', { script: 's', types: ['hook'], count: 0 }],
  ['a count above 30', { script: 's', types: ['hook'], count: 31 }],
  ['a non-integer count', { script: 's', types: ['hook'], count: 2.5 }],
];

for (const [name, body] of invalidBodies) {
  test(`POST /api/generate rejects ${name} with 400`, async () => {
    const { status, json } = await post(stub({}), body);
    assert.equal(status, 400);
    assert.ok(json.error);
  });
}

async function postMore(client, body) {
  const server = createApp({ client, model: 'm' }).listen(0);
  const res = await fetch(`http://localhost:${server.address().port}/api/more-like-this`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  server.close();
  return { status: res.status, json };
}

const moreBody = {
  type: 'hook',
  source: 'Chosen hook',
  texts: ['Chosen hook', 'Another idea', 'Some overlay'],
  likedTags: ['humor'],
  instruction: 'cheeky',
  count: 3,
};

test('POST /api/more-like-this returns ideas of the chosen type using the designer guidance', async () => {
  const calls = [];
  const client = {
    models: {
      generateContent: async (params) => {
        calls.push(params);
        return { functionCalls: [{ name: 'submit_ideas', args: { hook: ten('n').slice(0, 3) } }] };
      },
    },
  };
  const { status, json } = await postMore(client, moreBody);
  assert.equal(status, 200);
  assert.deepEqual(json, { hook: ten('n').slice(0, 3) });
  for (const expected of ['Chosen hook', 'Another idea', 'Some overlay', 'Humor', 'cheeky']) {
    assert.match(calls[0].contents, new RegExp(expected));
  }
});

const invalidMore = [
  ['an empty source', { ...moreBody, source: '  ' }],
  ['a bad type name', { ...moreBody, type: 'Not Valid' }],
  ['texts that are not a list', { ...moreBody, texts: 'x' }],
  ['more than 500 texts', { ...moreBody, texts: Array.from({ length: 501 }, () => 't') }],
  ['an unknown liked tag', { ...moreBody, likedTags: ['spicy'] }],
  ['a count of 0', { ...moreBody, count: 0 }],
  ['a count above 30', { ...moreBody, count: 31 }],
];

for (const [name, body] of invalidMore) {
  test(`POST /api/more-like-this rejects ${name} with 400`, async () => {
    const { status, json } = await postMore(stub({}), body);
    assert.equal(status, 400);
    assert.ok(json.error);
  });
}

test('POST /api/generate returns an error payload after two invalid responses', async () => {
  const { status, json } = await post(stub({ hook: [] }), { script: 'x', types: ['hook'] });
  assert.equal(status, 502);
  assert.match(json.error, /try again/i);
});

test('serves the AE script template for the export', async () => {
  const server = createApp().listen(0);
  const res = await fetch(`http://localhost:${server.address().port}/ae/duplicate-from-csv.jsx`);
  const text = await res.text();
  server.close();
  assert.equal(res.status, 200);
  assert.match(text, /\/\/ DATA-BEGIN/);
});
