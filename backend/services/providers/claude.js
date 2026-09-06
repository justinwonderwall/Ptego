const DEFAULT_MODEL = 'claude-opus-4-8';

// `messages` is a full conversation array of { role: 'user'|'assistant', content }
// (content is either a plain string or a content-block array for images) —
// callers that only need a single turn just pass [{ role: 'user', content }].
// `options.model` lets a caller opt into a different model, mirroring the
// OpenAI provider's interface.
async function callModel(systemPrompt, messages, options = {}) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: options.model || DEFAULT_MODEL,
    max_tokens: 8192,
    system: systemPrompt,
    messages,
  });
  return response.content[0].text;
}

module.exports = { callModel };
