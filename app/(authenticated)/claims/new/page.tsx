"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ContactSelector } from "@/components/contact-selector";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Loader2,
  Car,
  Home,
  FileText,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

const SA_INSURERS = [
  "OUTsurance",
  "Santam",
  "Discovery Insure",
  "Hollard",
  "Budget Insurance",
  "King Price",
  "MiWay",
  "Pineapple",
  "Auto & General",
  "Momentum Short-term Insurance",
  "Bryte Insurance",
  "Guardrisk",
  "Other",
];

function NewClaimContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const preselectedContactId = searchParams.get("contactId") as Id<"contacts"> | null;

  const [step, setStep] = useState(1);
  const [contactId, setContactId] = useState<Id<"contacts"> | null>(preselectedContactId);
  const [claimType, setClaimType] = useState<"motor" | "property" | "">("");
  const [insurer, setInsurer] = useState("");
  const [customInsurer, setCustomInsurer] = useState("");
  const [incidentDate, setIncidentDate] = useState("");
  const [description, setDescription] = useState("");
  const [estimatedLoss, setEstimatedLoss] = useState("");
  const [policeCaseNumber, setPoliceCaseNumber] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const createClaim = useMutation(api.claims.create);
  const processClaimAction = useAction(api.processClaim.processClaim);

  const contact = useQuery(
    api.contacts.get,
    contactId ? { id: contactId } : "skip"
  );

  const effectiveInsurer = insurer === "Other" ? customInsurer : insurer;

  const handleSubmit = async () => {
    if (!contactId || !claimType || !effectiveInsurer.trim()) return;

    setIsProcessing(true);
    try {
      const claimId = await createClaim({
        contactId,
        insurer: effectiveInsurer.trim(),
        claimType,
        incidentDate: incidentDate || undefined,
        description: description || undefined,
        estimatedLoss: estimatedLoss || undefined,
        policeCaseNumber: policeCaseNumber || undefined,
        policyNumber: policyNumber || undefined,
      });

      await processClaimAction({ claimId });
      toast.success("Claim documents generated!");
      router.push(`/claims/${claimId}`);
    } catch {
      toast.error("Failed to generate claim. Please try again.");
      setIsProcessing(false);
    }
  };

  const backHref = contactId ? `/contacts/${contactId}` : "/dashboard";
  const backLabel = contact ? `Back to ${contact.name}` : "Back to Dashboard";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>

      <div>
        <div className="flex items-center gap-2 mb-1">
          <FileText className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">New Claim</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Fill in the incident details and the AI will generate a pre-filled claim
          summary and submission email for you.
        </p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                step === s
                  ? "bg-primary text-primary-foreground"
                  : step > s
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {s}
            </div>
            <span className={step === s ? "text-foreground font-medium" : ""}>
              {s === 1 ? "Client & Type" : s === 2 ? "Claim Details" : "Review & Generate"}
            </span>
            {s < 3 && <ChevronRight className="h-3 w-3" />}
          </div>
        ))}
      </div>

      {/* Step 1: Client & Claim Type */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Client & Claim Type</CardTitle>
            <CardDescription>Who is the claim for and what type of claim is it?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Client *</Label>
              <ContactSelector value={contactId} onChange={setContactId} />
            </div>

            <div className="space-y-3">
              <Label>Claim Type *</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setClaimType("motor")}
                  className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-sm font-medium transition-colors ${
                    claimType === "motor"
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-muted-foreground/40"
                  }`}
                >
                  <Car className="h-6 w-6" />
                  Motor
                  <span className="text-xs font-normal text-muted-foreground text-center">
                    Vehicle accident, theft, or damage
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setClaimType("property")}
                  className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-sm font-medium transition-colors ${
                    claimType === "property"
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-muted-foreground/40"
                  }`}
                >
                  <Home className="h-6 w-6" />
                  Property
                  <span className="text-xs font-normal text-muted-foreground text-center">
                    Buildings, contents, or all risk loss
                  </span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Insurer *</Label>
              <Select value={insurer} onValueChange={setInsurer}>
                <SelectTrigger>
                  <SelectValue placeholder="Select insurer" />
                </SelectTrigger>
                <SelectContent>
                  {SA_INSURERS.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {insurer === "Other" && (
                <Input
                  placeholder="Enter insurer name"
                  value={customInsurer}
                  onChange={(e) => setCustomInsurer(e.target.value)}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>Policy Number</Label>
              <Input
                placeholder="e.g. POL-2024-12345 (optional)"
                value={policyNumber}
                onChange={(e) => setPolicyNumber(e.target.value)}
              />
            </div>

            <Button
              onClick={() => setStep(2)}
              disabled={!contactId || !claimType || !effectiveInsurer.trim()}
              className="w-full"
            >
              Continue to Claim Details
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Claim Details */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Claim Details
              {claimType && (
                <Badge variant="secondary" className="ml-2 capitalize">
                  {claimType === "motor" ? "Motor" : "Property"}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Provide as much detail as possible — the AI uses this to pre-fill the claim
              form.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="incidentDate">Date of Incident</Label>
              <Input
                id="incidentDate"
                type="date"
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Description of Incident *
              </Label>
              <Textarea
                id="description"
                placeholder={
                  claimType === "motor"
                    ? "e.g. Client was involved in a rear-end collision at the intersection of Main and Oak Street on the morning of [date]. The vehicle sustained damage to the rear bumper and boot lid. No injuries reported..."
                    : "e.g. Client discovered a burst geyser on [date] which caused water damage to the ceiling and floor of the main bedroom. The geyser is located in the roof space above the bedroom..."
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[120px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedLoss">Estimated Loss / Damage Value</Label>
              <Input
                id="estimatedLoss"
                placeholder="e.g. R45,000 (optional — will be noted as TBC if not provided)"
                value={estimatedLoss}
                onChange={(e) => setEstimatedLoss(e.target.value)}
              />
            </div>

            {claimType === "motor" && (
              <div className="space-y-2">
                <Label htmlFor="policeCaseNumber">
                  Police Case Number
                </Label>
                <Input
                  id="policeCaseNumber"
                  placeholder="e.g. CAS-2024-12345 (if applicable)"
                  value={policeCaseNumber}
                  onChange={(e) => setPoliceCaseNumber(e.target.value)}
                />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!description.trim()}
                className="flex-1"
              >
                Review & Generate
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review & Generate */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Review & Generate</CardTitle>
            <CardDescription>
              Confirm the details and the AI will generate the pre-filled claim form and
              submission email.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border divide-y text-sm">
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-muted-foreground">Client</span>
                <span className="font-medium">{contact?.name ?? "—"}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-muted-foreground">Insurer</span>
                <span className="font-medium">{effectiveInsurer}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-muted-foreground">Claim Type</span>
                <Badge variant="secondary" className="capitalize">
                  {claimType === "motor" ? "Motor" : "Property"}
                </Badge>
              </div>
              {policyNumber && (
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">Policy Number</span>
                  <span className="font-medium">{policyNumber}</span>
                </div>
              )}
              {incidentDate && (
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">Incident Date</span>
                  <span className="font-medium">{incidentDate}</span>
                </div>
              )}
              {estimatedLoss && (
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">Estimated Loss</span>
                  <span className="font-medium">{estimatedLoss}</span>
                </div>
              )}
              {policeCaseNumber && (
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">Police Case No.</span>
                  <span className="font-medium">{policeCaseNumber}</span>
                </div>
              )}
              <div className="px-4 py-2.5 space-y-1">
                <span className="text-muted-foreground">Description</span>
                <p className="text-foreground">{description}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isProcessing}
                className="flex-1 gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating Claim...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    Generate Claim Documents
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function NewClaimPage() {
  return (
    <Suspense>
      <NewClaimContent />
    </Suspense>
  );
}
