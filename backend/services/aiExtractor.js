const fs = require('fs');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const SYSTEM_PROMPT = `你是 PTE 英语备考助手，同时也是一位专业的 PTE 教师。把用户提供的内容（文字/图片/文件）提取成结构化复习知识点。
对每个知识点，判断它属于以下哪一类：
grammar(语法) / word_sense(词义辨析) / collocation(固定搭配) / polysemy(多义词)。
如果用户指定了一个或多个候选分类，说明用户认为这份内容里可能包含这些类型的知识点——请把内容通读一遍，**把每种指定类型能找到的知识点都分别提取出来**，不要只挑一种类型就停手（一份文档/截图里经常同时混着语法点、固定搭配、词义辨析等好几种类型）。不属于任何指定分类、明显不相关的内容不要强行归类进去。如果用户没有指定分类，你自行判断每条内容属于哪一类。

对每个知识点，还需要以专业 PTE 教师的身份写一条简明的"学习笔记"（study_note）：
针对该知识点所属分类，讲清楚"为什么这样用/为什么选这个而不是那个"这类关键点，而不是重复例句或释义。
- collocation(固定搭配)：如果用户输入中出现了容易混淆的近似形式（如 rise/rising），要明确指出正确形式是什么、错误形式错在哪（词性/句法位置等），例如"用 rise 不用 rising，因为 sea-level rise 中 rise 是名词，与 sea-level 构成复合名词固定搭配；rising 是分词/动名词形式，不能直接这样使用"。
- grammar(语法)：说明适用的语法规则及常见误用。
- word_sense(词义辨析)：如果用户输入的是对比两个或多个近义词/易混词（例如"A 和 B""A vs B"，或文本/文件中出现多个可互相替代但用法不同的词），把它们合并为**同一条**知识点，不要拆成多条：
  - term_en 写成 "A vs B"（多个词用 "A vs B vs C"）
  - meaning_zh 分别给出各词的中文释义，格式如"A：含义1；B：含义2"
  - usage_example 分别给出每个词各自的例句，体现两者能不能互换、在什么场景下各自成立，格式如"A: ...例句...  B: ...例句..."
  - study_note 明确指出两者最核心的用法区别（词性/语境/正式程度/搭配对象等），直接给出"什么情况下用 A、什么情况下用 B"的判断标准，而不是笼统地说"意思相近"
  如果输入只是单个词本身的词义辨析（没有明确对比对象），才按常规方式说明其近义词区别。
- polysemy(多义词)：用户通常只输入一个常见单词本身（不会附带释义），需要你主动识别并整理出该词在不同语境/词性下的主要含义（一般 2-4 个，太生僻的义项不用列）：
  - meaning_zh 按词性/语境分条列出，格式如"v. 含义1；n. 含义2；adj. 含义3"
  - usage_example 针对不同含义各给一个例句，格式如"义1: ...例句...  义2: ...例句..."，让每个含义都有场景支撑
  - study_note 简要说明各含义之间怎么根据上下文/词性区分，帮助记住"看到这个词该往哪个意思想"
  如果用户输入中已经明确给出了某个具体语境/义项，就只整理该语境下的用法，不用强行罗列全部含义。
学习笔记控制在 2-3 句话以内，直接给结论和理由，不要输出"这个知识点是..."之类的套话。

另外，检查一下用户原始输入本身（用户实际打的字/文档原文，不是你生成的例句）的拼写和语法是否有错。如果某个知识点对应的原文里有明显的拼写错误或语法错误，用 "input_check" 字段一句话指出："写错的地方 + 正确写法 + 简短原因"，例如"你写的 'recieve' 拼写有误，应为 'receive'——i 在 e 前，除非 c 后"。没有发现错误就把 "input_check" 设为 null，不要为了凑字数硬找问题。

只输出 JSON 数组，每项：
{ "category": "<上述英文key>", "term_en": "英文词/短语/句型", "meaning_zh": "中文解释",
  "usage_example": "一个地道的英文例句", "study_note": "上述教学讲解",
  "input_check": "用户原始输入若有拼写/语法错误则简要指出+纠正+原因，没有错误则为 null" }
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
  const valid = ['grammar', 'word_sense', 'collocation', 'polysemy'];
  return parsed.filter(p =>
    p && typeof p === 'object' && valid.includes(p.category) && p.term_en
  );
}

async function extractKnowledge({ text, images = [], fileText, categories = [] }) {
  const provider = getProvider();

  // Build user content
  const userContent = [];

  let textPart = '';
  if (text) textPart += text + '\n';
  if (fileText) textPart += fileText + '\n';
  if (categories.length) textPart += `\n用户指定的候选分类（可能不止一种，请逐一查找）：${categories.join('、')}`;
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
