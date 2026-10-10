# PTE GO

一个本地运行的 PTE 备考助手：每日练习打卡、AI 整理知识点、艾宾浩斯间隔复习、错题集自动收录与重做提醒、AI 答疑助教、学习笔记与模板。

前端 React + Vite + Tailwind，后端 Express + SQLite（better-sqlite3），AI 能力可在 Claude 与 OpenAI 之间切换。界面支持中 / 英双语、浅色 / 深色主题。

---

## 目录

- [功能概览](#功能概览)
- [快速开始](#快速开始)
- [环境变量](#环境变量)
- [使用指南](#使用指南)
  - [首页](#首页)
  - [复习页](#复习页)
  - [笔记页](#笔记页)
  - [全局功能](#全局功能)
- [核心规则说明](#核心规则说明)
- [数据备份与恢复](#数据备份与恢复)
- [部署为常驻服务（macOS）](#部署为常驻服务macos)
- [项目结构](#项目结构)
- [API 一览](#api-一览)

---

## 功能概览

| 模块 | 功能 |
| --- | --- |
| 考试倒计时 | 设置考试日期，显示剩余天数；选择目标雅思等效分（6 / 7 / 8），显示口语、写作、阅读、听力各科对应的 PTE 目标分；临近考试（≤16 天）提示是否调整日期 |
| 每日计划与打卡 | 内置 22 个 PTE 题型及每日目标题数，可编辑；打卡记录题数、正确率、题号、备注；**粘贴成绩截图由 AI 自动识别填写**；显示今日完成度与连续打卡天数 |
| 正确率趋势图 | 阅读类题型正确率折线图，可切换 7 天 / 30 天 / 全部，"总的"或按题型"细项"查看 |
| 待办事项 | 简单的 todo 列表，支持编辑、勾选完成、删除 |
| AI 录入知识点 | 输入文字、粘贴截图、上传图片或 PDF / Word / TXT / MD 文件，AI 按语法 / 词义辨析 / 固定搭配 / 多义词提取成结构化知识点，并附 PTE 老师视角的学习笔记，同时检查原文拼写语法 |
| 知识点总览 | 分页表格，按分类、生词本、重点筛选，中英文搜索，查看 / 编辑 / 删除 / 标记重点 |
| 检测（间隔复习） | 按 SM-2 风格算法安排到期复习；翻牌自评或输入作答；生词本按发音 / 拼写 / 阅读切换不同练习方式；键盘快捷键 |
| 错题集 | 打卡时填写题号且正确率 < 50% 自动收录；按间隔重复提醒重做；连续两次 ≥ 70% 自动毕业 |
| 笔记与模板 | Markdown 编辑器，支持插图、目录导航，可导出 PDF / Word |
| AI 答疑助教 | 全局悬浮窗，可文字提问或粘贴截图，多轮对话；可将对话一键提取为知识点；内置查词 |
| 词典 | 点击复习卡片中的任意单词即可查词：英 / 美音标与发音、中文释义、AI 例句，可一键加入生词本 |
| 其它 | 复习到期桌面通知、导航栏待复习数角标、中英界面切换、深色模式、每日自动备份到 Git |

---

## 快速开始

### 依赖

- Node.js 20+（后端使用 `node --watch` 与 better-sqlite3）
- 至少一个 AI 服务的 API Key：Anthropic（Claude）或 OpenAI

### 安装与启动

```bash
git clone https://github.com/justinwonderwall/Ptego.git
cd Ptego

# 安装根目录（后端）和 frontend 的依赖
npm run install:all

# 配置环境变量
cp .env.example .env
# 编辑 .env，填入 API Key（见下一节）

# 开发模式：同时启动后端 (3001) 和前端 Vite (5173)
npm run dev
```

浏览器打开 <http://localhost:5173>。

首次启动时会自动创建 SQLite 数据库 `backend/db/app.db`，并写入 22 个默认 PTE 题型。

### 单端口运行（生产方式）

```bash
npm --prefix frontend run build   # 构建前端到 frontend/dist
npm start                         # 后端同时托管前端
```

打开 <http://localhost:3001> 即可，无需再启动 Vite。

### 常用脚本

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 开发模式，前后端同时启动，后端文件变更自动重启 |
| `npm run dev:backend` / `npm run dev:frontend` | 单独启动后端 / 前端 |
| `npm start` | 只启动后端（若已 build，会同时提供前端页面） |
| `npm run install:all` | 安装根目录和 frontend 的依赖 |
| `npm run backup` | 导出数据库快照并提交推送到 Git |
| `npm run restore` | 从快照恢复数据库（需加 `-- --yes` 才真正执行） |
| `npm run deploy` | 构建前端并重启 launchd 常驻服务（macOS） |

---

## 环境变量

在项目根目录 `.env` 中配置（参考 `.env.example`）：

| 变量 | 说明 |
| --- | --- |
| `AI_PROVIDER` | `claude`（默认）或 `openai`，决定所有 AI 功能使用哪家服务 |
| `ANTHROPIC_API_KEY` | `AI_PROVIDER=claude` 时必填 |
| `OPENAI_API_KEY` | `AI_PROVIDER=openai` 时必填 |
| `PORT` | 后端端口，默认 `3001` |
| `MERRIAM_WEBSTER_API_KEY` | 可选。Merriam-Webster 词典 Key，仅在有道词典查询失败时作为音标 / 发音的备用来源 |

> `.env` 已在 `.gitignore` 中，不会被提交。

---

## 使用指南

应用顶部导航有三个页面：**首页**、**复习**、**笔记**；右上角依次是复习提醒开关、主题切换、中 / 英切换。右下角的悬浮按钮是 AI 答疑助教，在每个页面都可用。

### 首页

首页左侧是学习仪表盘，右侧是待办和知识点录入。

#### 1. 考试倒计时

1. 点击 **设置考试日期**，选择日期后保存，卡片显示"距 PTE 考试 N 天"。
2. 在 **目标分数（雅思等效）** 中选择雅思 6 / 7 / 8 分，下方会显示口语、写作、阅读、听力四科分别需要达到的 PTE 分数，例如雅思 7 分对应：口语 76、写作 69、阅读 59、听力 58。
3. 距考试 ≤ 16 天时会出现提示，建议你评估是否需要改期。点击"不调整，继续按计划复习"即可关闭（针对当前考试日期只提示一次，修改日期后会重新判断）。

#### 2. 每日计划与练习打卡

卡片按口语 / 写作 / 阅读 / 听力列出所有题型、每日目标题数和今日完成进度，顶部显示今日总完成度和 🔥 连续打卡天数（及历史最长）。

**编辑计划**：点击编辑图标，可修改每个题型的每日目标题数，或取消勾选以停用不再练习的题型（停用后不在计划中显示，随时可重新启用）。

**记录练习**：点击某个题型的 **记录练习**，在弹窗中：

- **完成题数**：本次练了几道。
- **正确率 %**（可选）：用于趋势图和错题集。可以点 **🧮 计算工具**，按组填写正确 / 错误题数，自动累加算出正确率。
- **题号**（可选）：填写后，若正确率 < 50% 会自动进入错题集。
- **备注**（可选）。
- **📋 粘贴截图自动填写**：在弹窗中直接 `Ctrl+V` / `Cmd+V` 粘贴练习平台的成绩截图，AI 会识别并自动填好题数、正确率和题号。支持三种截图：
  - 分题明细表格（每行 "3/4" 这样的得分）：AI 逐行读取得分，程序计算总正确率；如果每行都带题号，会**逐题判断**，任何一道低于 50% 都会进错题集，即使总平均分不低。
  - 汇总卡片（直接写着正确率、题数）。
  - 单题评分详情页（带题号）。
- 如果该题型在错题集里有今天到期要重做的题，弹窗会列出 **今天要重做** 的题号，点击即可填入。

提交后会提示错题集的变化：新收录、更新重做记录，或"已连续两次达标，从错题集移除"。

**查看历史**：点击历史图标，可查看该题型所有打卡记录，并删除录错的记录。

#### 3. 阅读正确率趋势

展示阅读类题型的正确率变化。

- 时间范围：**7 天 / 30 天 / 全部**。
- 模式：**总的**（所有阅读题型合并）/ **细项**（每个题型一条线，用颜色 + 形状区分）。
- 显示期间平均正确率。只有填写了正确率的打卡才会出现在图中。

#### 4. 待办事项

在输入框输入内容回车即可添加；勾选完成，已完成项自动沉底；支持编辑和删除。

#### 5. 录入知识点（AI 整理）

这是把学习材料变成复习卡片的入口。

1. **内容**：输入或粘贴单词、句子、段落；也可以直接 `Ctrl+V` 粘贴截图。
2. **上传文件**（可选）：
   - 图片：PNG / JPG，最多 5 张。
   - 文件：PDF、Word（.docx）、TXT、MD。扫描版 PDF 没有文字层，请改为上传图片；旧版 .doc 请另存为 .docx。
3. **分类**（可多选）：语法 / 词义辨析 / 固定搭配 / 多义词。AI 会把内容中属于所选类型的知识点全部提取出来。
4. 点击 **✨ AI 整理**。

AI 对每个知识点生成：英文词 / 短语、中文解释、例句、学习笔记（讲清"为什么这样用"），并检查你原始输入里的拼写和语法错误。不同分类的处理方式：

- **词义辨析**：输入"affect vs effect"这类对比时，合并为一条，分别给出释义、例句和核心区别。
- **多义词**：只输入一个单词时，AI 会整理该词 2–4 个常见含义，每个含义配例句。
- **固定搭配**：会指出容易混淆的错误形式错在哪里。

整理完成后进入 **确认知识点** 弹窗，可逐条查看、修改、跳过，或"一键保存剩余 N 条"。保存时会自动查询并填入音标和发音。

### 复习页

复习页有三个标签：**总览**、**检测**、**错题集**。导航栏"复习"旁的红色数字是当前到期待复习的知识点数。

#### 1. 总览

所有知识点的表格，每页 20 条。

- 按分类（语法 / 词义辨析 / 固定搭配 / 多义词）、生词本（发音 / 拼写 / 阅读）、⭐ 重点筛选。
- 搜索框支持中英文模糊搜索。
- 每行显示分类、标签、英文、中文、音标、下次复习日期、掌握状态。
- 点击行查看详情；可编辑（分类、英文、中文、例句、学习笔记、读 / 说 / 写技能标签）、删除、标记重点。

#### 2. 检测（间隔复习）

只显示今天到期的知识点，顶部显示待复习数和已完成数。

**两种作答方式**（适用于普通知识点）：

- **自评模式**：看正面，翻牌看答案，然后自评"未掌握"或"已掌握"。
- **输入模式**：在输入框写出答案，点"查看"对比；答对会自动跳到下一张。

还可以切换方向：英 → 中，或中 → 英。

**生词本模式**：顶部选择生词本类型后，练习方式由类型决定（在"全部"下每张卡也会按自身类型处理）：

| 生词本 | 练习方式 |
| --- | --- |
| 发音 | 直接展示单词、音标和发音按钮，听读后自评 |
| 拼写 | 显示中文和音标，输入英文拼写 |
| 阅读 | 看英文翻牌看中文，自评 |

**快捷键**：`空格` 翻牌，`1` 未掌握，`2` 已掌握。

**其它**：勾选 ⭐ 重点 只复习重点卡片；卡片上的任意英文单词都可以点击查词；复习中可直接编辑当前卡片。

#### 3. 错题集

记录练习中做错的题号，按间隔重复提醒重做。

- 筛选：全部 / 待重做 / 已掌握 / ⭐ 重点。
- 每行显示题型、题号（点击即复制，方便去练习平台搜题）、每次练习记录的正确率、下次重做日期、状态。
- 可手动标记为已掌握、标记重点或删除。

**使用流程**：

1. 在首页打卡时填写题号（或粘贴带题号的截图）。
2. 正确率 < 50% 的题自动进入错题集，第二天提醒重做。
3. 到期后去练习平台重做这道题，再次打卡同一题型、同一题号。
4. 重做正确率 ≥ 70% 记为达标，间隔拉长；连续两次达标即毕业，移出复习队列。未达标则重置，继续轮换。

### 笔记页

分为 **学习笔记**（做题技巧总结）和 **模板**（备考套路、DI 描述模板等）两个标签。

1. 点击右上角 **+ 新增笔记 / + 新增模板**。
2. 输入标题，在 Markdown 编辑器中编写：支持标题、列表、粗体、表格、代码块、插入图片（图片会上传保存到服务器）。
3. 点击 **发布** 保存。左侧是文章列表，右侧根据标题自动生成 **文章导航** 目录，点击可跳转。
4. **导出**：可导出为 PDF 或 Word（.docx）。
5. 在编辑页可删除文章。

### 全局功能

#### AI 答疑助教

点击右下角悬浮按钮打开。

- 可提问语法、词汇辨析、固定搭配等问题，支持文字和截图（粘贴或点击上传）。
- 多轮对话，追问时会结合上下文。
- 回答采用中文讲解、英文例句的方式，简洁直接。
- **📚 提取知识点**：选择分类后，可将当前对话内容整理成知识点存入复习库。
- 窗口底部有 **查词典** 输入框，可以直接查单词。

#### 查词与生词本

在复习卡片、知识点详情、AI 答疑等处点击英文单词，或在查词框输入单词，会弹出词典卡片：

- 英式 / 美式音标及发音（🔊）。
- 中文词典释义。
- AI 生成的参考例句及翻译。
- 选择 **发音 / 拼写 / 阅读** 之一并可加备注，即可加入对应生词本，之后在"检测"中按该方式复习。

词典数据来源：有道词典（音标、发音、释义），失败时回退到 Merriam-Webster；中文释义缺失时由 AI 补充。

#### 复习提醒

点击导航栏铃铛图标开启桌面通知（需浏览器授权）。有到期知识点时会弹出系统通知"您有 N 个知识点待复习"。

#### 语言与主题

- 右上角 **中 / EN** 按钮切换界面语言。
- 太阳 / 月亮按钮切换浅色 / 深色模式。

---

## 核心规则说明

### 知识点复习算法（SM-2 风格）

每张卡片记录 `ease`（初始 2.5）、`interval_days`、`repetitions`：

- **已掌握**：第 1 次间隔 1 天，第 2 次 3 天，之后为 `上次间隔 × ease`，`ease + 0.1`。间隔达到 60 天视为完全掌握，不再出现。
- **未掌握**：重置为 1 天后复习，`ease − 0.2`（最低 1.3）。

### 错题集规则

| 参数 | 值 |
| --- | --- |
| 收录阈值 | 首次打卡正确率 < 50% |
| 达标阈值 | 重做正确率 ≥ 70% |
| 毕业条件 | 连续 2 次达标 |

同一题型 + 同一题号视为同一道题，后续每次打卡都会追加记录并重新计算下次重做时间。

### 内置题型

首次启动时写入以下题型（可在"编辑计划"中调整每日目标或停用）：

- **Speaking**：Read Aloud、Repeat Sentence、Describe Image、Retell Lecture、Answer Short Question、Summarize Group Discussion、Respond to a Situation
- **Writing**：Summarize Written Text、Write Essay
- **Reading**：Fill in the Blanks (Dropdown)、Multiple Choice (Multiple)、Reorder Paragraph、Fill in the Blanks (Drag & Drop)、Multiple Choice (Single)
- **Listening**：Summarize Spoken Text、Multiple Choice (Multiple)、Fill in the Blanks、Highlight Correct Summary、Multiple Choice (Single)、Select Missing Word、Highlight Incorrect Words、Write from Dictation

---

## 数据备份与恢复

所有数据保存在本地：数据库 `backend/db/app.db`，上传的图片在 `backend/uploads/`，两者都不进 Git。

### 备份

```bash
npm run backup
```

会将数据库所有表导出为 `backups/db-snapshot.json`（JSON 格式，便于在 Git 中查看差异），把上传图片复制到 `backups/uploads/`，然后只提交 `backups/` 目录并推送到 `origin main`。数据无变化时不会产生提交。

### 恢复

适用于新机器 `git clone` 之后，或本地数据损坏时：

```bash
npm run restore            # 预览：列出每张表当前行数 → 快照行数，不做修改
npm run restore -- --yes   # 确认执行：清空并用快照覆盖，同时恢复上传图片
```

> 恢复是破坏性操作，会覆盖当前数据库中的数据。

---

## 部署为常驻服务（macOS）

项目可以用 launchd 让服务开机自启、崩溃自动重启，并每天定时备份。

**应用服务** `~/Library/LaunchAgents/com.ptego.app.plist`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key><string>com.ptego.app</string>
    <key>ProgramArguments</key>
    <array>
        <string>/opt/homebrew/bin/node</string>
        <string>/path/to/Ptego/backend/server.js</string>
    </array>
    <key>WorkingDirectory</key><string>/path/to/Ptego</string>
    <key>RunAtLoad</key><true/>
    <key>KeepAlive</key><true/>
    <key>StandardOutPath</key><string>/path/to/Ptego/scripts/app.log</string>
    <key>StandardErrorPath</key><string>/path/to/Ptego/scripts/app.log</string>
</dict>
</plist>
```

**每日备份** `~/Library/LaunchAgents/com.ptego.backup.plist`（每天 23:00 执行 `scripts/backup.sh`）：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key><string>com.ptego.backup</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>/path/to/Ptego/scripts/backup.sh</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key><integer>23</integer>
        <key>Minute</key><integer>0</integer>
    </dict>
    <key>StandardOutPath</key><string>/path/to/Ptego/scripts/backup.log</string>
    <key>StandardErrorPath</key><string>/path/to/Ptego/scripts/backup.log</string>
</dict>
</plist>
```

把 `/path/to/Ptego` 替换为实际路径，然后加载：

```bash
npm --prefix frontend run build
launchctl load ~/Library/LaunchAgents/com.ptego.app.plist
launchctl load ~/Library/LaunchAgents/com.ptego.backup.plist
```

之后修改代码时，执行 `npm run deploy` 即可重新构建前端并重启服务。日志在 `scripts/app.log` 和 `scripts/backup.log`。

---

## 项目结构

```
Ptego/
├── backend/
│   ├── server.js              # Express 入口，挂载 API、托管前端构建产物
│   ├── db/
│   │   ├── schema.sql         # 表结构
│   │   └── index.js           # 初始化、迁移、默认题型种子数据
│   ├── routes/                # 各 API 路由
│   └── services/
│       ├── aiExtractor.js     # AI 提取知识点
│       ├── practiceParser.js  # AI 识别成绩截图
│       ├── chatTutor.js       # AI 答疑助教
│       ├── aiDictionary.js    # AI 中文释义与例句
│       ├── dictionary.js      # 有道 / Merriam-Webster 词典
│       ├── mistakeBook.js     # 错题集收录与毕业逻辑
│       ├── srs.js             # 间隔重复算法
│       └── providers/         # claude.js / openai.js，统一的 callModel 接口
├── frontend/
│   └── src/
│       ├── main.jsx           # 路由、导航栏
│       ├── pages/             # Home / Review / Notes
│       ├── components/        # 各功能组件
│       ├── i18n/locales/      # zh.json / en.json
│       └── utils/exportDoc.js # 导出 PDF / Word
├── scripts/
│   ├── backup.js / backup.sh  # 备份
│   └── restore.js             # 恢复
├── backups/                   # 数据快照（纳入 Git）
└── .env.example
```

---

## API 一览

所有接口前缀为 `/api`。

| 路由 | 说明 |
| --- | --- |
| `GET/PUT /settings` | 考试日期、主题、目标分 |
| `GET/POST/PUT /task-types` | 题型及每日目标 |
| `POST /practice/logs/parse-screenshot` | 上传成绩截图，AI 识别 |
| `GET/POST/DELETE /practice/logs` | 打卡记录；另有 `/today`、`/accuracy`、`/streak` |
| `POST /knowledge/extract` | 文字 / 图片 / 文件 → AI 提取知识点 |
| `GET/POST/PUT/DELETE /knowledge` | 知识点增删改查 |
| `GET /review/due`、`POST /review/:id/grade` | 到期知识点、提交复习结果 |
| `GET /mistakes`、`/mistakes/due`、`/mistakes/stats` | 错题集 |
| `GET /dictionary/:word` | 查词 |
| `GET/POST/PUT/DELETE /templates` | 笔记与模板；`POST /templates/upload-image` 上传插图 |
| `POST /chat` | AI 答疑 |
| `GET/POST/PUT/DELETE /todos` | 待办事项 |
| `GET /health` | 健康检查 |
