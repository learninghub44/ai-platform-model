"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface RevenueRow {
  day: string;
  total_kobo: number;
}

export function RevenueChart({ data }: { data: RevenueRow[] }) {
  const chartData = data
    .map((d) => ({
      day: new Date(d.day).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      revenue: d.total_kobo / 100,
    }))
    .reverse();

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
        <XAxis dataKey="day" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis fontSize={11} tickLine={false} axisLine={false} width={40} />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value) => [`${Number(value ?? 0).toLocaleString()}`, "Revenue"]}
        />
        <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
