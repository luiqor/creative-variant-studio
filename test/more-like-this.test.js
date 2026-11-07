import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateMore } from '../src/more-like-this.js';

const list = (prefix, n = 10) => Array.from({ length: n }, (_, i) => `${prefix} ${i}`);

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

const base = { model: 'm', type: 'hook', source: 'Lost a sock again?', existingTexts: ['Lost a sock again?'] };

test('returns the chosen count of ideas of the same type only, with a single-field schema', async () => {
  const client = recorder({ hook: list('h', 4) });
  const out = await generateMore({ ...base, client, count: 4 });
  assert.deepEqual(out, { hook: list('h', 4) });
  const schema = client.calls[0].config.tools[0].functionDeclarations[0].parametersJsonSchema;
  assert.deepEqual(Object.keys(schema.properties), ['hook']);
});

test('uses a count of 10 when none is given', async () => {
  const client = recorder({ hook: list('h') });
  const out = await generateMore({ ...base, client });
  assert.equal(out.hook.length, 10);
});

test('sends the source idea, the liked tags and the instruction as guidance', async () => {
  const client = recorder({ hook: list('h') });
  await generateMore({ ...base, client, likedTags: ['humor', 'short'], instruction: 'same idea but cheekier' });
  const prompt = client.calls[0].contents;
  assert.match(prompt, /Lost a sock again\?/);
  assert.match(prompt, /Humor, Short/);
  assert.match(prompt, /same idea but cheekier/);
  assert.doesNotMatch(prompt, /\bhumor\b(?!,)/);
});

test('sends all existing texts as do-not-repeat', async () => {
  const client = recorder({ on_screen_text: list('t') });
  await generateMore({
    ...base,
    client,
    type: 'on_screen_text',
    source: 'Never lose a sock',
    existingTexts: ['Never lose a sock', 'Pairs stay pairs', 'Kept hook elsewhere'],
  });
  const prompt = client.calls[0].contents;
  assert.match(prompt, /do not repeat/i);
  for (const text of ['Never lose a sock', 'Pairs stay pairs', 'Kept hook elsewhere']) {
    assert.match(prompt, new RegExp(text));
  }
});

test('mentions neither liked qualities nor an instruction when none are given', async () => {
  const client = recorder({ hook: list('h') });
  await generateMore({ ...base, client });
  assert.doesNotMatch(client.calls[0].contents, /liked|instruction/i);
});

test('a custom type gets the 15-word limit in the prompt', async () => {
  const client = recorder({ cta: list('c') });
  await generateMore({ ...base, client, type: 'cta', source: 'Take the quiz' });
  assert.match(JSON.stringify(client.calls[0].config.systemInstruction) + client.calls[0].contents, /cta[^"\\]*at most 15 words/i);
});
