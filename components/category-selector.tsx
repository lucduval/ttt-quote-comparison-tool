"use client";

import { useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Car,
  Home,
  Package,
  Briefcase,
  Shield,
  Layers,
  Check,
} from "lucide-react";

interface Section {
  sectionName: string;
  sectionType: string;
  insuredItem?: string;
  pointCount?: number;
  extensions?: Array<Record<string, unknown>>;
  inclusions?: string[];
  exclusions?: string[];
  specialConditions?: string[];
}

interface ExtractedDocument {
  fileName: string;
  insurerName?: string;
  documentRole?: string;
  sections: Section[];
  totalPremium?: {
    monthly?: number | null;
    annual?: number | null;
  };
}

interface CategorySelectorProps {
  documents: ExtractedDocument[];
  initialSelected?: string[];
  onConfirm: (selectedCategories: string[]) => void;
  isGenerating?: boolean;
  generateLabel?: string;
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  motor: <Car className="h-4 w-4" />,
  buildings: <Home className="h-4 w-4" />,
  contents: <Package className="h-4 w-4" />,
  all_risk: <Briefcase className="h-4 w-4" />,
  liability: <Shield className="h-4 w-4" />,
  other: <Layers className="h-4 w-4" />,
};

const SECTION_LABELS: Record<string, string> = {
  motor: "Motor",
  buildings: "Buildings",
  contents: "Contents",
  all_risk: "All-Risk / Portable Possessions",
  liability: "Personal Liability",
  other: "Other",
};

function computePointCount(section: Section): number {
  if (section.pointCount) return section.pointCount;
  let count = 0;
  count += (section.extensions?.length ?? 0);
  count += (section.inclusions?.length ?? 0);
  count += (section.exclusions?.length ?? 0);
  count += (section.specialConditions?.length ?? 0);
  count += 3; // premium, excess, sum insured
  return count;
}

export function CategorySelector({
  documents,
  initialSelected,
  onConfirm,
  isGenerating,
  generateLabel = "Generate Analysis",
}: CategorySelectorProps) {
  // Aggregate categories across all documents
  const categories = useMemo(() => {
    const categoryMap = new Map<
      string,
      {
        sectionType: string;
        label: string;
        totalPoints: number;
        sectionNames: Set<string>;
        insuredItems: Set<string>;
        docCount: number;
      }
    >();

    for (const doc of documents) {
      for (const section of doc.sections) {
        const type = section.sectionType || "other";
        const existing = categoryMap.get(type);
        const points = computePointCount(section);

        if (existing) {
          existing.totalPoints += points;
          existing.sectionNames.add(section.sectionName);
          if (section.insuredItem) existing.insuredItems.add(section.insuredItem);
          existing.docCount++;
        } else {
          categoryMap.set(type, {
            sectionType: type,
            label: SECTION_LABELS[type] || section.sectionName,
            totalPoints: points,
            sectionNames: new Set([section.sectionName]),
            insuredItems: new Set(
              section.insuredItem ? [section.insuredItem] : []
            ),
            docCount: 1,
          });
        }
      }
    }

    return Array.from(categoryMap.values()).sort((a, b) => {
      const order = ["motor", "buildings", "contents", "all_risk", "liability", "other"];
      return order.indexOf(a.sectionType) - order.indexOf(b.sectionType);
    });
  }, [documents]);

  const allTypes = useMemo(
    () => categories.map((c) => c.sectionType),
    [categories]
  );

  const [selected, setSelected] = useState<Set<string>>(() => {
    if (initialSelected) return new Set(initialSelected);
    return new Set(allTypes); // All pre-selected
  });

  const toggle = useCallback((type: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => setSelected(new Set(allTypes)), [allTypes]);
  const selectNone = useCallback(() => setSelected(new Set()), []);

  const totalSelectedPoints = categories
    .filter((c) => selected.has(c.sectionType))
    .reduce((sum, c) => sum + c.totalPoints, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Review Extracted Categories</CardTitle>
            <CardDescription className="mt-1">
              All categories are selected. Deselect any you want to exclude from
              the analysis, or click Next to proceed.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs h-7">
              Select All
            </Button>
            <Button variant="ghost" size="sm" onClick={selectNone} className="text-xs h-7">
              Clear
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Premium — always included */}
        <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Check className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Premium & Metadata</p>
            <p className="text-xs text-muted-foreground">
              Always included — insurer details, premium amounts, policy numbers
            </p>
          </div>
          <Badge variant="secondary" className="text-xs shrink-0">
            Always on
          </Badge>
        </div>

        {/* Toggleable categories */}
        {categories.map((cat) => {
          const isSelected = selected.has(cat.sectionType);
          return (
            <button
              key={cat.sectionType}
              type="button"
              onClick={() => toggle(cat.sectionType)}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-3 py-2.5 w-full text-left transition-colors",
                isSelected
                  ? "bg-primary/5 border-primary/30"
                  : "bg-muted/20 border-border opacity-60"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md",
                  isSelected
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {SECTION_ICONS[cat.sectionType] || SECTION_ICONS.other}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{cat.label}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {Array.from(cat.insuredItems).join(", ") ||
                    Array.from(cat.sectionNames).join(", ")}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge
                  variant={isSelected ? "default" : "secondary"}
                  className="text-xs"
                >
                  {cat.totalPoints} points
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {cat.docCount} doc{cat.docCount !== 1 ? "s" : ""}
                </span>
                <div
                  className={cn(
                    "h-5 w-5 rounded border flex items-center justify-center transition-colors",
                    isSelected
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-input"
                  )}
                >
                  {isSelected && <Check className="h-3 w-3" />}
                </div>
              </div>
            </button>
          );
        })}

        {/* Summary + generate */}
        <div className="flex items-center justify-between pt-2 border-t">
          <p className="text-sm text-muted-foreground">
            {selected.size} of {categories.length} categories selected
            {totalSelectedPoints > 0 && ` — ${totalSelectedPoints} data points`}
          </p>
          <Button
            onClick={() => onConfirm(Array.from(selected))}
            disabled={selected.size === 0 || isGenerating}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Generating...
              </>
            ) : (
              generateLabel
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
