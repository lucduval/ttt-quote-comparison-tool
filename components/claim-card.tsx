"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert, FileCheck, FilePen } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

interface ClaimCardProps {
  id: Id<"claims">;
  insurer: string;
  claimType: "motor" | "property";
  status: "draft" | "submitted";
  contactName?: string;
  createdAt: number;
}

const statusConfig = {
  draft: {
    label: "Draft",
    variant: "secondary" as const,
    icon: FilePen,
  },
  submitted: {
    label: "Submitted",
    variant: "default" as const,
    icon: FileCheck,
  },
};

export function ClaimCard({
  id,
  insurer,
  claimType,
  status,
  contactName,
  createdAt,
}: ClaimCardProps) {
  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <Link href={`/claims/${id}`}>
      <Card className="transition-colors hover:bg-muted/50 cursor-pointer">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <ShieldAlert className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium truncate leading-snug">{insurer}</p>
              <Badge variant={config.variant} className="gap-1 shrink-0 self-start">
                <StatusIcon className="h-3 w-3" />
                {config.label}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
              {contactName && (
                <span className="text-xs text-muted-foreground truncate">
                  {contactName}
                </span>
              )}
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground capitalize">
                {claimType} claim
              </span>
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
