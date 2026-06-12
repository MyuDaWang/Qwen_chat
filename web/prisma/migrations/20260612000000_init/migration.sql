CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "plan" TEXT NOT NULL DEFAULT 'free',
  "sessionTokenHash" TEXT,
  "sessionExpiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Conversation" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL DEFAULT '新会话',
  "userId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserPreference" (
  "userId" TEXT NOT NULL,
  "theme" TEXT NOT NULL DEFAULT 'system',
  "accentColor" TEXT NOT NULL DEFAULT 'default',
  "language" TEXT NOT NULL DEFAULT 'auto',
  "tone" TEXT NOT NULL DEFAULT 'default',
  "warmth" TEXT NOT NULL DEFAULT 'default',
  "enthusiasm" TEXT NOT NULL DEFAULT 'default',
  "titleStyle" TEXT NOT NULL DEFAULT 'default',
  "emojiStyle" TEXT NOT NULL DEFAULT 'default',
  "quickAnswer" BOOLEAN NOT NULL DEFAULT true,
  "customInstructions" TEXT,
  "nickname" TEXT,
  "occupation" TEXT,
  "details" TEXT,
  "memoryEnabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "UserMemory" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'manual',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserMemory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Message" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'done',
  "model" TEXT,
  "error" TEXT,
  "usage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MessageAttachment" (
  "id" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "width" INTEGER,
  "height" INTEGER,
  "originalName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MessageAttachment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_customerId_key" ON "User"("customerId");
CREATE INDEX "User_sessionTokenHash_idx" ON "User"("sessionTokenHash");
CREATE INDEX "Conversation_updatedAt_idx" ON "Conversation"("updatedAt");
CREATE INDEX "Conversation_userId_idx" ON "Conversation"("userId");
CREATE INDEX "UserPreference_updatedAt_idx" ON "UserPreference"("updatedAt");
CREATE INDEX "UserMemory_userId_enabled_updatedAt_idx" ON "UserMemory"("userId", "enabled", "updatedAt");
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");
CREATE INDEX "Message_status_idx" ON "Message"("status");
CREATE INDEX "MessageAttachment_messageId_idx" ON "MessageAttachment"("messageId");

ALTER TABLE "Conversation"
  ADD CONSTRAINT "Conversation_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Message"
  ADD CONSTRAINT "Message_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MessageAttachment"
  ADD CONSTRAINT "MessageAttachment_messageId_fkey"
  FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
