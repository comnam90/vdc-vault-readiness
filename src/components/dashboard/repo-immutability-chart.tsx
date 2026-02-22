import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { ImmutabilitySlice } from "@/lib/chart-selectors";

interface RepoImmutabilityChartProps {
  data: ImmutabilitySlice[];
}

export function RepoImmutabilityChart({ data }: RepoImmutabilityChartProps) {
  if (data.every((d) => d.count === 0)) return null;

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        Immutability Coverage
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={70}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v: number | undefined) =>
              v != null ? [v, "Repos"] : []
            }
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
