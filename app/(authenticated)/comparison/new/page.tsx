"use client";

import { useState, useCallback, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ContactSelector } from "@/components/contact-selector";
import { FileUpload } from "@/components/file-upload";
import { ExtractionView } from "@/components/extraction-view";
import { CategorySelector } from "@/components/category-selector";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { DocumentRow } from "@/components/document-row";
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
  const [customPrompt, setCustomPrompt] = useState("");
  const [comparisonId, setComparisonId] = useState<Id<"comparisons"> | null>(
    resumeId
  );
  const [currentPolicyReady, setCurrentPolicyReady] = useState(false);
  const [newQuotesReady, setNewQuotesReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [initialized, setInitialized] = useState(!resumeId);

  const createComparison = useMutation(api.comparisons.create);
  const extractDocuments = useAction(api.extractDocuments.extractDocuments);
  const processQuotes = useAction(api.processQuotes.processQuotes);
  const resetToExtracted = useMutation(api.comparisons.resetToExtracted);
  const updateStatus = useMutation(api.comparisons.updateStatus);

  const existingComparison = useQuery(
    api.comparisons.get,
    comparisonId ? { id: comparisonId } : "skip"
  );

  const existingDocs = useQuery(
    api.documents.listByComparison,
    comparisonId ? { comparisonId } : "skip"
  );

  // Determine current step from comparison status
  const comparisonStatus = existingComparison?.status;

  // Redirect to detail page once processing/completed/failed
  useEffect(() => {
    if (
      comparisonId &&
      (comparisonStatus === "processing" ||
        comparisonStatus === "completed" ||
        comparisonStatus === "failed")
    ) {
      router.replace(`/comparison/${comparisonId}`);
    }
  }, [comparisonId, comparisonStatus, router]);

  useEffect(() => {
    if (existingComparison && !initialized) {
      setTitle(existingComparison.title);
      setContactId(existingComparison.contactId);
      setInsuranceType(existingComparison.insuranceType ?? "");
      setCustomPrompt(existingComparison.customPrompt ?? "");
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
        customPrompt: customPrompt.trim() || undefined,
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

  // Start extraction (Stage 1)
  const handleExtract = async () => {
    if (!comparisonId) return;
    setIsExtracting(true);
    try {
      await extractDocuments({ comparisonId });
    } catch {
      toast.error("Extraction failed. Please try again.");
      setIsExtracting(false);
    }
  };

  // Go back to upload step from extraction/extracted state
  const handleBackToUpload = async () => {
    if (!comparisonId) return;
    await updateStatus({ id: comparisonId, status: "uploading" });
  };

  // Generate comparison (Stage 2)
  const handleGenerate = async (selectedCategories: string[]) => {
    if (!comparisonId || !contact) return;
    setIsProcessing(true);
    try {
      await processQuotes({
        comparisonId,
        contactName: contact.name,
        selectedCategories,
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

  const canExtract = newQuotesReady;
  const statusIsExtracting = comparisonStatus === "extracting";
  const statusIsExtracted = comparisonStatus === "extracted";
  const showUpload = !comparisonStatus || comparisonStatus === "uploading";
  const showExtraction = statusIsExtracting;
  const showCategories = statusIsExtracted;

  // Build extracted document data for category selector
  const extractedDocuments = useMemo(() => {
    if (!existingDocs) return [];
    return existingDocs
      .filter((d) => d.extractedData)
      .map((d) => {
        const data = d.extractedData as Record<string, unknown>;
        return {
          fileName: d.fileName,
          insurerName: (data.insurerName as string) || d.insurerName,
          documentRole: d.documentRole,
          sections: (data.sections ?? []) as Array<{
            sectionName: string;
            sectionType: string;
            insuredItem?: string;
            pointCount?: number;
            extensions?: Array<Record<string, unknown>>;
            inclusions?: string[];
            exclusions?: string[];
            specialConditions?: string[];
          }>,
          totalPremium: data.totalPremium as {
            monthly?: number | null;
            annual?: number | null;
          } | undefined,
        };
      });
  }, [existingDocs]);

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

      {/* Two-panel layout: details contracts left, uploads slide in right */}
      <div className="flex flex-col md:flex-row gap-6 items-start">

        {/* -- Step 1: Details panel ---------------------------------------- */}
        <div
          className={cn(
            "shrink-0 transition-[width] duration-500 ease-in-out",
            "w-full",
            comparisonId && "md:w-80"
          )}
        >
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">1. Comparison Details</CardTitle>
                {comparisonId && (
                  <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                    <Check className="h-3.5 w-3.5" />
                    Confirmed
                  </span>
                )}
              </div>
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

              <div className="space-y-2">
                <Label htmlFor="customPrompt">Custom AI Instructions</Label>
                <Textarea
                  id="customPrompt"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="e.g. Focus on motor excess differences, or Flag any policies without geyser cover"
                  disabled={!!comparisonId}
                  rows={3}
                  className="resize-none text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Optional — give the AI specific instructions about what to focus on or look for in the comparison.
                </p>
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
        </div>

        {/* -- Steps 2-5: Upload + Extract + Categories + Generate ---------- */}
        {comparisonId && (
          <div className="flex-1 min-w-0 space-y-6 animate-in slide-in-from-right-8 fade-in duration-500">

            {/* Step 2: Current Policy (visible during upload) */}
            {showUpload && (
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
                <CardContent className="space-y-3">
                  {existingCurrentPolicy ? (
                    <DocumentRow
                      id={existingCurrentPolicy._id}
                      fileName={existingCurrentPolicy.fileName}
                      onRemoved={() => setCurrentPolicyReady(false)}
                    />
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
                </CardContent>
              </Card>
            )}

            {/* Step 3: New Quotes (visible during upload) */}
            {showUpload && (
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
                <CardContent className="space-y-3">
                  {existingNewQuotes && existingNewQuotes.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">Uploaded quotes</p>
                      {existingNewQuotes.map((doc) => (
                        <DocumentRow
                          key={doc._id}
                          id={doc._id}
                          fileName={doc.fileName}
                          insurerName={doc.insurerName}
                          showInsurerName
                          onRemoved={() => {
                            if ((existingNewQuotes?.length ?? 0) <= 1) {
                              setNewQuotesReady(false);
                            }
                          }}
                        />
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

            {/* Step 4: Extract Data (button or progress) */}
            {showUpload && canExtract && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">4. Extract Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {currentPolicyReady
                      ? "AI will scan all documents using OCR and extract structured insurance data for review before generating the comparison."
                      : "AI will scan all quotes using OCR and extract structured data for review. For shortfall analysis, also upload the current policy above."}
                  </p>
                  <Button
                    onClick={handleExtract}
                    disabled={isExtracting}
                    className="w-full gap-2"
                  >
                    {isExtracting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Starting Extraction...
                      </>
                    ) : (
                      "Extract Data from Documents"
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Extraction in progress */}
            {showExtraction && existingDocs && (
              <>
                <ExtractionView documents={existingDocs} />
                <p className="text-xs text-muted-foreground text-center">
                  Extracting data from {existingDocs.length} document{existingDocs.length !== 1 ? "s" : ""}. This usually takes 30-60 seconds per document.
                </p>
              </>
            )}

            {/* Category selection + generate */}
            {showCategories && (
              <>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToUpload}
                    className="text-xs"
                  >
                    <ArrowLeft className="h-3 w-3 mr-1" />
                    Back to Upload
                  </Button>
                </div>

                <CategorySelector
                  documents={extractedDocuments}
                  initialSelected={existingComparison?.selectedCategories ?? undefined}
                  onConfirm={handleGenerate}
                  isGenerating={isProcessing}
                  generateLabel="Generate Comparison"
                />
              </>
            )}
          </div>
        )}
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
