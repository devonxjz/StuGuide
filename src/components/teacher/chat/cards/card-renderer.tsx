import type { CardPayload } from "@/types/chat";
import { PlanCard } from "./plan-card";
import { ChecklistCard } from "./checklist-card";
import { ParentCardCard } from "./parent-card-card";
import { StatsCard } from "./stats-card";
import { AlertsCard } from "./alerts-card";
import { PlanListCard } from "./plan-list-card";
import { KnowledgeCard } from "./knowledge-card";
import { NoticeCard } from "./notice-card";
import { HomeActivityCard } from "@/components/parent/cards/home-activity-card";
import { ChildProgressCard } from "@/components/parent/cards/child-progress-card";
import { ChildLessonsCard } from "@/components/parent/cards/child-lessons-card";

export function CardRenderer({ data, restored = false }: { data: CardPayload; restored?: boolean }) {
  switch (data.kind) {
    case "plan":
      return <PlanCard data={data} restored={restored} />;
    case "checklist":
      return <ChecklistCard data={data} />;
    case "parent-card":
      return <ParentCardCard data={data} restored={restored} />;
    case "feedback-stats":
      return <StatsCard data={data} />;
    case "alerts":
      return <AlertsCard data={data} />;
    case "plan-list":
      return <PlanListCard data={data} />;
    case "knowledge":
      return <KnowledgeCard data={data} />;
    case "home-activity":
      return <HomeActivityCard data={data} />;
    case "child-progress":
      return <ChildProgressCard data={data} />;
    case "child-lessons":
      return <ChildLessonsCard data={data} />;
    case "notice":
      return <NoticeCard data={data} />;
    default:
      return null;
  }
}
