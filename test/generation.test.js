import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateBatch, GenerationError } from '../src/generation.js';
import { LIMITS } from '../src/config.js';

const ten = (p) => Array.from({ length: 10 }, (_, i) => `${p} ${i}`);

function stubClient(inputs) {
  const calls = [];
  return {
    calls,
    models: {
      generateContent: async (params) => {
        calls.push(params);
        const next = inputs[Math.min(calls.length - 1, inputs.length - 1)];
        if (next instanceof Error) throw next;
        return { functionCalls: [{ name: 'submit_ideas', args: next }] };
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
  const { config } = client.calls[0];
  assert.deepEqual(config.toolConfig.functionCallingConfig, {
    mode: 'ANY',
    allowedFunctionNames: ['submit_ideas'],
  });
  const declaration = config.tools[0].functionDeclarations[0];
  assert.equal(declaration.name, 'submit_ideas');
  assert.equal(declaration.parametersJsonSchema.properties.hooks.type, 'array');
  assert.equal(declaration.parametersJsonSchema.properties.on_screen_texts.items.type, 'string');
  assert.deepEqual(declaration.parametersJsonSchema.required, ['hooks', 'on_screen_texts']);
});

test('prompt contains the script and the length limits', async () => {
  const client = stubClient([good]);
  await generateBatch({ client, model: 'm', script: 'SCRIPT-BODY' });
  const text = JSON.stringify(client.calls[0].config.systemInstruction) + JSON.stringify(client.calls[0].contents);
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
