import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Loader2 } from "lucide-react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  generateGrowthSeries,
  type GenerateGrowthSeriesArgs,
  type GrowthSeriesPoint,
} from "@/lib/growth-projector";

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

export interface GrowthChartProps extends GenerateGrowthSeriesArgs {
  greenfieldSimulation: boolean;
  onGreenfieldChange: (next: boolean) => void;
}

export function GrowthChart(props: GrowthChartProps) {
  const { greenfieldSimulation, onGreenfieldChange, ...args } = props;
  if (args.jobs.length === 0) {
    return (
      <ChartShell
        greenfieldSimulation={greenfieldSimulation}
        onGreenfieldChange={onGreenfieldChange}
      >
        <div className="text-muted-foreground flex h-[350px] items-center justify-center text-sm italic">
          Add backup jobs to see projection.
        </div>
      </ChartShell>
    );
  }
  return (
    <GrowthChartFetcher
      args={args}
      greenfieldSimulation={greenfieldSimulation}
      onGreenfieldChange={onGreenfieldChange}
    />
  );
}

interface ChartShellProps {
  greenfieldSimulation: boolean;
  onGreenfieldChange: (next: boolean) => void;
  children: ReactNode;
}

function ChartShell({
  greenfieldSimulation,
  onGreenfieldChange,
  children,
}: ChartShellProps) {
  return (
    <Card
      className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 fill-mode-backwards duration-500"
      data-testid="growth-chart-card"
    >
      <CardHeader>
        <CardTitle>Projected Storage Growth</CardTitle>
        <CardDescription>
          {greenfieldSimulation
            ? "Greenfield: source data and GFS retention chain build up year over year."
            : "Seeded: full retention chain from day 1; only source data grows."}
        </CardDescription>
        <CardAction>
          <Label
            htmlFor="growth-chart-greenfield"
            className="text-muted-foreground flex cursor-pointer items-center gap-2 text-xs font-normal"
          >
            Greenfield
            <Switch
              id="growth-chart-greenfield"
              size="sm"
              checked={greenfieldSimulation}
              onCheckedChange={onGreenfieldChange}
              aria-label="Simulate greenfield environment"
            />
          </Label>
        </CardAction>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

interface FetchState {
  data: GrowthSeriesPoint[] | null;
  loading: boolean;
  error: string | null;
}

interface GrowthChartFetcherProps {
  args: GenerateGrowthSeriesArgs;
  greenfieldSimulation: boolean;
  onGreenfieldChange: (next: boolean) => void;
}

function GrowthChartFetcher({
  args,
  greenfieldSimulation,
  onGreenfieldChange,
}: GrowthChartFetcherProps) {
  // Initialize loading=true so we don't need a synchronous setState in the
  // effect to flip it. Subsequent fetches keep prior data visible (a stale-
  // while-revalidate pattern) while the new request is in flight.
  const [state, setState] = useState<FetchState>({
    data: null,
    loading: true,
    error: null,
  });
  const requestIdRef = useRef(0);

  const {
    jobs,
    sessions,
    excludedJobNames,
    jobCount,
    vbrVersion,
    productVersionOverride,
    settings,
  } = args;

  useEffect(() => {
    const id = ++requestIdRef.current;
    let cancelled = false;
    generateGrowthSeries({
      jobs,
      sessions,
      excludedJobNames,
      settings,
      jobCount,
      vbrVersion,
      productVersionOverride,
    })
      .then((data) => {
        if (cancelled || id !== requestIdRef.current) return;
        setState({ data, loading: false, error: null });
      })
      .catch(() => {
        if (cancelled || id !== requestIdRef.current) return;
        setState({
          data: null,
          loading: false,
          error: "Could not project storage growth. Try again later.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [
    jobs,
    sessions,
    excludedJobNames,
    settings,
    jobCount,
    vbrVersion,
    productVersionOverride,
  ]);

  return (
    <ChartShell
      greenfieldSimulation={greenfieldSimulation}
      onGreenfieldChange={onGreenfieldChange}
    >
      <ChartBody state={state} />
    </ChartShell>
  );
}

function ChartBody({ state }: { state: FetchState }) {
  if (state.loading) {
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

  if (state.error) {
    return (
      <div
        className="text-muted-foreground flex h-[350px] items-center justify-center text-sm"
        role="alert"
      >
        {state.error}
      </div>
    );
  }

  if (!state.data || state.data.length === 0) {
    return (
      <div className="text-muted-foreground flex h-[350px] items-center justify-center text-sm italic">
        No projection available.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <BarChart
        data={state.data}
        margin={{ top: 20, right: 0, left: 0, bottom: 0 }}
      >
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
          contentStyle={{
            backgroundColor: "var(--popover)",
            color: "var(--popover-foreground)",
            border: "1px solid var(--border)",
            borderRadius: "0.5rem",
            fontSize: "12px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
          labelStyle={{ fontWeight: 600, marginBottom: 4 }}
          itemStyle={{ padding: 0 }}
          formatter={(value: number | undefined, name: string | undefined) => [
            value != null ? `${value.toFixed(2)} TB` : "—",
            name ?? "",
          ]}
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
