import { type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts";
import { Layers, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatTB } from "@/lib/format-utils";
import type { GrowthSeriesPoint } from "@/lib/growth-projector";

const CHART_HEIGHT = 350;

interface ChartSegment {
  dataKey: keyof Omit<GrowthSeriesPoint, "name" | "total">;
  name: string;
  color: string;
  rounded?: boolean;
}

const SEGMENTS: ChartSegment[] = [
  { dataKey: "yearly", name: "Yearly", color: "var(--chart-5)" },
  { dataKey: "monthly", name: "Monthly", color: "var(--chart-3)" },
  { dataKey: "weekly", name: "Weekly", color: "var(--chart-2)" },
  { dataKey: "daily", name: "Daily", color: "var(--chart-1)" },
  {
    dataKey: "immutability",
    name: "Immutability",
    color: "var(--chart-4)",
    rounded: true,
  },
];

export interface GrowthChartProps {
  data: GrowthSeriesPoint[] | null;
  isLoading?: boolean;
  error?: string | null;
  /** Read-only label showing which simulation mode produced the data. */
  greenfield: boolean;
  /**
   * Years of pre-existing backups seeded into the projection on Day 1. Only
   * surfaced as a contextual note when `greenfield` is true and value > 0.
   */
  historicalDataYears?: number;
}

export function GrowthChart({
  data,
  isLoading = false,
  error = null,
  greenfield,
  historicalDataYears = 0,
}: GrowthChartProps) {
  const isMonthlyScale = data?.[0]?.name?.startsWith("Month ") ?? false;
  const showSeedNote = greenfield && historicalDataYears > 0;
  return (
    <ChartShell greenfield={greenfield} isMonthlyScale={isMonthlyScale}>
      {showSeedNote && (
        <HistoricalSeedNote
          historicalDataYears={historicalDataYears}
          isMonthlyScale={isMonthlyScale}
        />
      )}
      <ChartBody data={data} isLoading={isLoading} error={error} />
    </ChartShell>
  );
}

function ChartShell({
  greenfield,
  isMonthlyScale,
  children,
}: {
  greenfield: boolean;
  isMonthlyScale: boolean;
  children: ReactNode;
}) {
  return (
    <Card
      className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 fill-mode-backwards duration-500"
      data-testid="growth-chart-card"
    >
      <CardHeader>
        <CardTitle>Projected Storage Growth</CardTitle>
        <CardDescription>
          {chartDescription(greenfield, isMonthlyScale)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function chartDescription(greenfield: boolean, isMonthlyScale: boolean) {
  if (isMonthlyScale) {
    return greenfield
      ? "Greenfield: GFS retention chain builds up month over month."
      : "Seeded: full retention chain from day 1; bars project monthly across the cap horizon.";
  }
  return greenfield
    ? "Greenfield: source data and GFS retention chain build up year over year."
    : "Seeded: full retention chain from day 1; only source data grows.";
}

function HistoricalSeedNote({
  historicalDataYears,
  isMonthlyScale,
}: {
  historicalDataYears: number;
  isMonthlyScale: boolean;
}) {
  const unit = historicalDataYears === 1 ? "year" : "years";
  const stepLabel = isMonthlyScale ? "Month 1" : "Year 1";
  return (
    <div
      data-testid="historical-seed-note"
      className="border-border/70 bg-muted/40 text-muted-foreground motion-safe:animate-in motion-safe:fade-in fill-mode-backwards flex items-center gap-2.5 rounded-md border border-dashed px-3 py-2 text-xs duration-300"
    >
      <Layers
        className="text-foreground/70 size-3.5 shrink-0"
        aria-hidden="true"
      />
      <p>
        <span className="text-foreground font-semibold tabular-nums">
          {stepLabel}
        </span>{" "}
        starts with{" "}
        <span className="text-foreground font-semibold tabular-nums">
          {historicalDataYears} {unit}
        </span>{" "}
        of existing backups already seeded on the Vault.
      </p>
    </div>
  );
}

function ChartBody({
  data,
  isLoading,
  error,
}: {
  data: GrowthSeriesPoint[] | null;
  isLoading: boolean;
  error: string | null;
}) {
  if (isLoading) {
    return (
      <div
        className="text-muted-foreground flex h-[350px] items-center justify-center gap-2 text-sm"
        role="status"
        aria-live="polite"
      >
        <Loader2
          className="size-4 motion-safe:animate-spin"
          aria-hidden="true"
        />
        Projecting storage growth…
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="text-muted-foreground flex h-[350px] items-center justify-center text-sm"
        role="alert"
      >
        {error}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-muted-foreground flex h-[350px] items-center justify-center text-sm italic">
        No projection available.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <BarChart data={data} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          vertical={false}
        />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={(val: number) => `${val.toFixed(1)} TB`}
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          width={80}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.3 }}
          content={GrowthTooltip}
        />
        <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "20px" }} />
        {SEGMENTS.map((seg) => (
          <Bar
            key={seg.dataKey}
            dataKey={seg.dataKey}
            name={seg.name}
            stackId="a"
            fill={seg.color}
            radius={seg.rounded ? [4, 4, 0, 0] : undefined}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function GrowthTooltip(props: TooltipContentProps<number, string>) {
  const { active, payload, label } = props;
  if (!active || !payload || payload.length === 0) return null;

  // recharts hands us the original row object on each payload entry;
  // grab `total` from the first one to render a Total row.
  const firstPayload = payload[0]?.payload as GrowthSeriesPoint | undefined;
  const total = firstPayload?.total ?? 0;

  return (
    <div className="bg-popover text-popover-foreground rounded-md border p-3 text-xs shadow-md">
      <p className="mb-2 font-semibold">{label}</p>
      <ul className="space-y-1">
        {payload.map((entry) => {
          const value =
            typeof entry.value === "number"
              ? `${entry.value.toFixed(2)} TB`
              : "—";
          return (
            <li
              key={entry.dataKey as string}
              className="flex items-center gap-2"
            >
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground flex-1">{entry.name}</span>
              <span className="font-mono tabular-nums">{value}</span>
            </li>
          );
        })}
      </ul>
      <div className="border-border/60 mt-2 flex items-center gap-2 border-t pt-2 font-semibold">
        <span className="flex-1">Total</span>
        <span className="font-mono tabular-nums">{formatTB(total)}</span>
      </div>
    </div>
  );
}
