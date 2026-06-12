import { prisma } from "@/src/server/db";

export function serializeConversation(conversation: {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString()
  };
}

export async function listConversations() {
  const conversations = await prisma.conversation.findMany({
    orderBy: { updatedAt: "desc" },
    take: 100
  });
  return conversations.map(serializeConversation);
}

export async function listConversationsForUser(userId: string) {
  const conversations = await prisma.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 100
  });
  return conversations.map(serializeConversation);
}

export async function createConversation(title = "新会话", userId?: string) {
  const conversation = await prisma.conversation.create({ data: { title, userId } });
  return serializeConversation(conversation);
}

export async function getConversation(id: string) {
  return prisma.conversation.findUnique({ where: { id } });
}

export async function getConversationForUser(id: string, userId: string) {
  return prisma.conversation.findFirst({ where: { id, userId } });
}

export async function deleteConversation(id: string) {
  await prisma.conversation.delete({ where: { id } });
}

export async function touchConversation(id: string, title?: string) {
  return prisma.conversation.update({
    where: { id },
    data: {
      ...(title ? { title } : {}),
      updatedAt: new Date()
    }
  });
}
