
"use client";

import { useChat } from "@/hooks/use-chat";
import { ChatBox } from "./chat-box";

export function ChatLayout() {
  const { openChats } = useChat();

  if (openChats.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-0 right-4 z-[100] flex items-end gap-4">
      {openChats.map((chat) => (
        <ChatBox key={chat.chatId} user={chat.user} chatId={chat.chatId} />
      ))}
    </div>
  );
}
