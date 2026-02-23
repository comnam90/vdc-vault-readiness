import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { RepoChartDatum } from "@/lib/chart-selectors";
import { CARD_LABEL } from "@/lib/constants";
import { formatTooltipTB } from "@/lib/format-utils";

interface RepoSizeChartProps {
  data: RepoChartDatum[];
}

export function RepoSizeChart({ data }: RepoSizeChartProps) {
  if (data.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className={CARD_LABEL}>Source Size by Repository (Top 5)</p>
      <ResponsiveContainer
        width="100%"
        height={Math.max(160, data.length * 36)}
      >
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(v: number) => `${v.toFixed(1)} TB`}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            type="category"
            dataKey="repoName"
            width={140}
            tick={{ fontSize: 11 }}
          />
          <Tooltip formatter={formatTooltipTB} />
          <Bar
            dataKey="totalTB"
            fill="var(--color-primary)"
            radius={[0, 3, 3, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
