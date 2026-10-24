"use client";

import { createContext, useContext } from "react";

/** Cho phép các thẻ kết quả gửi tiếp một yêu cầu vào cuộc trò chuyện (chat-first). */
export const ChatActionsContext = createContext<{ send: (text: string) => void }>({ send: () => {} });
export const useChatActions = () => useContext(ChatActionsContext);
