import { useMemo, useState } from "react";
import { CheckCircle2, XCircle, Upload } from "lucide-react";
import type { NormalizedDataset } from "@/types/domain";
import type { ValidationResult } from "@/types/validation";
import { MINIMUM_VBR_VERSION } from "@/lib/constants";
import { enrichJobs } from "@/lib/enrich-jobs";
import { getBlockerValidations } from "@/lib/validation-selectors";
import { isVersionAtLeast } from "@/lib/version-compare";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalculatorInputs } from "@/components/dashboard/calculator-inputs";
import { BlockersList } from "./blockers-list";
import { JobTable } from "./job-table";
import { PassingChecksList } from "./passing-checks-list";
import { SuccessCelebration } from "./success-celebration";
import { cn } from "@/lib/utils";

const SUMMARY_CARD =
  "motion-safe:animate-in motion-safe:fade-in fill-mode-backwards ease-[var(--ease-out)] border-b-4 shadow-sm transition-shadow duration-300 hover:shadow-md";
const CARD_LABEL =
  "text-muted-foreground text-xs font-semibold tracking-wide uppercase";

interface DashboardViewProps {
  data: NormalizedDataset;
  validations: ValidationResult[];
  onReset: () => void;
}

export function DashboardView({
  data,
  validations,
  onReset,
}: DashboardViewProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [excludedJobNames, setExcludedJobNames] = useState<Set<string>>(
    new Set(),
  );
  const enrichedJobs = useMemo(
    () => enrichJobs(data.jobInfo, data.jobSessionSummary),
    [data.jobInfo, data.jobSessionSummary],
  );
  const backupServers = data.backupServer ?? [];
  const knownVersions = backupServers
    .map((server) => server?.Version)
    .filter((v): v is string => Boolean(v));

  const version =
    knownVersions.length > 0
      ? knownVersions.reduce((oldest, current) =>
          isVersionAtLeast(oldest, current) ? current : oldest,
        )
      : "Unknown";

  const versionOk =
    knownVersions.length > 0 &&
    backupServers.every(
      (server) =>
        !!server?.Version &&
        isVersionAtLeast(server.Version, MINIMUM_VBR_VERSION),
    );
  const totalJobs = data.jobInfo.length;
  const hasFail = validations.some((v) => v.status === "fail");
  const allChecksPass = validations.every((v) => v.status === "pass");
  const blockers = getBlockerValidations(validations);
  const hasBlockers = blockers.length > 0;

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 mx-auto w-full max-w-5xl space-y-6 p-6 duration-400 ease-[var(--ease-out)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">
            VDC Vault Readiness
          </h1>
          <Badge variant="secondary">Scan Complete</Badge>
        </div>
        <Button variant="outline" size="sm" onClick={onReset}>
          <Upload className="size-4" />
          Upload New
        </Button>
      </div>

      <Separator />

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card
          className={cn(
            SUMMARY_CARD,
            versionOk
              ? "border-b-primary bg-card-tint-success"
              : "border-b-destructive bg-card-tint-destructive",
          )}
        >
          <CardHeader className="pb-2">
            <CardDescription className={CARD_LABEL}>
              VBR Version
            </CardDescription>
            <CardTitle
              className={cn(
                "font-mono text-2xl font-semibold",
                versionOk ? "text-primary" : "text-destructive",
              )}
            >
              {version}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-xs">
              {versionOk
                ? `Meets ${MINIMUM_VBR_VERSION}+ requirement`
                : `Requires ${MINIMUM_VBR_VERSION}+`}
            </p>
          </CardContent>
        </Card>

        <Card
          className={cn(
            SUMMARY_CARD,
            "border-b-muted-foreground bg-card-tint-neutral delay-100",
          )}
        >
          <CardHeader className="pb-2">
            <CardDescription className={CARD_LABEL}>Total Jobs</CardDescription>
            <CardTitle className="font-mono text-2xl font-semibold">
              {totalJobs}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-xs">
              {data.jobInfo.filter((j) => j.Encrypted).length} encrypted,{" "}
              {data.jobInfo.filter((j) => !j.Encrypted).length} unencrypted
            </p>
          </CardContent>
        </Card>

        <Card
          className={cn(
            SUMMARY_CARD,
            "delay-200",
            hasFail
              ? "border-b-destructive bg-card-tint-destructive"
              : "border-b-primary bg-card-tint-success",
            allChecksPass && "ring-primary/20 ring-2",
          )}
        >
          <CardHeader className="pb-2">
            <CardDescription className={CARD_LABEL}>Readiness</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl font-semibold">
              {hasFail ? (
                <>
                  <XCircle className="text-destructive size-5" />
                  <span className="text-destructive">Action Required</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="text-primary size-5" />
                  <span className="text-primary">Ready</span>
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-xs">
              {validations.filter((v) => v.status === "pass").length} of{" "}
              {validations.length} checks passed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="jobs">Job Details</TabsTrigger>
          <TabsTrigger value="sizing">Sizing</TabsTrigger>
          <TabsTrigger value="repositories">Repositories</TabsTrigger>
        </TabsList>

        <TabsContent
          value="overview"
          className="motion-safe:data-[state=active]:animate-in motion-safe:data-[state=active]:fade-in mt-4 space-y-6 motion-safe:data-[state=active]:duration-150"
        >
          {hasBlockers ? (
            <>
              <BlockersList blockers={blockers} />
              <PassingChecksList
                validations={validations}
                blockerCount={blockers.length}
              />
            </>
          ) : (
            <SuccessCelebration
              checksCount={validations.length}
              onViewDetails={() => setActiveTab("jobs")}
            />
          )}
        </TabsContent>

        <TabsContent
          value="jobs"
          className="motion-safe:data-[state=active]:animate-in motion-safe:data-[state=active]:fade-in mt-4 motion-safe:data-[state=active]:duration-150"
        >
          <JobTable
            jobs={enrichedJobs}
            excludedJobNames={excludedJobNames}
            onExcludedChange={setExcludedJobNames}
          />
        </TabsContent>

        <TabsContent
          value="sizing"
          className="motion-safe:data-[state=active]:animate-in motion-safe:data-[state=active]:fade-in mt-4 motion-safe:data-[state=active]:duration-150"
        >
          <CalculatorInputs data={data} excludedJobNames={excludedJobNames} />
        </TabsContent>

        <TabsContent
          value="repositories"
          className="motion-safe:data-[state=active]:animate-in motion-safe:data-[state=active]:fade-in mt-4 motion-safe:data-[state=active]:duration-150"
        >
          <p className="text-muted-foreground text-sm">
            Repositories tab — coming soon.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
