import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { EnrichedJob } from "@/types/enriched-job";
import { groupByJobType, bucketChangeRates } from "@/lib/chart-selectors";
import { CARD_LABEL } from "@/lib/constants";
import { formatTooltipTB } from "@/lib/format-utils";

interface JobsChartsProps {
  jobs: EnrichedJob[];
}

const CHART_HEIGHT = 200;

export function JobsCharts({ jobs }: JobsChartsProps) {
  if (jobs.length === 0) return null;

  const sessions = jobs
    .filter((j) => j.sessionData != null)
    .map((j) => j.sessionData!);

  const byType = groupByJobType(jobs);
  const changeRateBuckets = bucketChangeRates(jobs, sessions);

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="space-y-2">
        <p className={CARD_LABEL}>Source Size by Job Type</p>
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart
            data={byType}
            layout="vertical"
            margin={{ left: 8, right: 16 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={(v: number) => `${v.toFixed(1)} TB`}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              type="category"
              dataKey="jobType"
              width={120}
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

      <div className="space-y-2">
        <p className={CARD_LABEL}>Change Rate Distribution</p>
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart data={changeRateBuckets} margin={{ left: 8, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(v: number | undefined) =>
                v != null ? [v, "Jobs"] : []
              }
            />
            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
              {changeRateBuckets.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
