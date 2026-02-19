import { useState } from "react";
import type {
  SafeJob,
  SafeSobr,
  SafeCapExtent,
  SafeArchExtent,
} from "@/types/domain";
import { deriveStandardRepos } from "@/lib/repo-aggregator";
import { formatTB } from "@/lib/format-utils";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SobrDetailSheet } from "./sobr-detail-sheet";

interface RepositoriesTabProps {
  jobs: SafeJob[];
  sobr: SafeSobr[];
  capExtents: SafeCapExtent[];
  archExtents: SafeArchExtent[];
}

export function RepositoriesTab({
  jobs,
  sobr,
  capExtents,
  archExtents,
}: RepositoriesTabProps) {
  const [selectedSobr, setSelectedSobr] = useState<SafeSobr | null>(null);
  const standardRepos = deriveStandardRepos(jobs);

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in space-y-8 duration-300">
      {/* Standard Repositories */}
      <section className="space-y-3">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Standard Repositories
        </h2>
        {standardRepos.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No repositories found.
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    Repository
                  </TableHead>
                  <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    Jobs
                  </TableHead>
                  <TableHead className="text-muted-foreground text-right text-xs font-semibold tracking-wide uppercase">
                    Source Data
                  </TableHead>
                  <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    Encrypted
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {standardRepos.map((repo) => (
                  <TableRow key={repo.repoName}>
                    <TableCell className="font-medium">
                      {repo.repoName}
                    </TableCell>
                    <TableCell>{repo.jobCount}</TableCell>
                    <TableCell className="text-right font-mono">
                      {repo.totalSourceTB !== null
                        ? formatTB(repo.totalSourceTB)
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      {repo.allEncrypted ? (
                        <Badge
                          variant="outline"
                          className="border-primary/30 bg-primary/5 text-primary"
                        >
                          Yes
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-destructive/30 bg-destructive/5 text-destructive"
                        >
                          No
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* SOBR Repositories */}
      {sobr.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Scale-Out Repositories
          </h2>
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    Name
                  </TableHead>
                  <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    Capacity Tier
                  </TableHead>
                  <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    Archive Tier
                  </TableHead>
                  <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    Immutability
                  </TableHead>
                  <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    Extents
                  </TableHead>
                  <TableHead className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    Jobs
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sobr.map((s) => (
                  <TableRow
                    key={s.Name}
                    role="button"
                    tabIndex={0}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setSelectedSobr(s)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedSobr(s);
                      }
                    }}
                  >
                    <TableCell className="font-medium">{s.Name}</TableCell>
                    <TableCell>
                      {s.EnableCapacityTier ? (
                        <Badge
                          variant="outline"
                          className="border-primary/30 bg-primary/5 text-primary"
                        >
                          Yes
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-muted-foreground"
                        >
                          No
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {s.ArchiveTierEnabled ? (
                        <Badge
                          variant="outline"
                          className="border-primary/30 bg-primary/5 text-primary"
                        >
                          Yes
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-muted-foreground"
                        >
                          No
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {s.ImmutableEnabled ? (
                        <Badge
                          variant="outline"
                          className="border-primary/30 bg-primary/5 text-primary"
                        >
                          {s.ImmutablePeriod != null
                            ? `${s.ImmutablePeriod}d`
                            : "Yes"}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-destructive/30 bg-destructive/5 text-destructive"
                        >
                          No
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{s.ExtentCount ?? "N/A"}</TableCell>
                    <TableCell>{s.JobCount ?? "N/A"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      <SobrDetailSheet
        sobr={selectedSobr}
        capExtents={capExtents.filter(
          (e) => selectedSobr && e.SobrName === selectedSobr.Name,
        )}
        archExtents={archExtents.filter(
          (e) => selectedSobr && e.SobrName === selectedSobr.Name,
        )}
        open={selectedSobr !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedSobr(null);
        }}
      />
    </div>
  );
}
