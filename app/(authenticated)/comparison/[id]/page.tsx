"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { useEffect } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ComparisonResult } from "@/components/comparison-result";
import { EmailPreview } from "@/components/email-preview";
import { PdfExport } from "@/components/pdf-export";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

export default function ComparisonDetailPage() {
  const params = useParams();
  const router = useRouter();
  const comparisonId = params.id as Id<"comparisons">;

  const comparison = useQuery(api.comparisons.get, { id: comparisonId });
  const contact = useQuery(
    api.contacts.get,
    comparison?.contactId ? { id: comparison.contactId } : "skip"
  );

  useEffect(() => {
    if (comparison?.status === "uploading") {
      router.replace(`/comparison/new?resumeId=${comparisonId}`);
    }
  }, [comparison, comparisonId, router]);

  if (comparison === undefined) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="h-8 w-48 animate-pulse bg-muted rounded" />
        <Card>
          <CardContent className="p-6">
            <div className="h-48 animate-pulse bg-muted rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const isProcessing =
    comparison.status === "processing" || comparison.status === "uploading";
  const isFailed = comparison.status === "failed";
  const isCompleted = comparison.status === "completed";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href={
          comparison.contactId
            ? `/contacts/${comparison.contactId}`
            : "/dashboard"
        }
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {contact ? `Back to ${contact.name}` : "Back to Dashboard"}
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {comparison.title}
            </h1>
            {isProcessing && (
              <Badge variant="secondary" className="gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Processing
              </Badge>
            )}
            {isFailed && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                Failed
              </Badge>
            )}
            {isCompleted && (
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Completed
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {contact && (
              <span className="text-sm text-muted-foreground">
                {contact.name}
              </span>
            )}
            {comparison.insuranceType && (
              <>
                <span className="text-sm text-muted-foreground">·</span>
                <span className="text-sm text-muted-foreground capitalize">
                  {comparison.insuranceType.replace("_", " ")}
                </span>
              </>
            )}
            <span className="text-sm text-muted-foreground">·</span>
            <span className="text-sm text-muted-foreground">
              {new Date(comparison._creationTime).toLocaleDateString()}
            </span>
          </div>
        </div>
        {isCompleted && comparison.result && contact && (
          <div className="self-start sm:self-auto shrink-0">
            <PdfExport
              title={comparison.title}
              emailDraft={comparison.result.emailDraft}
              contactName={contact.name}
            />
          </div>
        )}
      </div>

      {/* Processing state */}
      {isProcessing && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
            <h3 className="text-sm font-medium">Analyzing your quotes...</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              AI is extracting data from your PDFs and generating a detailed
              comparison. This usually takes 30-60 seconds.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Failed state */}
      {isFailed && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="h-10 w-10 text-destructive mb-4" />
            <h3 className="text-sm font-medium">Processing failed</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Something went wrong while analyzing the quotes. Please try
              creating a new comparison.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Completed state */}
      {isCompleted && comparison.result && (
        <Tabs defaultValue="comparison" className="space-y-6">
          <TabsList>
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
            <TabsTrigger value="email">Email Draft</TabsTrigger>
          </TabsList>

          <TabsContent value="comparison">
            <ComparisonResult result={comparison.result} />
          </TabsContent>

          <TabsContent value="email">
            <EmailPreview emailDraft={comparison.result.emailDraft} />
          </TabsContent>
        </Tabs>
      )}

    </div>
  );
}
