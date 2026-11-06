"use client";


import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export function PrintButton({ label = "In / Lưu PDF" }: { label?: string }) {
  return (
    <Button onClick={() => window.print()} className="no-print">
      <Printer /> {label}
    </Button>
  );
}
