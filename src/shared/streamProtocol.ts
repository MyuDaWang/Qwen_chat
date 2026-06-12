import type { MessageContent } from "@/src/shared/types";

export type StreamEvent =
  | { event: "message_created"; data: { conversationId: string; assistantMessageId: string } }
  | { event: "status"; data: { conversationId: string; messageId: string; message: string } }
  | { event: "delta"; data: { conversationId: string; messageId: string; delta: string } }
  | { event: "done"; data: { conversationId: string; messageId: string; content?: MessageContent } }
  | { event: "error"; data: { conversationId?: string; messageId?: string; message: string } }
  | { event: "cancelled"; data: { conversationId: string; messageId: string } };

export function encodeStreamEvent(streamEvent: StreamEvent): string {
  return `event: ${streamEvent.event}\ndata: ${JSON.stringify(streamEvent.data)}\n\n`;
}

export function parseStreamEvents(input: string): StreamEvent[] {
  return input
    .split(/\n\n+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const eventLine = chunk.split("\n").find((line) => line.startsWith("event: "));
      const dataLine = chunk.split("\n").find((line) => line.startsWith("data: "));
      if (!eventLine || !dataLine) {
        throw new Error("Invalid stream event");
      }
      return {
        event: eventLine.slice("event: ".length),
        data: JSON.parse(dataLine.slice("data: ".length))
      } as StreamEvent;
    });
}
