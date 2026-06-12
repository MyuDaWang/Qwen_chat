# Qwen Chat Web

Qwen Chat Web 是一套面向企业和个人知识工作的 AI 对话应用，支持多轮会话、Markdown 流式输出、图片理解、附件解析、图像生成、个性化设置和账号体系。项目采用前后端一体的 Web 架构，便于快速部署、持续迭代和接入不同模型服务。

## 产品预览

![聊天主界面](web/public/previews/chat-preview.jpg)

![图像生成预览](web/public/previews/image-generation-preview.jpg)

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
README.md                    项目说明
web/                         Web 应用主目录
web/app/                     Next.js 页面和 API 路由
web/app/api/chat/            聊天发送、SSE 流式输出和图像生成入口
web/app/api/conversations/   会话与消息管理
web/app/api/auth/            注册、登录和登出
web/app/api/settings/        个性化设置读取与保存
web/app/api/memories/        用户记忆管理
web/app/api/upload/          图片、文档和表格上传解析
web/src/ai/                  模型列表、Agent、上下文构建和 LLM Provider
web/src/features/chat/       聊天界面组件和 hooks
web/src/server/              认证、数据库、用户、灰度、prompt 组合和服务端逻辑
web/src/shared/              共享类型、校验、SSE 协议和基础 UI
web/prisma/                  数据模型和数据库迁移
web/tests/                   核心功能测试
web/data/uploads/            运行时上传目录，仅保留 .gitkeep
```

## 环境配置

复制示例环境变量文件，并填写自己的模型 API Key：

```bash
cd web
cp .env.example .env
```

关键配置如下：

```bash
DATABASE_URL="postgresql://qwen:qwen@localhost:5432/qwen_chat?schema=public"
OPENAI_API_KEY="your-api-key"
OPENAI_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"
MODEL_NAME="qwen3-vl-plus"
MODEL_SUPPORTS_IMAGES=1
ALLOW_ANONYMOUS_LOCAL_USER=1
```

其中 `OPENAI_API_KEY` 需要替换为可用的 DashScope API Key，其他配置可先保持默认。

## 本地启动

启动前请先打开 Docker Desktop，并确认 Docker 正在运行。数据库依赖 PostgreSQL 容器，如果 Docker 没有启动，注册、登录、会话保存等后端功能会失败。

```bash
cd web
docker compose up -d
npm install
npm run db:migrate:deploy
npm run dev
```

服务默认运行在 `http://localhost:3000`。

## 使用方式

服务启动后，在浏览器打开 `http://localhost:3000` 即可开始使用。

进入页面后先登录或注册账号，再新建会话并输入问题。应用支持连续追问、Markdown 输出、图片上传、附件解析和历史会话保存。需要调整回答风格、语言、记忆或其他偏好时，可在左下角账号入口打开“设置与记忆”。
