"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Clock, CheckCircle2, AlertCircle, Loader2, RefreshCw, Share2 } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

interface ComparisonCardProps {
  id: Id<"comparisons">;
  title: string;
  status: "uploading" | "extracting" | "extracted" | "processing" | "completed" | "failed";
  insuranceType?: string;
  contactName?: string;
  createdAt: number;
  comparisonType?: "comparison" | "renewal";
  sharedByName?: string;
  permission?: "view" | "edit";
}

const statusConfig = {
  uploading: {
    label: "Uploading",
    variant: "secondary" as const,
    icon: Clock,
  },
  extracting: {
    label: "Extracting",
    variant: "secondary" as const,
    icon: Loader2,
  },
  extracted: {
    label: "Review",
    variant: "secondary" as const,
    icon: Clock,
  },
  processing: {
    label: "Processing",
    variant: "secondary" as const,
    icon: Loader2,
  },
  completed: {
    label: "Completed",
    variant: "default" as const,
    icon: CheckCircle2,
  },
  failed: {
    label: "Failed",
    variant: "destructive" as const,
    icon: AlertCircle,
  },
};

export function ComparisonCard({
  id,
  title,
  status,
  insuranceType,
  contactName,
  createdAt,
  comparisonType,
  sharedByName,
  permission,
}: ComparisonCardProps) {
  const config = statusConfig[status];
  const StatusIcon = config.icon;
  const isRenewal = comparisonType === "renewal";

  const isSetup = status === "uploading" || status === "extracting" || status === "extracted";
  const href = isSetup
    ? isRenewal
      ? `/renewal/new?resumeId=${id}`
      : `/comparison/new?resumeId=${id}`
    : isRenewal
      ? `/renewal/${id}`
      : `/comparison/${id}`;

  const RowIcon = isRenewal ? RefreshCw : FileText;

  return (
    <Link href={href}>
      <Card className="transition-colors hover:bg-muted/50 cursor-pointer">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <RowIcon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium truncate leading-snug">{title}</p>
              <Badge variant={config.variant} className="gap-1 shrink-0 self-start">
                <StatusIcon
                  className={`h-3 w-3 ${status === "processing" ? "animate-spin" : ""}`}
                />
                {config.label}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
              {sharedByName && (
                <>
                  <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
                    <Share2 className="h-3 w-3" />
                    Shared by {sharedByName}
                  </span>
                  {permission && (
                    <>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {permission === "edit" ? "Can edit" : "View only"}
                      </span>
                    </>
                  )}
                  <span className="text-xs text-muted-foreground">·</span>
                </>
              )}
              {contactName && (
                <span className="text-xs text-muted-foreground truncate">
                  {contactName}
                </span>
              )}
              {isRenewal && (
                <>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">Renewal</span>
                </>
              )}
              {insuranceType && (
                <>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {insuranceType.replace("_", " ")}
                  </span>
                </>
              )}
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">
                {new Date(createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
