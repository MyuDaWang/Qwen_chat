export type MessageRole = "user" | "assistant" | "system";
export type MessageStatus = "streaming" | "done" | "error" | "cancelled";

export type TextBlock = {
  type: "text";
  text: string;
};

export type ImageBlock = {
  type: "image";
  url: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  alt?: string;
  originalName?: string;
};

export type FileBlock = {
  type: "file";
  url: string;
  mimeType: string;
  size: number;
  originalName: string;
  extractedText: string;
  summary?: string;
};

export type MessageContentBlock = TextBlock | ImageBlock | FileBlock;
export type MessageContent = MessageContentBlock[];

export type ConversationDTO = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type MessageDTO = {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: MessageContent;
  status: MessageStatus;
  progress?: string;
  model?: string | null;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UploadedImage = ImageBlock;
export type UploadedAttachment = ImageBlock | FileBlock;

export type UserPreferenceDTO = {
  theme: "light" | "dark";
  language: "auto" | "zh-CN" | "en-US";
  tone: "default" | "concise" | "professional" | "friendly";
  warmth: "default" | "calm" | "warm" | "direct";
  enthusiasm: "default" | "low" | "medium" | "high";
  titleStyle: "default" | "short" | "structured";
  emojiStyle: "default" | "none" | "minimal";
  quickAnswer: boolean;
  customInstructions?: string | null;
  nickname?: string | null;
  occupation?: string | null;
  details?: string | null;
  memoryEnabled: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

export type UserMemoryDTO = {
  id: string;
  userId: string;
  content: string;
  source: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "UPLOAD_TOO_LARGE"
  | "UNSUPPORTED_FILE_TYPE"
  | "LLM_TIMEOUT"
  | "LLM_RATE_LIMITED"
  | "LLM_PROVIDER_ERROR"
  | "INTERNAL_ERROR";

export type ApiErrorPayload = {
  error: {
    code: ApiErrorCode;
    message: string;
  };
};
