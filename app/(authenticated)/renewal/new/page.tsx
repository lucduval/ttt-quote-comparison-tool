"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ContactSelector } from "@/components/contact-selector";
import { FileUpload } from "@/components/file-upload";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, RefreshCw, Check } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { DocumentRow } from "@/components/document-row";

function NewRenewalContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const preselectedContactId = searchParams.get("contactId") as Id<"contacts"> | null;
  const resumeId = searchParams.get("resumeId") as Id<"comparisons"> | null;

  const [contactId, setContactId] = useState<Id<"contacts"> | null>(preselectedContactId);
  const [title, setTitle] = useState("");
  const [comparisonId, setComparisonId] = useState<Id<"comparisons"> | null>(resumeId);
  const [previousReady, setPreviousReady] = useState(false);
  const [renewalReady, setRenewalReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [initialized, setInitialized] = useState(!resumeId);

  const createComparison = useMutation(api.comparisons.create);
  const processRenewal = useAction(api.processQuotes.processRenewal);

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
      setInitialized(true);
    }
  }, [existingComparison, initialized]);

  useEffect(() => {
    if (existingDocs) {
      const hasPrevious = existingDocs.some((d) => d.documentRole === "current_policy");
      const hasRenewal = existingDocs.some((d) => d.documentRole === "new_quote");
      if (hasPrevious) setPreviousReady(true);
      if (hasRenewal) setRenewalReady(true);
    }
  }, [existingDocs]);

  const contact = useQuery(
    api.contacts.get,
    contactId ? { id: contactId } : "skip"
  );

  const handleCreate = async () => {
    if (!contactId || !title.trim()) return;
    try {
      const id = await createComparison({
        contactId,
        title: title.trim(),
        comparisonType: "renewal",
      });
      setComparisonId(id);
      toast.success("Renewal created. Upload documents below.");
    } catch {
      toast.error("Failed to create renewal");
    }
  };

  const handlePreviousReady = useCallback((storageIds: Id<"_storage">[]) => {
    if (storageIds.length >= 1) setPreviousReady(true);
  }, []);

  const handleRenewalReady = useCallback((storageIds: Id<"_storage">[]) => {
    if (storageIds.length >= 1) setRenewalReady(true);
  }, []);

  const handleProcess = async () => {
    if (!comparisonId || !contact) return;
    setIsProcessing(true);
    try {
      await processRenewal({ comparisonId, contactName: contact.name });
      toast.success("Renewal analysis complete!");
      router.push(`/renewal/${comparisonId}`);
    } catch {
      toast.error("Processing failed. Please try again.");
      setIsProcessing(false);
    }
  };

  const backHref = contactId ? `/contacts/${contactId}` : "/dashboard";
  const backLabel = contact ? `Back to ${contact.name}` : "Back to Dashboard";

  const existingPrevious = existingDocs?.find((d) => d.documentRole === "current_policy");
  const existingRenewal = existingDocs?.find((d) => d.documentRole === "new_quote");

  const canGenerate = previousReady && renewalReady;

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
        <div className="flex items-center gap-2 mb-1">
          <RefreshCw className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">
            {resumeId ? "Continue Renewal Analysis" : "New Renewal Analysis"}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Upload last year&apos;s policy schedule and this year&apos;s renewal quote. The AI will
          highlight every change — premiums, excesses, cover added or removed.
        </p>
      </div>

      {/* Two-panel layout: details contracts left, uploads slide in right */}
      <div className="flex flex-col md:flex-row gap-6 items-start">

        {/* ── Step 1: Details panel ─────────────────────────────────────────── */}
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
                <CardTitle className="text-base">1. Renewal Details</CardTitle>
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
                  placeholder="e.g. Smith — 2026 Renewal Review"
                  disabled={!!comparisonId}
                />
              </div>

              {!comparisonId && (
                <Button
                  onClick={handleCreate}
                  disabled={!contactId || !title.trim()}
                  className="w-full"
                >
                  Continue to Upload
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Steps 2-4: Upload + Analyse — slide in from the right ─────────── */}
        {comparisonId && (
          <div className="flex-1 min-w-0 space-y-6 animate-in slide-in-from-right-8 fade-in duration-500">

            {/* Step 2: Previous Schedule */}
            <Card>
              <CardHeader>
                <div>
                  <CardTitle className="text-base">2. Previous Schedule</CardTitle>
                  <CardDescription className="mt-1">
                    Upload last year&apos;s policy schedule — this is the baseline.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {existingPrevious ? (
                  <DocumentRow
                    id={existingPrevious._id}
                    fileName={existingPrevious.fileName}
                    onRemoved={() => setPreviousReady(false)}
                  />
                ) : (
                  <FileUpload
                    comparisonId={comparisonId}
                    onFilesReady={handlePreviousReady}
                    role="current_policy"
                    maxFiles={1}
                    label="Drag and drop the previous year's schedule here"
                    hint="or click to browse. PDF or image accepted. One file only."
                  />
                )}
              </CardContent>
            </Card>

            {/* Step 3: Renewal Quote */}
            <Card>
              <CardHeader>
                <div>
                  <CardTitle className="text-base">3. Renewal Quote</CardTitle>
                  <CardDescription className="mt-1">
                    Upload the insurer&apos;s renewal quote or new schedule for the upcoming period.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {existingRenewal ? (
                  <DocumentRow
                    id={existingRenewal._id}
                    fileName={existingRenewal.fileName}
                    insurerName={existingRenewal.insurerName}
                    showInsurerName
                    onRemoved={() => setRenewalReady(false)}
                  />
                ) : (
                  <FileUpload
                    comparisonId={comparisonId}
                    onFilesReady={handleRenewalReady}
                    role="new_quote"
                    maxFiles={1}
                    label="Drag and drop the renewal quote here"
                    hint="or click to browse. PDF or image accepted. One file only."
                  />
                )}
              </CardContent>
            </Card>

            {/* Step 4: Generate */}
            {canGenerate && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">4. Analyse Renewal</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    The AI will compare both documents and highlight all changes: premium
                    movement, excess changes, cover added or removed, and conditions that
                    have changed.
                  </p>
                  <Button
                    onClick={handleProcess}
                    disabled={isProcessing}
                    className="w-full gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analysing Renewal...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        Generate Renewal Analysis
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function NewRenewalPage() {
  return (
    <Suspense>
      <NewRenewalContent />
    </Suspense>
  );
}
