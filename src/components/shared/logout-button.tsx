"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";

export function LogoutButton() {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        await api("/api/auth/logout", { method: "POST", body: {} });
        router.push("/login");
      }}
    >
      <LogOut /> <span className="hidden sm:inline">Đăng xuất</span>
    </Button>
  );
}
