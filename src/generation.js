import { LIMITS } from './config.js';

export const TOOL_NAME = 'submit_ideas';
export const BATCH_SIZE = 10;
export const MAX_ATTEMPTS = 2; // first try + one retry

export class GenerationError extends Error {}

export const FIELD_LABELS = {
  hooks: (limits) => `hooks (opening lines, at most ${limits.hookMaxWords} words each)`,
  on_screen_texts: (limits) =>
    `on-screen texts (overlay lines, at most ${limits.onScreenTextMaxWords} words each)`,
};

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
 * Shared function-calling + retry core. Reused by "More like this":
 * pass fewer `fields` (e.g. { hooks: 10 }) and put extra guidance /
 * do-not-repeat / negative hints into `userPrompt`.
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
          maxOutputTokens: 2048,
          tools: [tool],
          toolConfig: {
            functionCallingConfig: { mode: 'ANY', allowedFunctionNames: [TOOL_NAME] },
          },
        },
      })
      .catch(() => null);
    const call = response?.functionCalls?.find((c) => c.name === TOOL_NAME);
    const valid = validate(call?.args, fields);
    if (valid) return valid;
  }
  throw new GenerationError('The model returned an invalid response twice. Please try again.');
}

export function buildSystemPrompt(limits = LIMITS) {
  return [
    'You are a creative assistant for motion designers making modifications of a winning video ad.',
    'A modification changes only the opening hook and the on-screen text; the rest of the video stays the same.',
    'Do not change the CTA, the problem, or the demo. Write all ideas in English (US market).',
    'Length limits:',
    `- each hook: at most ${limits.hookMaxWords} words`,
    `- each on-screen text: at most ${limits.onScreenTextMaxWords} words`,
    `Always answer by calling the ${TOOL_NAME} function.`,
  ].join('\n');
}

export async function generateBatch({ client, model, script, limits = LIMITS }) {
  const fields = { hooks: BATCH_SIZE, on_screen_texts: BATCH_SIZE };
  const userPrompt = [
    `Winning script:\n"""\n${script}\n"""`,
    `Produce ${BATCH_SIZE} new ${FIELD_LABELS.hooks(limits)} and ${BATCH_SIZE} new ${FIELD_LABELS.on_screen_texts(limits)}.`,
  ].join('\n\n');
  return requestIdeas({ client, model, system: buildSystemPrompt(limits), userPrompt, fields });
}
