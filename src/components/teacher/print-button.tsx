"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton({ label = "In / Lưu PDF" }: { label?: string }) {
  return (
    <Button onClick={() => window.print()} className="no-print">
      <Printer /> {label}
    </Button>
  );
}
