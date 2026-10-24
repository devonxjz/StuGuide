"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { newConversationId } from "@/lib/ids";
import { ShortTermStore } from "@/lib/short-term-store";

const Ctx = createContext<ShortTermStore | null>(null);

/** Hook cho các thẻ/khối giao diện ghi sự kiện vào bộ nhớ ngắn hạn (RAM). null nếu ngoài Provider. */
export const useShortTerm = () => useContext(Ctx);

/**
 * Mỗi lần mở cổng phụ huynh là một phiên. Mọi thao tác (xem, chat, đánh dấu bước, phản ứng của bé, ghi chú)
 * chỉ nằm trong RAM; khi tab ẩn/đóng hoặc rời trang mới đẩy về DB để AI chắt lọc thành trí nhớ dài hạn của bé.
 */
export function ShortTermProvider({ studentId, children }: { studentId: string; children: React.ReactNode }) {
  const [store] = useState(() => new ShortTermStore({ sessionId: newConversationId(), studentId, endpoint: "/api/family/sessions" }));

  useEffect(() => {
    store.record("view");
    const detach = store.attach();
    return () => {
      detach();
      store.flush(); // rời trang trong ứng dụng cũng là kết thúc phiên
    };
  }, [store]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}
