import { CheckCircle2, XCircle, Upload } from "lucide-react";
import type { NormalizedDataset } from "@/types/domain";
import type { ValidationResult } from "@/types/validation";
import { MINIMUM_VBR_VERSION } from "@/lib/constants";
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
import { BlockersList } from "./blockers-list";
import { JobTable } from "./job-table";
import { cn } from "@/lib/utils";

const SUMMARY_CARD =
  "animate-in fade-in border-b-2 shadow-sm transition-shadow duration-300 hover:shadow-md";
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
  const hasBlockers = validations.some(
    (v) => v.status === "fail" || v.status === "warning",
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 mx-auto max-w-5xl space-y-6 p-6 duration-500">
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
            versionOk ? "border-b-primary" : "border-b-destructive",
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
          className={cn(SUMMARY_CARD, "border-b-muted-foreground delay-100")}
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
            hasFail ? "border-b-destructive" : "border-b-primary",
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
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="jobs">Job Details</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          {hasBlockers ? (
            <BlockersList validations={validations} />
          ) : (
            <Card>
              <CardContent className="flex items-center gap-3 py-6">
                <CheckCircle2 className="text-primary size-6" />
                <div>
                  <p className="font-medium">All checks passed</p>
                  <p className="text-muted-foreground text-sm">
                    Your environment is ready for VDC Vault.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="jobs" className="mt-4">
          <JobTable jobs={data.jobInfo} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
