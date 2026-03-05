"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  PlusCircle,
  MinusCircle,
  AlertTriangle,
  ThumbsUp,
  ArrowUpDown,
} from "lucide-react";

interface PremiumChange {
  previous: string;
  renewed: string;
  changePercent: string;
  annualPrevious?: string;
  annualRenewed?: string;
  note: string;
}

interface ExcessChange {
  section: string;
  item: string;
  previous: string;
  renewed: string;
  direction: "increased" | "decreased" | "changed";
}

interface SumInsuredChange {
  section: string;
  item: string;
  previous: string;
  renewed: string;
  direction: "increased" | "decreased";
}

interface CoverAdded {
  item: string;
  section: string;
  details: string;
}

interface CoverRemoved {
  item: string;
  section: string;
  details: string;
}

interface CoverChanged {
  item: string;
  section: string;
  previous: string;
  renewed: string;
  direction: "increased" | "decreased" | "changed";
}

interface ConditionChanged {
  item: string;
  section: string;
  previous?: string;
  renewed: string;
}

interface RenewalChanges {
  summary: string;
  premiumChange?: PremiumChange;
  excessChanges?: ExcessChange[];
  sumInsuredChanges?: SumInsuredChange[];
  coverAdded?: CoverAdded[];
  coverRemoved?: CoverRemoved[];
  coverChanged?: CoverChanged[];
  conditionsChanged?: ConditionChanged[];
  recommendation?: string;
  emailDraft?: string;
}

interface RenewalResultProps {
  renewalChanges: RenewalChanges;
}

