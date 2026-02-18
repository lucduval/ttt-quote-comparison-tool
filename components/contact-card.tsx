"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { User, Mail, Building2, FileText } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

interface ContactCardProps {
  id: Id<"contacts">;
  name: string;
  email?: string;
  company?: string;
  comparisonCount: number;
  lastActivity?: string;
}

export function ContactCard({
  id,
  name,
  email,
  company,
  comparisonCount,
  lastActivity,
}: ContactCardProps) {
  return (
    <Link href={`/contacts/${id}`}>
      <Card className="transition-colors hover:bg-muted/50 cursor-pointer">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{name}</p>
            <div className="flex items-center gap-3 mt-1">
              {email && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                  <Mail className="h-3 w-3 shrink-0" />
                  {email}
                </span>
              )}
              {company && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                  <Building2 className="h-3 w-3 shrink-0" />
                  {company}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <FileText className="h-3 w-3" />
              {comparisonCount} comparison{comparisonCount !== 1 ? "s" : ""}
            </span>
            {lastActivity && (
              <span className="text-xs text-muted-foreground">
                {lastActivity}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
