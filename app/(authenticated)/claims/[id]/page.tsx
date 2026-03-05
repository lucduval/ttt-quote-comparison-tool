"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  FileText,
  Car,
  Home,
  Pencil,
  X,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

function CopyableText({
  content,
  label,
}: {
  content: string;
  label: string;
}) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [edited, setEdited] = useState(content);

  const current = isEditing ? edited : content;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(current);
      setCopied(true);
      toast.success(`${label} copied to clipboard`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{label}</CardTitle>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEdited(content);
                    setIsEditing(false);
                  }}
                  className="gap-1"
                >
                  <X className="h-3.5 w-3.5" />
                  Discard
                </Button>
                <Button size="sm" onClick={() => setIsEditing(false)}>
                  Done
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEdited(content);
                  setIsEditing(true);
                }}
                className="gap-1"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <Textarea
            value={edited}
            onChange={(e) => setEdited(e.target.value)}
            className="min-h-[400px] font-mono text-sm resize-y"
          />
        ) : (
          <div className="rounded-lg border bg-muted/30 p-4 max-h-[500px] overflow-y-auto">
            <pre className="text-sm leading-relaxed whitespace-pre-wrap font-sans">
              {current}
            </pre>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          Plain text — paste directly into your email client or claim form.
        </p>
      </CardContent>
    </Card>
  );
}

export default function ClaimDetailPage() {
  const params = useParams();
  const claimId = params.id as Id<"claims">;

  const claim = useQuery(api.claims.get, { id: claimId });
  const contact = useQuery(
    api.contacts.get,
    claim?.contactId ? { id: claim.contactId } : "skip"
  );

  if (claim === undefined) {
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

  const isProcessing = claim.status === "draft" && !claim.result;
  const isFailed = claim.status === "draft" && claim.result === undefined;
  const isCompleted = !!claim.result;

  const claimTypeLabel = claim.claimType === "motor" ? "Motor" : "Property";
  const ClaimTypeIcon = claim.claimType === "motor" ? Car : Home;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href={claim.contactId ? `/contacts/${claim.contactId}` : "/dashboard"}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {contact ? `Back to ${contact.name}` : "Back to Dashboard"}
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h1 className="text-2xl font-semibold tracking-tight">
                {claim.insurer} — {claimTypeLabel} Claim
              </h1>
            </div>
            <Badge variant="secondary" className="gap-1">
              <ClaimTypeIcon className="h-3 w-3" />
              {claimTypeLabel}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
            {contact && <span>{contact.name}</span>}
            {claim.incidentDate && (
              <>
                <span>·</span>
                <span>Incident: {claim.incidentDate}</span>
              </>
            )}
            <span>·</span>
            <span>{new Date(claim._creationTime).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Claim details summary */}
      <Card>
        <CardContent className="p-4">
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {claim.policyNumber && (
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Policy Number</span>
                <span className="font-medium">{claim.policyNumber}</span>
              </div>
            )}
            {claim.estimatedLoss && (
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Estimated Loss</span>
                <span className="font-medium">{claim.estimatedLoss}</span>
              </div>
            )}
            {claim.policeCaseNumber && (
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Police Case No.</span>
                <span className="font-medium">{claim.policeCaseNumber}</span>
              </div>
            )}
            {claim.description && (
              <div className="sm:col-span-2 flex flex-col gap-1">
                <span className="text-muted-foreground">Description</span>
                <p className="text-foreground">{claim.description}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {isProcessing && !isCompleted && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
            <h3 className="text-sm font-medium">Generating claim documents...</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              AI is preparing the claim form and submission email.
            </p>
          </CardContent>
        </Card>
      )}

      {!isCompleted && isFailed && claim.status === "draft" && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="h-10 w-10 text-destructive mb-4" />
            <h3 className="text-sm font-medium">Generation failed</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Something went wrong. Please try creating a new claim.
            </p>
          </CardContent>
        </Card>
      )}

      {isCompleted && claim.result && (
        <Tabs defaultValue="form" className="space-y-6">
          <TabsList>
            <TabsTrigger value="form">Claim Form</TabsTrigger>
            <TabsTrigger value="email">Submission Email</TabsTrigger>
          </TabsList>

          <TabsContent value="form">
            <CopyableText
              content={claim.result.formDraft}
              label="Pre-filled Claim Form"
            />
          </TabsContent>

          <TabsContent value="email">
            <CopyableText
              content={claim.result.emailDraft}
              label="Submission Email"
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
