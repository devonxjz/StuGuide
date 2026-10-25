"use client";

import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Coverage {
  area: string;
  label: string;
  count: number;
  percent: number;
}

/** Độ bao phủ 5 mảng phát triển của toàn trường (radar + thanh). */
export function DevelopmentChart({ data }: { data: Coverage[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>Độ bao phủ 5 mảng phát triển</CardTitle></CardHeader>
      <CardContent className="grid items-center gap-4 sm:grid-cols-2">
        <div className="h-64" role="img" aria-label={`Biểu đồ radar: ${data.map((d) => `${d.label} ${d.count} giáo án`).join(", ")}`}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data.map((d) => ({ ...d, short: d.label.replace(" & KNXH", "") }))} outerRadius="68%" margin={{ top: 14, right: 40, bottom: 14, left: 40 }}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="short" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
              <Radar dataKey="percent" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.3} />
              <Tooltip formatter={(_, __, item) => [`${(item.payload as Coverage).count} giáo án`, (item.payload as Coverage).label]} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <ul className="space-y-3">
          {data.map((d) => (
            <li key={d.area}>
              <div className="mb-1 flex justify-between text-sm"><span className="font-medium">{d.label}</span><span className="text-muted-foreground tabular-nums">{d.count} giáo án</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${d.percent}%` }} /></div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
