import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateBatch, GenerationError, TokenRejectedError } from '../src/generation.js';

const list = (prefix, n = 10) => Array.from({ length: n }, (_, i) => `${prefix} ${i}`);

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

const promptOf = (call) => JSON.stringify(call.config.systemInstruction) + JSON.stringify(call.contents);

test('returns one list of ideas per requested idea type', async () => {
  const good = { hook: list('hook'), on_screen_text: list('text') };
  const client = stubClient([good]);
  const batch = await generateBatch({
    client,
    model: 'm',
    script: 'Hook: hi',
    types: ['hook', 'on_screen_text'],
    count: 10,
  });
  assert.deepEqual(batch, good);
  assert.equal(client.calls[0].model, 'm');
  assert.deepEqual(client.calls[0].config.toolConfig.functionCallingConfig, {
    mode: 'ANY',
    allowedFunctionNames: ['submit_ideas'],
  });
});

test('the model schema has one array per chosen type, including custom types', async () => {
  const client = stubClient([{ cta: list('cta', 4) }]);
  await generateBatch({ client, model: 'm', script: 's', types: ['cta'], count: 4 });
  const schema = client.calls[0].config.tools[0].functionDeclarations[0].parametersJsonSchema;
  assert.deepEqual(Object.keys(schema.properties), ['cta']);
  assert.equal(schema.properties.cta.type, 'array');
  assert.equal(schema.properties.cta.items.type, 'string');
  assert.deepEqual(schema.required, ['cta']);
});

test('only the chosen types and count are requested', async () => {
  const client = stubClient([{ hook: list('h', 3) }]);
  const batch = await generateBatch({ client, model: 'm', script: 's', types: ['hook'], count: 3 });
  assert.deepEqual(Object.keys(batch), ['hook']);
  assert.equal(batch.hook.length, 3);
});

test('a response with the wrong number of ideas is retried once', async () => {
  const good = { hook: list('h', 5) };
  const client = stubClient([{ hook: ['only one'] }, good]);
  const batch = await generateBatch({ client, model: 'm', script: 's', types: ['hook'], count: 5 });
  assert.deepEqual(batch, good);
  assert.equal(client.calls.length, 2);
});

test('hook and on-screen text keep their word limits, a custom type gets 15', async () => {
  const client = stubClient([{ hook: list('h', 1), on_screen_text: list('t', 1), cta: list('c', 1) }]);
  await generateBatch({ client, model: 'm', script: 's', types: ['hook', 'on_screen_text', 'cta'], count: 1 });
  const prompt = promptOf(client.calls[0]);
  assert.match(prompt, /hook[^"\\]*at most 8 words/i);
  assert.match(prompt, /on-screen text[^"\\]*at most 15 words/i);
  assert.match(prompt, /cta[^"\\]*at most 15 words/i);
});

test('the prompt contains the script and the designer note', async () => {
  const client = stubClient([{ hook: list('h', 1) }]);
  await generateBatch({
    client,
    model: 'm',
    script: 'SCRIPT-BODY',
    types: ['hook'],
    count: 1,
    note: 'make it playful',
  });
  const prompt = promptOf(client.calls[0]);
  assert.match(prompt, /SCRIPT-BODY/);
  assert.match(prompt, /make it playful/);
});

test('the prompt does not mention a note when none is given', async () => {
  const client = stubClient([{ hook: list('h', 1) }]);
  await generateBatch({ client, model: 'm', script: 's', types: ['hook'], count: 1 });
  assert.doesNotMatch(promptOf(client.calls[0]), /note/i);
});

test('a second invalid response throws GenerationError', async () => {
  const client = stubClient([{ nope: 1 }]);
  await assert.rejects(
    generateBatch({ client, model: 'm', script: 's', types: ['hook'], count: 2 }),
    GenerationError,
  );
  assert.equal(client.calls.length, 2);
});

test('an SDK error is retried once, then reported as GenerationError', async () => {
  const client = stubClient([new Error('boom')]);
  await assert.rejects(
    generateBatch({ client, model: 'm', script: 's', types: ['hook'], count: 2 }),
    GenerationError,
  );
  assert.equal(client.calls.length, 2);
});

test('a token rejected by Gemini is reported as such, without retrying', async () => {
  const unauthorized = Object.assign(new Error('Unauthorized'), { status: 401 });
  const client = stubClient([unauthorized]);
  await assert.rejects(
    generateBatch({ client, model: 'm', script: 's', types: ['hook'], count: 2 }),
    TokenRejectedError,
  );
  assert.equal(client.calls.length, 1);
});

test('an invalid API key message from Gemini is recognised as a rejected token', async () => {
  const invalid = Object.assign(new Error('API key not valid. Please pass a valid API key.'), { status: 400 });
  await assert.rejects(
    generateBatch({ client: stubClient([invalid]), model: 'm', script: 's', types: ['hook'], count: 2 }),
    TokenRejectedError,
  );
});

test('other model errors are still retried once and reported as a generation error', async () => {
  const busy = Object.assign(new Error('Service unavailable'), { status: 503 });
  const client = stubClient([busy]);
  const error = await generateBatch({ client, model: 'm', script: 's', types: ['hook'], count: 2 }).catch((e) => e);
  assert.ok(error instanceof GenerationError);
  assert.ok(!(error instanceof TokenRejectedError));
  assert.equal(client.calls.length, 2);
});
