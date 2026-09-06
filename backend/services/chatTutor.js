const fs = require('fs');

const SYSTEM_PROMPT = `你是一位专业、耐心的 PTE 英语老师，在跟学生一对一答疑。
学生会问你语法、词汇辨析、固定搭配、多义词等相关问题，可能是纯文字，也可能带一张截图（比如一道题、一段课文、一句话）。

回答要求：
- 直接给结论和理由，不要说"这是个好问题"之类的客套话
- 用具体例句说明，而不是抽象描述
- 中英混排：术语/例句用英文，讲解用中文
- 控制在合理长度（一般 150 字以内），信息密度要高；确实需要分点说明时才用列表，不要为了显得详细而啰嗦
- 排版只用加粗（**这样**）和换行，不要用 Markdown 标题（## 之类）或分隔线（---），这里是聊天气泡，不是文档
- 如果学生的问题模糊到没法回答，可以简要反问澄清，但优先尝试直接给出有用的讲解

这是一个连续对话，注意结合上文语境回答后续追问。`;

function getProvider() {
  const providerName = (process.env.AI_PROVIDER || 'claude').toLowerCase();
  if (providerName === 'openai') return require('./providers/openai');
  return require('./providers/claude');
}

// Chat gets a stronger model than extraction/screenshot-parsing — noticeably
// better grammar explanations, worth the small extra cost for a live Q&A
// feature (verified: ~$0.0016/exchange at typical message length).
const CHAT_MODEL = {
  openai: 'gpt-5.4',
  claude: 'claude-opus-4-8',
};

async function chat({ message, imagePath, mimetype, history = [] }) {
  const provider = getProvider();
  const providerName = (process.env.AI_PROVIDER || 'claude').toLowerCase();

  const userContent = [];
  if (message) userContent.push({ type: 'text', text: message });

  if (imagePath) {
    const data = fs.readFileSync(imagePath).toString('base64');
    const mediaType = mimetype || 'image/png';
    if (providerName === 'openai') {
      userContent.push({ type: 'image_url', image_url: { url: `data:${mediaType};base64,${data}` } });
    } else {
      userContent.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data } });
    }
  }

  if (userContent.length === 0) throw new Error('No content provided');

  // History is kept as plain text on both sides (no re-sent images) to keep
  // the payload small — the assistant's prior replies still carry enough
  // context for follow-up questions to make sense.
  const messages = [
    ...history
      .filter(h => h && (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string')
      .map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: userContent.length === 1 && userContent[0].type === 'text' ? message : userContent },
  ];

  return provider.callModel(SYSTEM_PROMPT, messages, { model: CHAT_MODEL[providerName] });
}

module.exports = { chat };
