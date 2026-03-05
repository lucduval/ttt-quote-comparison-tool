"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  DollarSign,
  Shield,
  AlertTriangle,
  FileWarning,
  ThumbsUp,
  AlertCircle,
  AlertOctagon,
} from "lucide-react";

interface PremiumItem {
  insurer: string;
  role?: string;
  monthlyPremium: string;
  annualPremium?: string;
}

interface CoverFeature {
  feature: string;
  values: Record<string, string>;
}

interface CoverSection {
  sectionName: string;
  features: CoverFeature[];
}

interface ShortfallGap {
  item: string;
  section: string;
  availableIn: string[];
  details: string;
}

interface ShortfallRisk {
  item: string;
  section: string;
  currentDetails: string;
  newQuoteDetails: string;
}

interface ComparisonResultProps {
  result: {
    summary: string;
    premiumComparison: {
      items?: PremiumItem[];
      difference?: string;
      cheapest?: string;
    };
    coverComparison: {
      // New section-based structure
      sections?: CoverSection[];
      // Legacy flat structure (backward compat)
      features?: CoverFeature[];
    };
    excessComparison: {
      insurers?: Record<
        string,
        {
          type?: string;
          details?: string[];
          notes?: string;
        }
      >;
      exampleScenarios?: Array<{
        scenario: string;
        values: Record<string, string>;
      }>;
      analysis?: string;
    };
    conditionsDifferences: {
      insurers?: Record<string, string[]>;
      analysis?: string;
    };
    shortfalls?: {
      gapsInCurrentCover?: ShortfallGap[];
      coverAtRisk?: ShortfallRisk[];
      analysis?: string;
    };
    recommendation: string;
  };
}

function CoverValue({ value }: { value: string }) {
  if (!value || value === "—") return <span className="text-muted-foreground">—</span>;

  const isNoCover =
    value.toLowerCase() === "no cover" ||
    value.toLowerCase() === "not included" ||
    value.toLowerCase() === "excluded";

  const isVerify = value.startsWith("⚠ VERIFY:");
  const displayValue = isVerify ? value.replace("⚠ VERIFY:", "").trim() : value;

  if (isNoCover) {
    return (
      <Badge variant="destructive" className="text-xs font-normal">
        No Cover
      </Badge>
    );
  }

  if (isVerify) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span>{displayValue}</span>
        <span
          className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
          title="This value could not be clearly read from the document — please verify"
        >
          <AlertOctagon className="h-2.5 w-2.5" />
          Verify
        </span>
      </span>
    );
  }

  return <span>{value}</span>;
}

