# HSK 词汇与语法学习网站

**中文** | [Tiếng Việt](README.vi.md)

一个为越南语母语学习者打造的 HSK 自学网站，包含词汇和语法两大部分，界面为越南语，释义同时提供越南语和英语。

## 功能

### 词汇（HSK 1–6）

- 按 HSK 2.0 大纲收录 1–6 级共 4998 个词，全部使用简体字。
- 每个词包含：拼音、汉越音、越南语释义、英语释义，以及一个例句。
- 例句中使用的词汇与该级别水平相符，整套数据尽量覆盖多样的语法结构，并标注所用的语法点。
- 默认只显示汉字；点击词语后显示释义和例句；例句的拼音和译文再隐藏一层，再次点击才显示，方便先自己读一遍。
- 支持按汉字、拼音、汉越音或释义搜索（不区分声调和越南语声调符号）。
- 支持朗读词语和例句（使用浏览器自带的语音合成）。

### 语法

- 内容依据《HSK 标准教程》，按课整理各课的语法点（注释）。
- 每个语法点包含越南语讲解（依据教材）和英语讲解，按不同用法分别列出。
- 例句取自教材，默认只显示汉字，语法点在句中高亮；点击例句后显示拼音、越南语和英语译文，也可以一键全部显示。
- 教材中的“比一比”（近义词辨析，如 刚—刚才、差不多—几乎、究竟—到底）也一并收录。
- 语法点标题显示拼音。

### 学习进度

- 每个词和每个语法点都可以标记为“没记住 / 有点记得 / 已记住”三种状态。
- 每个级别或每一课的标题上显示三种状态的数量，点击可只看某一种状态。
- 学习进度按账号保存在服务器上（Upstash Redis），多台设备之间自动同步；浏览器本地保留一份副本，断网时的修改会在联网后自动补发。

### 其他

- 顶部有“词汇 / 语法”两个标签页，向下滚动时标签栏始终固定在屏幕顶部。
- 只有一个账号，不开放注册；未登录时无法读取任何学习数据。
- 支持手机和电脑，支持浅色和深色模式。

## 技术栈

- 前端：React 19 + Vite
- 部署：Vercel（Serverless Functions + Routing Middleware）
- 存储：Upstash Redis（通过 REST API 调用）
- 数据处理：Node.js、Python；例句拼音由 [pinyin-pro](https://github.com/zh-lx/pinyin-pro) 生成，并与 CC-CEDICT 对照

## 目录结构

```
data-src/                    原始数据和整理脚本
  content/hsk{级别}*.txt     词汇内容（每行一个词）
  grammar/hsk{级别}/NN.json  语法内容（每课一个文件）
  levels_raw.json            各级词表（来自 mock.tangce.cn）
  tags.json                  例句语法标签
  validate.py                检查词汇内容格式
  grammar_pinyin.txt         语法例句拼音（构建时生成，用于人工核对）
  pinyin_report.txt          词与例句拼音不一致的报告（构建时生成）
web/                         网站
  src/                       React 前端
  api/                       Vercel Serverless Functions（登录、会话、学习进度）
  middleware.js              未登录时拦截 /data/*
  scripts/build-data.mjs     把 data-src 整理成 public/data/*.json
  public/data/               构建后的数据
```

## 数据格式

### 词汇

`data-src/content/hsk{级别}*.txt`，每行 9 列（可选第 10 列），用 `|` 分隔：

```
词|拼音|汉越音|越南语释义|英语释义|例句|例句越南语译文|例句英语译文|语法标签[|例句拼音]
天气|tiānqì|thiên khí|thời tiết|weather|明天天气怎么样？|Thời tiết ngày mai thế nào?|What will the weather be like tomorrow?|特指问句
```

第 10 列用于手动指定例句拼音（音节用空格分隔，每个汉字一个音节），一般不需要填写。

### 语法

`data-src/grammar/hsk{级别}/NN.json`，每课一个文件：

```json
{
  "n": 4,
  "zh": "不要太着急赚钱",
  "vi": "Đừng quá nóng vội kiếm tiền",
  "en": "Don't be in too much of a hurry to make money",
  "points": [
    {
      "title": "原来",
      "uses": [
        {
          "vi": "越南语讲解",
          "en": "英语讲解",
          "ex": [
            {
              "zh": "她【原来】是汉语老师，现在已经成了一名律师。",
              "vi": "Cô ấy vốn là giáo viên tiếng Trung, bây giờ đã trở thành luật sư.",
              "en": "She used to be a Chinese teacher; now she's become a lawyer."
            }
          ]
        }
      ],
      "cmp": { "title": "原来—本来", "uses": [] }
    }
  ]
}
```

- `【】` 标出例句中需要高亮的语法部分。
- `\n` 用于分隔对话的各行（越南语、英语译文的行数必须与汉语一致）。
- `字{拼音}` 用于指定多音字的读音，例如 `得{děi}`、`地{de}`、`倒{dào}`。
- 语法点可加 `py` 字段，手动指定标题拼音。
- `cmp` 为可选的“比一比”部分。

修改内容后运行 `npm run data` 重新生成数据，并查看 `data-src/grammar_pinyin.txt` 核对多音字。

## 本地运行

需要 Node.js 20.19 或 22.12 以上（Vite 8 的要求）。

```bash
cd web
npm install
cp .env.example .env.local   # 填写账号和会话密钥
npm run dev                  # 先生成数据，再启动 Vite
```

`npm run dev` 会在本地模拟 Vercel 的 `api/*` 和 `middleware.js`，登录流程与线上一致。

### 环境变量

| 变量 | 说明 |
|---|---|
| `AUTH_USERNAME` | 登录用户名 |
| `AUTH_PASSWORD` | 登录密码 |
| `SESSION_SECRET` | 会话签名密钥（较长的随机字符串）；修改后所有已登录的会话都会失效 |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Upstash Redis 的 REST 地址和令牌（也支持 `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`） |

未配置 Redis 时网站仍可使用，学习进度只保存在当前浏览器中。

生成随机密钥：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 部署

在 Vercel 导入本仓库，**Root Directory 设为 `web`**，在项目设置中填写上述环境变量，并在 Storage 中连接一个 Upstash Redis 数据库。

## 数据来源

- 词表：HSK 2.0 词汇大纲（mock.tangce.cn）。
- 拼音对照：[CC-CEDICT](https://cc-cedict.org/)（CC BY-SA 4.0）。
- 汉越音参考：Unicode Unihan 数据库。
- 语法：《HSK 标准教程》（越南语版）。语法讲解和例句版权归原出版方所有，本项目仅供个人学习使用；英语讲解以及例句的越南语、英语译文为本项目另行编写。
