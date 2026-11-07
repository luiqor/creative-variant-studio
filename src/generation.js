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
    name: TOOL_NAME,
    description: 'Submit the generated ideas.',
    input_schema: {
      type: 'object',
      properties: Object.fromEntries(
        Object.entries(fields).map(([name, count]) => [
          name,
          { type: 'array', items: { type: 'string' }, minItems: count, maxItems: count },
        ]),
      ),
      required: Object.keys(fields),
    },
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
 * Shared tool-use + retry core. Reused by "More like this":
 * pass fewer `fields` (e.g. { hooks: 10 }) and put extra guidance /
 * do-not-repeat / negative hints into `userPrompt`.
 * The server only ever reads the tool_use block, never prose.
 */
export async function requestIdeas({ client, model, system, userPrompt, fields }) {
  const tool = buildTool(fields);
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let response;
    try {
      response = await client.messages.create({
        model,
        max_tokens: 2048,
        system,
        messages: [{ role: 'user', content: userPrompt }],
        tools: [tool],
        tool_choice: { type: 'tool', name: TOOL_NAME },
      });
    } catch {
      continue;
    }
    const block = response?.content?.find((b) => b.type === 'tool_use' && b.name === TOOL_NAME);
    const valid = validate(block?.input, fields);
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
    `Always answer by calling the ${TOOL_NAME} tool.`,
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
