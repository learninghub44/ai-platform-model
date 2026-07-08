"use client";

import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface UsageRow {
  day: string;
  calls: number;
}

export function UsageChart({ data }: { data: UsageRow[] }) {
  const chartData = data.map((d) => ({
    day: new Date(d.day).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    calls: d.calls,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="usageFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
        <XAxis dataKey="day" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis fontSize={11} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value) => [`${value}`, "AI calls"]}
        />
        <Area
          type="monotone"
          dataKey="calls"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          fill="url(#usageFill)"
          animationDuration={600}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
