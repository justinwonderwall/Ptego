const fs = require('fs');

const SYSTEM_PROMPT = `你是练习成绩识别助手。用户会上传一张练习成绩截图，可能有两种形式：
1. 分题明细表格：每行一道练习/文章，评分格式类似 "3/4"（3 分之 4，即该题正确 3 个 / 共 4 个空或小题）。
2. 汇总卡片：直接标注了"正确率""练习题数""正确数"这类整体数据。
3. 单题评分详情：只针对一道题的评分页面，通常在顶部或角落标有该题的编号，例如 "#1211"、"题号 1211"、"No.1211"。

请识别并计算：
- count：完成的练习/文章条数。分题明细表格数一下有几行（几条记录）；如果图片本身直接标了"练习题数"之类的总数字段，就用那个数字；单题评分详情算 1。
- score_pct：整体正确率（0-100 的数字，保留一位小数）。分题明细的话，把每行 "X/Y" 里的 X 全部加起来除以所有 Y 全部加起来，乘以 100；汇总卡片或单题评分的话直接用图片给出的正确率/得分数字。如果图片信息不够、无法判断，就设为 null，不要瞎猜。
- question_no：截图里出现的题号/题目编号（去掉 # 号等符号，只保留数字或原始编号字符串），例如截图显示 "#1211" 就填 "1211"。只有单题评分详情类截图才会有题号；分题明细表格或汇总卡片通常没有，此时设为 null。不确定就设为 null，不要瞎猜。
- note：一句话概括你识别到的内容，例如"识别到 5 条练习记录，共 22 小题，正确 15 个"。

只输出 JSON，不要输出任何解释性文字：
{ "count": <整数或 null>, "score_pct": <数字或 null>, "question_no": <字符串或 null>, "note": "一句话概括" }`;

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
    const e = new Error('SCREENSHOT_PARSE_FAILED');
    e.code = 'SCREENSHOT_PARSE_FAILED';
    throw e;
  }
  if (!parsed || typeof parsed !== 'object') {
    const e = new Error('AI_RESPONSE_MALFORMED');
    e.code = 'AI_RESPONSE_MALFORMED';
    throw e;
  }
  return {
    count: Number.isFinite(parsed.count) ? Math.round(parsed.count) : null,
    score_pct: Number.isFinite(parsed.score_pct) ? Math.round(parsed.score_pct * 10) / 10 : null,
    question_no: typeof parsed.question_no === 'string' && parsed.question_no.trim() ? parsed.question_no.trim() : null,
    note: typeof parsed.note === 'string' ? parsed.note : null,
  };
}

async function parseScreenshot({ imagePath, mimetype }) {
  const provider = getProvider();
  const providerName = (process.env.AI_PROVIDER || 'claude').toLowerCase();
  const data = fs.readFileSync(imagePath).toString('base64');
  const mediaType = mimetype || 'image/png';

  let content;
  if (providerName === 'openai') {
    content = [{ type: 'image_url', image_url: { url: `data:${mediaType};base64,${data}` } }];
  } else {
    content = [{ type: 'image', source: { type: 'base64', media_type: mediaType, data } }];
  }

  const raw = await provider.callModel(SYSTEM_PROMPT, [{ role: 'user', content }]);
  return parseResult(raw);
}

module.exports = { parseScreenshot };
