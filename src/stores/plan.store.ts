import { create } from "zustand";
import type { PlanDTO } from "@/types/chat";

interface PlanStore {
  plans: Record<string, PlanDTO>;
  /** Giáo án đang làm việc trong chat (gửi kèm mỗi request để agent hiểu "bài này") */
  focusPlanId: string | null;
  setPlan: (plan: PlanDTO) => void;
  setFocus: (id: string | null) => void;
}

/** Nguồn sự thật phía client cho giáo án: mọi thẻ trong chat cùng thấy trạng thái mới nhất. */
export const usePlanStore = create<PlanStore>((set) => ({
  plans: {},
  focusPlanId: null,
  setPlan: (plan) =>
    set((s) => {
      const current = s.plans[plan.id];
      if (current && current.updatedAt > plan.updatedAt) return s;
      return { plans: { ...s.plans, [plan.id]: plan }, focusPlanId: plan.id };
    }),
  setFocus: (id) => set({ focusPlanId: id }),
}));
