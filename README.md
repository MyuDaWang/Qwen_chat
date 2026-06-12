# Qwen Chat Web

Qwen Chat Web 是一套面向企业和个人知识工作的 AI 对话应用，支持多轮会话、Markdown 流式输出、图片理解、附件解析、图像生成、个性化设置和账号体系。项目采用前后端一体的 Web 架构，便于快速部署、持续迭代和接入不同模型服务。

## 核心能力

- 多轮对话：支持会话创建、切换、历史消息恢复和连续追问。
- 流式输出：通过 SSE 实时返回模型响应，提升长文本回答体验。
- 多模态输入：支持图片上传、截图分析和文档/表格/文本附件解析。
- 图像生成：可接入 Qwen 图像生成模型，生成结果自动进入会话。
- 个性化设置：支持用户偏好、回答风格、记忆管理和会员等级控制。
- 账号体系：提供注册、登录、会话隔离和安全 Cookie 会话管理。
- 可观测性：核心链路带 trace id 和结构化日志，便于排查线上问题。

## 技术栈

- Next.js App Router：页面、API Routes 和服务端渲染
- React + Tailwind CSS：聊天界面和设置面板
- Prisma + PostgreSQL：账号、会话、消息、记忆和附件元数据
- OpenAI-compatible Provider：默认对接 DashScope 千问兼容接口，也可接入模型网关
- Vitest + Testing Library：核心协议、Provider、Markdown 和上下文构建测试

## 项目结构

```txt
app/                         Next.js 页面和 API 路由
app/api/chat/                聊天发送、SSE 流式输出和图像生成入口
app/api/conversations/       会话与消息管理
app/api/auth/                注册、登录和登出
app/api/settings/            个性化设置读取与保存
app/api/memories/            用户记忆管理
app/api/upload/              图片、文档和表格上传解析
app/api/uploads/             上传文件访问入口
src/ai/                      模型列表、Agent、上下文构建和 LLM Provider
src/ai/llm/                  OpenAI-compatible 与网关 Provider
src/features/chat/components/ 聊天主界面、消息、输入框、侧栏和设置弹窗
src/features/chat/hooks/      聊天页状态与偏好设置 hooks
src/server/                  认证、数据库、用户、灰度、prompt 组合和服务端逻辑
src/server/repositories/      会话与消息仓储
src/server/upload/            上传校验、保存和附件解析
src/shared/                  共享类型、校验、SSE 协议和基础 UI
prisma/                      数据模型和数据库迁移
tests/                       核心功能测试
data/uploads/                运行时上传目录，仅保留 .gitkeep
```

## 本地启动

```bash
docker compose up -d
npm install
npm run db:migrate
npm run dev
```

服务默认运行在 `http://localhost:3000`。

## 环境变量

复制 `.env.example` 到 `.env` 后配置：

```bash
DATABASE_URL="postgresql://qwen:qwen@localhost:5432/qwen_chat?schema=public"
OPENAI_API_KEY="your-api-key"
OPENAI_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"
MODEL_NAME="qwen3-vl-plus"
MODEL_SUPPORTS_IMAGES=1
```

## 常用命令

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run test
npm run db:migrate
npm run db:migrate:deploy
npm run db:studio
```
