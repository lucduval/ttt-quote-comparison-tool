"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Eye, Pencil, Share2 } from "lucide-react";

interface ShareNoteBannerProps {
  sharedByName: string;
  note?: string;
  permission: "view" | "edit";
}

export function ShareNoteBanner({
  sharedByName,
  note,
  permission,
}: ShareNoteBannerProps) {
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Share2 className="h-4.5 w-4.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">
                Shared with you by {sharedByName}
              </p>
              <Badge
                variant={permission === "edit" ? "default" : "secondary"}
                className="gap-1 text-xs"
              >
                {permission === "edit" ? (
                  <>
                    <Pencil className="h-3 w-3" />
                    Can edit
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3" />
                    View only
                  </>
                )}
              </Badge>
            </div>
            {note && (
              <div className="flex items-start gap-2 mt-2 p-3 rounded-md bg-background/80 border border-primary/10">
                <MessageSquare className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {note}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
