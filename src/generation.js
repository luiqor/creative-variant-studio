import { LIMITS, WORD_MINIMUMS, wordLimit } from './config.js';
import { DEFAULT_COUNT, MAX_COUNT, MAX_TYPES, TYPE_NAME } from '../public/js/idea-types.js';

export const TOOL_NAME = 'submit_ideas';
export const MAX_ATTEMPTS = 2; // first try + one retry

export const MAX_NOTE_LENGTH = 500;

export class GenerationError extends Error {}

export class TokenRejectedError extends GenerationError {}

const TOKEN_REJECTED = Symbol('token rejected');
const AUTH_FAILURE = /API key not valid|API_KEY_INVALID|UNAUTHENTICATED|PERMISSION_DENIED/i;

export const isAuthError = (err) => [401, 403].includes(err?.status) || AUTH_FAILURE.test(err?.message ?? '');

export function parseGenerateRequest(body) {
  const script = typeof body?.script === 'string' ? body.script.trim() : '';
  if (!script) return { error: 'Paste a winning script first.' };
  const types = body?.types;
  const validTypes =
    Array.isArray(types) &&
    types.length > 0 &&
    types.length <= MAX_TYPES &&
    types.every((type) => typeof type === 'string' && TYPE_NAME.test(type)) &&
    new Set(types).size === types.length;
  if (!validTypes) return { error: `Choose between 1 and ${MAX_TYPES} different idea types.` };
  const count = body.count ?? DEFAULT_COUNT;
  if (!Number.isInteger(count) || count < 1 || count > MAX_COUNT) {
    return { error: `The number of ideas must be a whole number from 1 to ${MAX_COUNT}.` };
  }
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, MAX_NOTE_LENGTH) : '';
  return { value: { script, types, count, note } };
}

const DESCRIPTIONS = {
  hook: 'hooks (opening lines)',
  on_screen_text: 'on-screen texts (overlay lines)',
};

export function ideaLabel(type, limits = LIMITS) {
  const name = DESCRIPTIONS[type] ?? `${type.replace(/_/g, ' ')} ideas`;
  const min = WORD_MINIMUMS[type];
  const atLeast = min ? `at least ${min} and ` : '';
  return `${name}, ${atLeast}at most ${wordLimit(type, limits)} words each`;
}

function buildTool(fields) {
  return {
    functionDeclarations: [
      {
        name: TOOL_NAME,
        description: 'Submit the generated ideas.',
        parametersJsonSchema: {
          type: 'object',
          properties: Object.fromEntries(
            Object.keys(fields).map((name) => [name, { type: 'array', items: { type: 'string' } }]),
          ),
          required: Object.keys(fields),
        },
      },
    ],
  };
}

function validate(input, fields) {
  if (!input || typeof input !== 'object') return null;
  const out = {};
  for (const [name, count] of Object.entries(fields)) {
    const list = input[name];
    if (
      !Array.isArray(list) ||
      list.length !== count ||
      !list.every((s) => typeof s === 'string' && s.trim())
    ) {
      return null;
    }
    out[name] = list.map((s) => s.trim());
  }
  return out;
}

/**
 * Shared function-calling + retry core, reused by "More like this".
 * `fields` maps an idea type to the number of ideas wanted.
 * The server only ever reads the function call args, never prose.
 * Array sizes are not in the schema (Gemini docs advise stating bounds in the prompt
 * and checking them in code); `validate` enforces the counts.
 */
export async function requestIdeas({ client, model, system, userPrompt, fields }) {
  const tool = buildTool(fields);
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const response = await client.models
      .generateContent({
        model,
        contents: userPrompt,
        config: {
          systemInstruction: system,
          maxOutputTokens: 8192,
          tools: [tool],
          toolConfig: {
            functionCallingConfig: { mode: 'ANY', allowedFunctionNames: [TOOL_NAME] },
          },
        },
      })
      .catch((err) => (isAuthError(err) ? TOKEN_REJECTED : null));
    if (response === TOKEN_REJECTED) {
      throw new TokenRejectedError('Gemini rejected the token. Check it and enter it again.');
    }
    const call = response?.functionCalls?.find((c) => c.name === TOOL_NAME);
    const valid = validate(call?.args, fields);
    if (valid) return valid;
  }
  throw new GenerationError('The model returned an invalid response twice. Please try again.');
}

export function buildSystemPrompt(types, limits = LIMITS) {
  return [
    'You are a creative assistant for motion designers making modifications of a winning video ad.',
    'A modification changes some parts of the ad and keeps the rest.',
    'Write ideas only for the requested idea types and do not rewrite other parts of the script. Write all ideas in English (US market).',
    'Length limits:',
    ...types.map((type) => `- each ${ideaLabel(type, limits)}`),
    `Always answer by calling the ${TOOL_NAME} function.`,
  ].join('\n');
}

export async function generateBatch({
  client,
  model,
  script,
  types,
  count = DEFAULT_COUNT,
  note = '',
  limits = LIMITS,
}) {
  const fields = Object.fromEntries(types.map((type) => [type, count]));
  const sections = [
    `Winning script:\n"""\n${script}\n"""`,
    `Produce:\n${types.map((type) => `- ${count} new ${ideaLabel(type, limits)}`).join('\n')}`,
  ];
  if (note.trim()) sections.push(`Designer's note: ${note.trim()}`);
  return requestIdeas({
    client,
    model,
    system: buildSystemPrompt(types, limits),
    userPrompt: sections.join('\n\n'),
    fields,
  });
}
