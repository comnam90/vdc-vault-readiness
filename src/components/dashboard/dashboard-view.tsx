import { CheckCircle2, XCircle, Upload } from "lucide-react";
import type { NormalizedDataset } from "@/types/domain";
import type { ValidationResult } from "@/types/validation";
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

const MINIMUM_VBR_VERSION = "12.1.2";

interface DashboardViewProps {
  data: NormalizedDataset;
  validations: ValidationResult[];
  onReset: () => void;
  defaultTab?: string;
}

export function DashboardView({
  data,
  validations,
  onReset,
  defaultTab = "overview",
}: DashboardViewProps) {
  const version = data.backupServer[0]?.Version ?? "Unknown";
  const versionOk =
    version !== "Unknown" && isVersionAtLeast(version, MINIMUM_VBR_VERSION);
  const totalJobs = data.jobInfo.length;
  const hasFail = validations.some((v) => v.status === "fail");
  const hasBlockers = validations.some(
    (v) => v.status === "fail" || v.status === "warning",
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
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
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>VBR Version</CardDescription>
            <CardTitle
              className={cn(
                "text-xl",
                versionOk ? "text-green-600" : "text-destructive",
              )}
            >
              {version}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {versionOk
                ? `Meets ${MINIMUM_VBR_VERSION}+ requirement`
                : `Requires ${MINIMUM_VBR_VERSION}+`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Jobs</CardDescription>
            <CardTitle className="text-xl">{totalJobs}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {data.jobInfo.filter((j) => j.Encrypted).length} encrypted,{" "}
              {data.jobInfo.filter((j) => !j.Encrypted).length} unencrypted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Readiness</CardDescription>
            <CardTitle className="flex items-center gap-2 text-xl">
              {hasFail ? (
                <>
                  <XCircle className="size-5 text-destructive" />
                  <span className="text-destructive">Action Required</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-5 text-green-600" />
                  <span className="text-green-600">Ready</span>
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {validations.filter((v) => v.status === "pass").length} of{" "}
              {validations.length} checks passed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab}>
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
                <CheckCircle2 className="size-6 text-green-600" />
                <div>
                  <p className="font-medium">All checks passed</p>
                  <p className="text-sm text-muted-foreground">
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
