import type { Repositories } from "@/data/repositories";

export function createAuditService(repos: Repositories) {
  return {
    log: (entry: { userId?: string | null; action: string; target?: string; details?: string }) => repos.audit.log(entry),
    list: (limit = 20) => repos.audit.list(limit),
  };
}
export type AuditService = ReturnType<typeof createAuditService>;
