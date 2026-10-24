/** Id cuộc trò chuyện mới (UUID). Tách ra hàm riêng vì sinh ngẫu nhiên không phải thao tác thuần khi render. */
export const newConversationId = () => crypto.randomUUID();

/** URL mở một cuộc trò chuyện trắng (tham số n làm đổi key để component được dựng lại). */
export const newChatUrl = () => `/teacher?n=${Date.now()}`;
