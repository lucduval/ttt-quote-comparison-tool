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
} from "lucide-react";

interface ComparisonResultProps {
  result: {
    summary: string;
    premiumComparison: {
      items?: Array<{
        insurer: string;
        monthlyPremium: string;
        annualPremium?: string;
      }>;
      difference?: string;
      cheapest?: string;
    };
    coverComparison: {
      features?: Array<{
        feature: string;
        values: Record<string, string>;
      }>;
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
    recommendation: string;
  };
}

export function ComparisonResult({ result }: ComparisonResultProps) {
  const insurerNames =
    result.premiumComparison.items?.map((i) => i.insurer) ?? [];

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
                      <p className="text-sm font-medium">{item.insurer}</p>
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

      {/* Cover Comparison */}
      {result.coverComparison.features &&
        result.coverComparison.features.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4" />
                Side-by-Side Cover Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[140px]">Feature</TableHead>
                      {insurerNames.map((name) => (
                        <TableHead key={name}>{name}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.coverComparison.features.map((feature, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium text-sm">
                          {feature.feature}
                        </TableCell>
                        {insurerNames.map((name) => (
                          <TableCell key={name} className="text-sm">
                            {feature.values[name] ?? "—"}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
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
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Scenario</TableHead>
                          {insurerNames.map((name) => (
                            <TableHead key={name}>{name}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.excessComparison.exampleScenarios.map(
                          (scenario, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-sm">
                                {scenario.scenario}
                              </TableCell>
                              {insurerNames.map((name) => (
                                <TableCell key={name} className="text-sm">
                                  {scenario.values[name] ?? "—"}
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
