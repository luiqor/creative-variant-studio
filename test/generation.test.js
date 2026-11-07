import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateBatch, GenerationError } from '../src/generation.js';
import { LIMITS } from '../src/config.js';

const ten = (p) => Array.from({ length: 10 }, (_, i) => `${p} ${i}`);

function stubClient(inputs) {
  const calls = [];
  return {
    calls,
    messages: {
      create: async (params) => {
        calls.push(params);
        const next = inputs[Math.min(calls.length - 1, inputs.length - 1)];
        if (next instanceof Error) throw next;
        return { content: [{ type: 'tool_use', name: 'submit_ideas', input: next }] };
      },
    },
  };
}

const good = { hooks: ten('hook'), on_screen_texts: ten('text') };

test('valid tool response yields 10 hooks and 10 on-screen texts', async () => {
  const client = stubClient([good]);
  const batch = await generateBatch({ client, model: 'm', script: 'Hook: hi' });
  assert.deepEqual(batch, good);
  assert.equal(client.calls.length, 1);
  assert.equal(client.calls[0].model, 'm');
  assert.equal(client.calls[0].tool_choice.name, 'submit_ideas');
  const schema = client.calls[0].tools[0].input_schema;
  assert.equal(schema.properties.hooks.type, 'array');
  assert.equal(schema.properties.on_screen_texts.items.type, 'string');
});

test('prompt contains the script and the length limits', async () => {
  const client = stubClient([good]);
  await generateBatch({ client, model: 'm', script: 'SCRIPT-BODY' });
  const text = JSON.stringify(client.calls[0].system) + JSON.stringify(client.calls[0].messages);
  assert.match(text, /SCRIPT-BODY/);
  assert.match(text, new RegExp(`${LIMITS.hookMaxWords} words`));
  assert.match(text, new RegExp(`${LIMITS.onScreenTextMaxWords} words`));
  assert.match(text, /CTA/);
});

test('invalid response is retried once and then succeeds', async () => {
  const client = stubClient([{ hooks: ['only one'], on_screen_texts: [] }, good]);
  const batch = await generateBatch({ client, model: 'm', script: 's' });
  assert.deepEqual(batch, good);
  assert.equal(client.calls.length, 2);
});

test('second invalid response throws GenerationError', async () => {
  const client = stubClient([{ nope: 1 }]);
  await assert.rejects(generateBatch({ client, model: 'm', script: 's' }), GenerationError);
  assert.equal(client.calls.length, 2);
});

test('SDK error is retried once, then reported as GenerationError', async () => {
  const client = stubClient([new Error('boom')]);
  await assert.rejects(generateBatch({ client, model: 'm', script: 's' }), GenerationError);
  assert.equal(client.calls.length, 2);
});
