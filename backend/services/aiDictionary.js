require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const SYSTEM_PROMPT = `你是英语词典助手。给定一个英文单词或短语，输出它的中文释义和一个例句。
按词性列出主要含义（最多 3 个词性），每个词性给一句简明的中文释义。
再给一个地道的英文例句，以及该例句对应的中文翻译。
只输出 JSON，不要输出任何解释性文字：
{ "definitions": [ { "partOfSpeech": "noun", "meaning_zh": "..." } ],
  "example_en": "...", "example_zh": "..." }`;

function getProvider() {
  const providerName = (process.env.AI_PROVIDER || 'claude').toLowerCase();
  if (providerName === 'openai') return require('./providers/openai');
  return require('./providers/claude');
}

function parseResult(raw) {
  let text = raw.trim();
  text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error('AI dictionary response was not valid JSON: ' + err.message);
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('Invalid AI response');
  return {
    definitions: Array.isArray(parsed.definitions)
      ? parsed.definitions.filter(d => d && d.meaning_zh).map(d => ({ partOfSpeech: d.partOfSpeech || null, meaning_zh: d.meaning_zh }))
      : [],
    example_en: parsed.example_en || null,
    example_zh: parsed.example_zh || null,
  };
}

async function defineWord(word) {
  const provider = getProvider();
  const raw = await provider.callModel(SYSTEM_PROMPT, [{ role: 'user', content: word }]);
  return parseResult(raw);
}

module.exports = { defineWord };