function DirectionBadge({ direction }: { direction: string }) {
  if (direction === "increased") {
    return (
      <Badge className="text-xs shrink-0 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border-0">
        <TrendingUp className="h-3 w-3 mr-1" />
        Increased
      </Badge>
    );
  }
  if (direction === "decreased") {
    return (
      <Badge className="text-xs shrink-0 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 border-0">
        <TrendingDown className="h-3 w-3 mr-1" />
        Decreased
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-xs shrink-0">
      <ArrowUpDown className="h-3 w-3 mr-1" />
      Changed
    </Badge>
  );
}

function ChangeRow({
  label,
  section,
  previous,
  renewed,
  direction,
}: {
  label: string;
  section: string;
  previous: string;
  renewed: string;
  direction: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium">{label}</p>
          <Badge variant="outline" className="text-xs">
            {section}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="line-through opacity-60">{previous}</span>
          <Minus className="h-3 w-3 shrink-0" />
          <span className="font-medium text-foreground">{renewed}</span>
        </div>
      </div>
      <DirectionBadge direction={direction} />
    </div>
  );
}

export function RenewalResult({ renewalChanges: r }: RenewalResultProps) {
  const hasExcessChanges = (r.excessChanges?.length ?? 0) > 0;
  const hasSumInsuredChanges = (r.sumInsuredChanges?.length ?? 0) > 0;
  const hasCoverAdded = (r.coverAdded?.length ?? 0) > 0;
  const hasCoverRemoved = (r.coverRemoved?.length ?? 0) > 0;
  const hasCoverChanged = (r.coverChanged?.length ?? 0) > 0;
  const hasConditionsChanged = (r.conditionsChanged?.length ?? 0) > 0;

  const noChanges =
    !hasExcessChanges &&
    !hasSumInsuredChanges &&
    !hasCoverAdded &&
    !hasCoverRemoved &&
    !hasCoverChanged &&
    !hasConditionsChanged;

  // Determine premium change direction for styling
  const premiumUp =
    r.premiumChange?.changePercent?.startsWith("+") ?? false;
  const premiumDown =
    r.premiumChange?.changePercent?.startsWith("-") ?? false;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardContent className="p-6">
          <p className="text-sm leading-relaxed text-foreground">{r.summary}</p>
        </CardContent>
      </Card>

      {/* Premium Change */}
      {r.premiumChange && (
        <Card
          className={
            premiumUp
              ? "border-red-200 dark:border-red-800"
              : premiumDown
                ? "border-green-200 dark:border-green-800"
                : ""
          }
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              {premiumUp ? (
                <TrendingUp className="h-4 w-4 text-red-500" />
              ) : premiumDown ? (
                <TrendingDown className="h-4 w-4 text-green-500" />
              ) : (
                <ArrowUpDown className="h-4 w-4" />
              )}
              Premium Change
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div className="rounded-lg border p-4 space-y-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Previous Premium
                </p>
                <p className="text-2xl font-semibold">{r.premiumChange.previous}</p>
                {r.premiumChange.annualPrevious && (
                  <p className="text-xs text-muted-foreground">
                    {r.premiumChange.annualPrevious}/year
                  </p>
                )}
              </div>
              <div
                className={`rounded-lg border p-4 space-y-1 ${
                  premiumUp
                    ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
                    : premiumDown
                      ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30"
                      : ""
                }`}
              >
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Renewed Premium
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-semibold">{r.premiumChange.renewed}</p>
                  <Badge
                    className={`text-xs ${
                      premiumUp
                        ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border-0"
                        : premiumDown
                          ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 border-0"
                          : ""
                    }`}
                    variant={premiumUp || premiumDown ? undefined : "secondary"}
                  >
                    {r.premiumChange.changePercent}
                  </Badge>
                </div>
                {r.premiumChange.annualRenewed && (
                  <p className="text-xs text-muted-foreground">
                    {r.premiumChange.annualRenewed}/year
                  </p>
                )}
              </div>
            </div>
            {r.premiumChange.note && (
              <p className="text-sm text-muted-foreground">{r.premiumChange.note}</p>
            )}
          </CardContent>
        </Card>
      )}

      {noChanges && (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No material changes detected between the previous schedule and the renewal quote.
          </CardContent>
        </Card>
      )}

      {/* Cover Removed — show prominently */}
      {hasCoverRemoved && (
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MinusCircle className="h-4 w-4 text-red-500" />
              Cover Removed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {r.coverRemoved!.map((item, i) => (
              <div
                key={i}
                className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-3 space-y-1"
              >
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{item.item}</p>
                  <Badge variant="outline" className="text-xs">
                    {item.section}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{item.details}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Cover Added */}
      {hasCoverAdded && (
        <Card className="border-green-200 dark:border-green-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <PlusCircle className="h-4 w-4 text-green-500" />
              Cover Added
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {r.coverAdded!.map((item, i) => (
              <div
                key={i}
                className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-3 space-y-1"
              >
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{item.item}</p>
                  <Badge variant="outline" className="text-xs">
                    {item.section}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{item.details}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Excess Changes */}
      {hasExcessChanges && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Excess Changes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {r.excessChanges!.map((item, i) => (
              <ChangeRow
                key={i}
                label={item.item}
                section={item.section}
                previous={item.previous}
                renewed={item.renewed}
                direction={item.direction}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Sum Insured Changes */}
      {hasSumInsuredChanges && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowUpDown className="h-4 w-4" />
              Sum Insured Changes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {r.sumInsuredChanges!.map((item, i) => (
              <ChangeRow
                key={i}
                label={item.item}
                section={item.section}
                previous={item.previous}
                renewed={item.renewed}
                direction={item.direction}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Cover Changed */}
      {hasCoverChanged && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowUpDown className="h-4 w-4" />
              Cover Terms Changed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {r.coverChanged!.map((item, i) => (
              <ChangeRow
                key={i}
                label={item.item}
                section={item.section}
                previous={item.previous}
                renewed={item.renewed}
                direction={item.direction}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Conditions Changed */}
      {hasConditionsChanged && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4" />
              Conditions Changed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {r.conditionsChanged!.map((item, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{item.item}</p>
                  <Badge variant="outline" className="text-xs">
                    {item.section}
                  </Badge>
                </div>
                {item.previous && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Previously: </span>
                    <span className="line-through opacity-60">{item.previous}</span>
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Now: </span>
                  {item.renewed}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recommendation */}
      {r.recommendation && (
        <>
          <Separator />
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ThumbsUp className="h-4 w-4" />
                Broker Recommendation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-line">
                {r.recommendation}
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
