const DEFAULT_MODEL = 'gpt-4o';

// `messages` is a full conversation array of { role: 'user'|'assistant', content }
// (content is either a plain string or a content-block array for images) —
// callers that only need a single turn just pass [{ role: 'user', content }].
// `options.model` lets a caller opt into a different model (e.g. the chat
// tutor uses gpt-5.4 for noticeably better explanations; extraction/
// screenshot-parsing stay on the cheaper, already-proven gpt-4o).
//
// max_completion_tokens (not the older max_tokens) — required by newer
// model families like gpt-5.x, and gpt-4o accepts it too, so one param
// name works across every model this app calls.
async function callModel(systemPrompt, messages, options = {}) {
  const OpenAI = require('openai');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.chat.completions.create({
    model: options.model || DEFAULT_MODEL,
    max_completion_tokens: 8192,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
  });
  return response.choices[0].message.content;
}

module.exports = { callModel };
