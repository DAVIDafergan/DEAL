import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-6';

let client = null;

/** Lazily-instantiated singleton Anthropic client, built from ANTHROPIC_API_KEY. */
export function getClaudeClient(apiKey = process.env.ANTHROPIC_API_KEY) {
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }
  if (!client) {
    client = new Anthropic({ apiKey });
  }
  return client;
}

/**
 * שולח prompt בודד ל-Claude ומחזיר את הטקסט הגולמי שהתקבל.
 * Sends a single prompt to Claude and returns the raw text response.
 */
export async function askClaude(prompt, { apiKey, maxTokens = 1500 } = {}) {
  const anthropic = getClaudeClient(apiKey);

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
}

export { MODEL as CLAUDE_MODEL };
