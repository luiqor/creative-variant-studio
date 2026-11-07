import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateMore } from '../src/more-like-this.js';

const ten = (p) => Array.from({ length: 10 }, (_, i) => `${p} ${i}`);
function recorder(input) {
  const calls = [];
  return {
    calls,
    models: {
      generateContent: async (params) => {
        calls.push(params);
        return { functionCalls: [{ name: 'submit_ideas', args: input }] };
      },
    },
  };
}

test('generateMore returns 10 hooks only, with a single-field schema, for a hook card', async () => {
  const client = recorder({ hook: ten('h') });
  const out = await generateMore({ client, model: 'm', type: 'hook', existingTexts: [] });
  assert.deepEqual(out, { hook: ten('h') });
  const schema = client.calls[0].config.tools[0].functionDeclarations[0].parametersJsonSchema;
  assert.deepEqual(Object.keys(schema.properties), ['hook']);
});

test('generateMore sends the liked tags and comment as guidance', async () => {
  const client = recorder({ hook: ten('h') });
  await generateMore({
    client,
    model: 'm',
    type: 'hook',
    existingTexts: [],
    likedTags: ['humor', 'short'],
    comment: 'more playful please',
  });
  const prompt = client.calls[0].contents;
  assert.match(prompt, /Humor, Short/);
  assert.doesNotMatch(prompt, /humor|short\b/);
  assert.match(prompt, /more playful please/);
});

test('generateMore sends reject tags of rejected cards as negative hints', async () => {
  const client = recorder({ hook: ten('h') });
  await generateMore({
    client,
    model: 'm',
    type: 'hook',
    existingTexts: ['a'],
    rejectedFeedback: [{ text: 'a very long rambling hook', rejectTag: 'too_long' }],
  });
  const prompt = client.calls[0].contents;
  assert.match(prompt, /avoid/i);
  assert.match(prompt, /a very long rambling hook.*Too long/);
  assert.doesNotMatch(prompt, /too_long/);
});

test('generateMore sends all existing texts as do-not-repeat', async () => {
  const client = recorder({ on_screen_text: ten('t') });
  await generateMore({
    client,
    model: 'm',
    type: 'on_screen_text',
    existingTexts: ['Never lose a sock', 'Pairs stay pairs'],
  });
  const prompt = client.calls[0].contents;
  assert.match(prompt, /do not repeat/i);
  assert.match(prompt, /Never lose a sock/);
  assert.match(prompt, /Pairs stay pairs/);
});
