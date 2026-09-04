const fs = require('fs');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const SYSTEM_PROMPT = `你是 PTE 英语备考助手，同时也是一位专业的 PTE 教师。把用户提供的内容（文字/图片/文件）提取成结构化复习知识点。
对每个知识点，判断它属于以下哪一类：
grammar(语法) / word_sense(词义辨析) / collocation(固定搭配) / polysemy(多义词) / pronunciation(发音)。
如果用户在输入中指定了分类，优先按用户指定的分类处理。

对每个知识点，还需要以专业 PTE 教师的身份写一条简明的"学习笔记"（study_note）：
针对该知识点所属分类，讲清楚"为什么这样用/为什么选这个而不是那个"这类关键点，而不是重复例句或释义。
- collocation(固定搭配)：如果用户输入中出现了容易混淆的近似形式（如 rise/rising），要明确指出正确形式是什么、错误形式错在哪（词性/句法位置等），例如"用 rise 不用 rising，因为 sea-level rise 中 rise 是名词，与 sea-level 构成复合名词固定搭配；rising 是分词/动名词形式，不能直接这样使用"。
- grammar(语法)：说明适用的语法规则及常见误用。
- word_sense(词义辨析)：对比近义词之间的细微差别及各自适用场景。
- polysemy(多义词)：列出该词在不同语境下的主要含义。
- pronunciation(发音)：说明发音要点或易错音。
学习笔记控制在 2-3 句话以内，直接给结论和理由，不要输出"这个知识点是..."之类的套话。

只输出 JSON 数组，每项：
{ "category": "<上述英文key>", "term_en": "英文词/短语/句型", "meaning_zh": "中文解释",
  "usage_example": "一个地道的英文例句", "study_note": "上述教学讲解" }
不要输出任何解释性文字，只输出 JSON。`;

function getProvider() {
  const providerName = (process.env.AI_PROVIDER || 'claude').toLowerCase();
  if (providerName === 'openai') return require('./providers/openai');
  return require('./providers/claude');
}

function parseResult(raw) {
  // Strip markdown code fences if present
  let text = raw.trim();
  text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    const looksTruncated = !text.endsWith(']') && !text.endsWith('}');
    throw new Error(
      looksTruncated
        ? 'AI 返回内容过长被截断，请减少单次录入的内容量（比如拆成几段分批整理）后重试'
        : 'AI 返回的内容无法解析，请重试'
    );
  }
  if (!Array.isArray(parsed)) throw new Error('Expected JSON array');
  const valid = ['grammar', 'word_sense', 'collocation', 'polysemy', 'pronunciation'];
  return parsed.filter(p =>
    p && typeof p === 'object' && valid.includes(p.category) && p.term_en
  );
}

async function extractKnowledge({ text, images = [], fileText, category }) {
  const provider = getProvider();

  // Build user content
  const userContent = [];

  let textPart = '';
  if (text) textPart += text + '\n';
  if (fileText) textPart += fileText + '\n';
  if (category) textPart += `\n用户指定分类：${category}`;
  if (textPart) userContent.push({ type: 'text', text: textPart.trim() });

  for (const img of images) {
    const data = fs.readFileSync(img.path).toString('base64');
    const mediaType = img.mimetype || 'image/jpeg';
    userContent.push({
      type: 'image',
      source: { type: 'base64', media_type: mediaType, data },
    });
  }

  if (userContent.length === 0) throw new Error('No content provided');

  // For OpenAI, convert image blocks to OpenAI vision format
  const providerName = (process.env.AI_PROVIDER || 'claude').toLowerCase();
  let content = userContent;
  if (providerName === 'openai') {
    content = userContent.map(block => {
      if (block.type === 'image') {
        return {
          type: 'image_url',
          image_url: { url: `data:${block.source.media_type};base64,${block.source.data}` },
        };
      }
      return block;
    });
  }

  const raw = await provider.callModel(SYSTEM_PROMPT, content);
  return parseResult(raw);
}

module.exports = { extractKnowledge };