export function ComparisonResult({ result }: ComparisonResultProps) {
  const insurerNames =
    result.premiumComparison.items?.map((i) => i.insurer) ?? [];

  // Normalise cover comparison: handle both section-based and legacy flat formats
  const coverSections: CoverSection[] = result.coverComparison.sections?.length
    ? result.coverComparison.sections
    : result.coverComparison.features?.length
      ? [{ sectionName: "Cover Comparison", features: result.coverComparison.features }]
      : [];

  const hasShortfalls =
    result.shortfalls &&
    ((result.shortfalls.gapsInCurrentCover?.length ?? 0) > 0 ||
      (result.shortfalls.coverAtRisk?.length ?? 0) > 0 ||
      !!result.shortfalls.analysis);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardContent className="p-6">
          <p className="text-sm leading-relaxed text-foreground">
            {result.summary}
          </p>
        </CardContent>
      </Card>

      {/* Shortfalls — shown prominently when a current policy baseline was used */}
      {hasShortfalls && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Cover Shortfall Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Gaps: cover in new quotes that client does NOT currently have */}
            {result.shortfalls!.gapsInCurrentCover &&
              result.shortfalls!.gapsInCurrentCover.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">Gaps in Current Cover</p>
                    <Badge variant="outline" className="text-xs border-amber-400 text-amber-600">
                      Client currently missing
                    </Badge>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {result.shortfalls!.gapsInCurrentCover.map((gap, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-1"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium">{gap.item}</p>
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {gap.section}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{gap.details}</p>
                        {gap.availableIn?.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Available in:{" "}
                            <span className="font-medium">
                              {gap.availableIn.join(", ")}
                            </span>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Cover at risk: current policy has cover that new quote may not */}
            {result.shortfalls!.coverAtRisk &&
              result.shortfalls!.coverAtRisk.length > 0 && (
                <div className="space-y-3">
                  {result.shortfalls!.gapsInCurrentCover?.length ? (
                    <Separator />
                  ) : null}
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">Cover at Risk</p>
                    <Badge variant="outline" className="text-xs border-red-400 text-red-600">
                      May be lost on switch
                    </Badge>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {result.shortfalls!.coverAtRisk.map((risk, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium">{risk.item}</p>
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {risk.section}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium">Current: </span>
                            {risk.currentDetails}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium">New quote: </span>
                            {risk.newQuoteDetails}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {result.shortfalls!.analysis && (
              <>
                <Separator />
                <p className="text-sm text-muted-foreground">
                  {result.shortfalls!.analysis}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Premium Comparison */}
      {result.premiumComparison.items &&
        result.premiumComparison.items.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-4 w-4" />
                Premium Comparison
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {result.premiumComparison.items.map((item) => (
                  <div
                    key={item.insurer}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{item.insurer}</p>
                        {item.role && (
                          <Badge
                            variant={item.role === "Current Policy" ? "secondary" : "outline"}
                            className="text-xs"
                          >
                            {item.role}
                          </Badge>
                        )}
                      </div>
                      {item.annualPremium && item.annualPremium !== "N/A" && (
                        <p className="text-xs text-muted-foreground">
                          {item.annualPremium}/year
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold">
                        {item.monthlyPremium}
                      </p>
                      <p className="text-xs text-muted-foreground">/month</p>
                    </div>
                  </div>
                ))}
              </div>
              {result.premiumComparison.difference && (
                <p className="text-sm text-muted-foreground">
                  {result.premiumComparison.difference}
                </p>
              )}
              {result.premiumComparison.cheapest && (
                <Badge variant="secondary" className="text-xs">
                  Cheapest: {result.premiumComparison.cheapest}
                </Badge>
              )}
            </CardContent>
          </Card>
        )}

      {/* Cover Comparison — section-based */}
      {coverSections.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" />
              Side-by-Side Cover Comparison
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {coverSections.map((section, si) => (
              <div key={si} className="space-y-2">
                {coverSections.length > 1 && (
                  <>
                    {si > 0 && <Separator className="my-2" />}
                    <p className="text-sm font-semibold pt-1">{section.sectionName}</p>
                  </>
                )}
                <div className="overflow-x-auto">
                  <Table className="w-full table-fixed">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px] whitespace-normal">Feature</TableHead>
                        {insurerNames.map((name) => (
                          <TableHead key={name} className="whitespace-normal">{name}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {section.features.map((feature, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium text-sm align-top whitespace-normal break-words">
                            {feature.feature}
                          </TableCell>
                          {insurerNames.map((name) => (
                            <TableCell key={name} className="text-sm align-top whitespace-normal break-words">
                              <CoverValue value={feature.values[name] ?? "—"} />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Excess Comparison */}
      {result.excessComparison.insurers && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4" />
              Excess Structure (Critical Difference)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {Object.entries(result.excessComparison.insurers).map(
                ([insurer, data]) => (
                  <div key={insurer} className="rounded-lg border p-4 space-y-2">
                    <p className="font-medium text-sm">{insurer}</p>
                    {data.type && (
                      <Badge variant="outline" className="text-xs">
                        {data.type}
                      </Badge>
                    )}
                    {data.details && (
                      <ul className="space-y-1">
                        {data.details.map((detail, i) => (
                          <li
                            key={i}
                            className="text-sm text-muted-foreground flex items-start gap-2"
                          >
                            <span className="mt-1.5 h-1 w-1 rounded-full bg-muted-foreground shrink-0" />
                            {detail}
                          </li>
                        ))}
                      </ul>
                    )}
                    {data.notes && (
                      <p className="text-xs text-muted-foreground italic mt-2">
                        {data.notes}
                      </p>
                    )}
                  </div>
                )
              )}
            </div>

            {/* Example Scenarios */}
            {result.excessComparison.exampleScenarios &&
              result.excessComparison.exampleScenarios.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium mb-3">
                      Example Scenarios
                    </p>
                    <div className="overflow-x-auto">
                      <Table className="w-full table-fixed">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[180px] whitespace-normal">Scenario</TableHead>
                            {insurerNames.map((name) => (
                              <TableHead key={name} className="whitespace-normal">{name}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {result.excessComparison.exampleScenarios.map(
                            (scenario, i) => (
                              <TableRow key={i}>
                                <TableCell className="text-sm align-top whitespace-normal break-words">
                                  {scenario.scenario}
                                </TableCell>
                                {insurerNames.map((name) => (
                                  <TableCell key={name} className="text-sm align-top whitespace-normal break-words">
                                    <CoverValue value={scenario.values[name] ?? "—"} />
                                  </TableCell>
                                ))}
                              </TableRow>
                            )
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </>
              )}

            {result.excessComparison.analysis && (
              <p className="text-sm text-muted-foreground">
                {result.excessComparison.analysis}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Conditions Differences */}
      {result.conditionsDifferences.insurers && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileWarning className="h-4 w-4" />
              Important Conditions Differences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {Object.entries(result.conditionsDifferences.insurers).map(
                ([insurer, conditions]) => (
                  <div key={insurer} className="rounded-lg border p-4 space-y-2">
                    <p className="font-medium text-sm">{insurer}</p>
                    <ul className="space-y-1">
                      {conditions.map((condition, i) => (
                        <li
                          key={i}
                          className="text-sm text-muted-foreground flex items-start gap-2"
                        >
                          <span className="mt-1.5 h-1 w-1 rounded-full bg-muted-foreground shrink-0" />
                          {condition}
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              )}
            </div>
            {result.conditionsDifferences.analysis && (
              <p className="text-sm text-muted-foreground">
                {result.conditionsDifferences.analysis}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recommendation */}
      {result.recommendation && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ThumbsUp className="h-4 w-4" />
              Professional Recommendation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed whitespace-pre-line">
              {result.recommendation}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
