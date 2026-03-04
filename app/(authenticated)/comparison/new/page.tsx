"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ContactSelector } from "@/components/contact-selector";
import { FileUpload } from "@/components/file-upload";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, CheckCircle2, File as FileIcon } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

const INSURANCE_TYPES = [
  { value: "personal", label: "Personal Lines" },
  { value: "commercial", label: "Commercial" },
  { value: "body_corporate", label: "Body Corporate" },
  { value: "motor", label: "Motor" },
  { value: "home", label: "Homeowners" },
  { value: "life", label: "Life" },
  { value: "other", label: "Other" },
];

function NewComparisonContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const preselectedContactId = searchParams.get("contactId") as Id<"contacts"> | null;
  const resumeId = searchParams.get("resumeId") as Id<"comparisons"> | null;

  const [contactId, setContactId] = useState<Id<"contacts"> | null>(
    preselectedContactId
  );
  const [title, setTitle] = useState("");
  const [insuranceType, setInsuranceType] = useState("");
  const [comparisonId, setComparisonId] = useState<Id<"comparisons"> | null>(
    resumeId
  );
  const [currentPolicyReady, setCurrentPolicyReady] = useState(false);
  const [newQuotesReady, setNewQuotesReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [initialized, setInitialized] = useState(!resumeId);

  const createComparison = useMutation(api.comparisons.create);
  const processQuotes = useAction(api.processQuotes.processQuotes);

  const existingComparison = useQuery(
    api.comparisons.get,
    resumeId ? { id: resumeId } : "skip"
  );

  const existingDocs = useQuery(
    api.documents.listByComparison,
    comparisonId ? { comparisonId } : "skip"
  );

  useEffect(() => {
    if (existingComparison && !initialized) {
      setTitle(existingComparison.title);
      setContactId(existingComparison.contactId);
      setInsuranceType(existingComparison.insuranceType ?? "");
      setInitialized(true);
    }
  }, [existingComparison, initialized]);

  useEffect(() => {
    if (existingDocs) {
      const existingNewQuotes = existingDocs.filter(
        (d) => d.documentRole !== "current_policy"
      );
      if (existingNewQuotes.length >= 1) {
        setNewQuotesReady(true);
      }
      const existingCurrentPolicy = existingDocs.find(
        (d) => d.documentRole === "current_policy"
      );
      if (existingCurrentPolicy) {
        setCurrentPolicyReady(true);
      }
    }
  }, [existingDocs]);

  const contact = useQuery(
    api.contacts.get,
    contactId ? { id: contactId } : "skip"
  );

  const handleCreateComparison = async () => {
    if (!contactId || !title.trim()) return;

    try {
      const id = await createComparison({
        contactId,
        title: title.trim(),
        insuranceType: insuranceType || undefined,
      });
      setComparisonId(id);
      toast.success("Comparison created. Upload documents below.");
    } catch {
      toast.error("Failed to create comparison");
    }
  };

  const handleCurrentPolicyReady = useCallback(
    (storageIds: Id<"_storage">[]) => {
      if (storageIds.length >= 1) {
        setCurrentPolicyReady(true);
      }
    },
    []
  );

  const handleNewQuotesReady = useCallback(
    (storageIds: Id<"_storage">[]) => {
      const existingNewQuoteCount =
        existingDocs?.filter((d) => d.documentRole !== "current_policy").length ?? 0;
      if (storageIds.length + existingNewQuoteCount >= 1) {
        setNewQuotesReady(true);
      }
    },
    [existingDocs]
  );

  const handleProcess = async () => {
    if (!comparisonId || !contact) return;

    setIsProcessing(true);
    try {
      await processQuotes({
        comparisonId,
        contactName: contact.name,
      });
      toast.success("Processing complete!");
      router.push(`/comparison/${comparisonId}`);
    } catch {
      toast.error("Processing failed. Please try again.");
      setIsProcessing(false);
    }
  };

  const backHref = contactId ? `/contacts/${contactId}` : "/dashboard";
  const backLabel = contact
    ? `Back to ${contact.name}`
    : "Back to Dashboard";

  const existingCurrentPolicy = existingDocs?.find(
    (d) => d.documentRole === "current_policy"
  );
  const existingNewQuotes = existingDocs?.filter(
    (d) => d.documentRole !== "current_policy"
  );

  const canGenerate = newQuotesReady;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {resumeId ? "Continue Comparison" : "New Comparison"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload insurance quotes and optionally the client&apos;s current policy to generate an AI-powered comparison.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6 items-start">
        {/* Left column: Step 1 Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Comparison Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Contact *</Label>
              <ContactSelector
                value={contactId}
                onChange={setContactId}
                disabled={!!comparisonId}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Naidoo — Budget vs Hollard Personal Lines"
                disabled={!!comparisonId}
              />
            </div>

            <div className="space-y-2">
              <Label>Insurance Type</Label>
              <Select
                value={insuranceType}
                onValueChange={setInsuranceType}
                disabled={!!comparisonId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {INSURANCE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!comparisonId && (
              <Button
                onClick={handleCreateComparison}
                disabled={!contactId || !title.trim()}
                className="w-full"
              >
                Continue to Upload
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Right column: Upload steps */}
        <div className="space-y-6">
          {/* Step 2a: Current Policy Upload */}
          {comparisonId && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">2. Current Policy Schedule</CardTitle>
                    <CardDescription className="mt-1">
                      Upload the client&apos;s existing policy schedule. This enables the AI to identify shortfalls and compare accurately against the new quotes.
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="shrink-0 ml-2">Optional</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {existingCurrentPolicy ? (
                  <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/30">
                    <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <p className="text-sm truncate flex-1">{existingCurrentPolicy.fileName}</p>
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  </div>
                ) : (
                  <FileUpload
                    comparisonId={comparisonId}
                    onFilesReady={handleCurrentPolicyReady}
                    role="current_policy"
                    maxFiles={1}
                    label="Drag and drop the current policy schedule here"
                    hint="or click to browse. PDF or image accepted. One file only."
                  />
                )}
                {currentPolicyReady && !existingCurrentPolicy && (
                  <p className="text-xs text-green-600">
                    Current policy uploaded. The AI will use this as the baseline.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 2b: New Quotes Upload */}
          {comparisonId && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">3. New Quote(s)</CardTitle>
                    <CardDescription className="mt-1">
                      Upload one or more new insurance quotes to compare. At least one quote is required.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="shrink-0 ml-2">Required</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {existingNewQuotes && existingNewQuotes.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">
                      Previously uploaded
                    </p>
                    {existingNewQuotes.map((doc) => (
                      <div
                        key={doc._id}
                        className="flex items-center gap-3 rounded-lg border p-3"
                      >
                        <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <p className="text-sm truncate flex-1">{doc.fileName}</p>
                        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
                <FileUpload
                  comparisonId={comparisonId}
                  onFilesReady={handleNewQuotesReady}
                  role="new_quote"
                  label="Drag and drop new quote files here"
                  hint="or click to browse. PDFs and images accepted. Upload as many quotes as needed."
                />
                {!newQuotesReady && (
                  <p className="text-xs text-muted-foreground">
                    Upload at least 1 new quote to proceed.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Generate */}
          {comparisonId && canGenerate && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">4. Generate Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {currentPolicyReady
                    ? "AI will extract data from all documents and generate a professional comparison, including shortfall analysis against the current policy."
                    : "AI will extract data from all quotes and generate a professional side-by-side comparison. For shortfall analysis, also upload the current policy above."}
                </p>
                <Button
                  onClick={handleProcess}
                  disabled={isProcessing}
                  className="w-full gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing Documents...
                    </>
                  ) : (
                    "Generate Comparison"
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NewComparisonPage() {
  return (
    <Suspense>
      <NewComparisonContent />
    </Suspense>
  );
}
