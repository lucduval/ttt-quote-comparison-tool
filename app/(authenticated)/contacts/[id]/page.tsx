"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ComparisonCard } from "@/components/comparison-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Mail,
  Phone,
  Building2,
  StickyNote,
  Plus,
  FileText,
  ArrowLeft,
  RefreshCw,
  Car,
  Home,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

function EmptyState({
  icon: Icon,
  title,
  description,
  href,
  buttonLabel,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  buttonLabel: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <Icon className="h-10 w-10 text-muted-foreground mb-3" />
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>
        <Link href={href} className="mt-4">
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            {buttonLabel}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function ClaimCard({
  id,
  insurer,
  claimType,
  status,
  incidentDate,
  createdAt,
}: {
  id: Id<"claims">;
  insurer: string;
  claimType: "motor" | "property";
  status: "draft" | "submitted";
  incidentDate?: string;
  createdAt: number;
}) {
  const ClaimIcon = claimType === "motor" ? Car : Home;
  const isSubmitted = status === "submitted";

  return (
    <Link href={`/claims/${id}`}>
      <Card className="transition-colors hover:bg-muted/50 cursor-pointer">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <ClaimIcon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium truncate leading-snug">
                {insurer} — {claimType === "motor" ? "Motor" : "Property"} Claim
              </p>
              <Badge
                variant={isSubmitted ? "default" : "secondary"}
                className="gap-1 shrink-0 self-start"
              >
                {isSubmitted ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <Clock className="h-3 w-3" />
                )}
                {isSubmitted ? "Submitted" : "Draft"}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
              <span className="text-xs text-muted-foreground capitalize">
                {claimType === "motor" ? "Motor" : "Property"}
              </span>
              {incidentDate && (
                <>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">
                    Incident: {incidentDate}
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

export default function ContactDetailPage() {
  const params = useParams();
  const contactId = params.id as Id<"contacts">;

  const contact = useQuery(api.contacts.get, { id: contactId });
  const allComparisons = useQuery(api.comparisons.listByContact, { contactId });
  const claims = useQuery(api.claims.listByContact, { contactId });

  if (contact === undefined || allComparisons === undefined || claims === undefined) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse bg-muted rounded" />
        <Card>
          <CardContent className="p-6">
            <div className="h-24 animate-pulse bg-muted rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const comparisons = allComparisons.filter(
    (c) => !c.comparisonType || c.comparisonType === "comparison"
  );
  const renewals = allComparisons.filter((c) => c.comparisonType === "renewal");

  return (
    <div className="space-y-6">
      <Link
        href="/contacts"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Contacts
      </Link>

      {/* Contact Info */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">{contact.name}</h1>
                <div className="flex flex-wrap items-center gap-4 mt-2">
                  {contact.email && (
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      {contact.email}
                    </span>
                  )}
                  {contact.phone && (
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      {contact.phone}
                    </span>
                  )}
                  {contact.company && (
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5" />
                      {contact.company}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 self-start sm:self-auto shrink-0">
              <Link href={`/comparison/new?contactId=${contactId}`}>
                <Button size="sm" variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Comparison
                </Button>
              </Link>
              <Link href={`/renewal/new?contactId=${contactId}`}>
                <Button size="sm" variant="outline" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  New Renewal
                </Button>
              </Link>
              <Link href={`/claims/new?contactId=${contactId}`}>
                <Button size="sm" variant="outline" className="gap-2">
                  <FileText className="h-4 w-4" />
                  New Claim
                </Button>
              </Link>
            </div>
          </div>

          {contact.notes && (
            <>
              <Separator className="my-4" />
              <div className="flex items-start gap-2">
                <StickyNote className="h-4 w-4 text-muted-foreground mt-0.5" />
                <p className="text-sm text-muted-foreground">{contact.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Tabbed activity */}
      <Tabs defaultValue="comparisons">
        <TabsList>
          <TabsTrigger value="comparisons" className="gap-2">
            Comparisons
            {comparisons.length > 0 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4">
                {comparisons.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="renewals" className="gap-2">
            Renewals
            {renewals.length > 0 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4">
                {renewals.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="claims" className="gap-2">
            Claims
            {claims.length > 0 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4">
                {claims.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Comparisons tab */}
        <TabsContent value="comparisons" className="mt-4">
          {comparisons.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No comparisons yet"
              description={`Create a quote comparison for ${contact.name}.`}
              href={`/comparison/new?contactId=${contactId}`}
              buttonLabel="New Comparison"
            />
          ) : (
            <div className="space-y-3">
              {comparisons.map((c) => (
                <ComparisonCard
                  key={c._id}
                  id={c._id}
                  title={c.title}
                  status={c.status}
                  insuranceType={c.insuranceType}
                  contactName={contact.name}
                  createdAt={c._creationTime}
                  comparisonType="comparison"
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Renewals tab */}
        <TabsContent value="renewals" className="mt-4">
          {renewals.length === 0 ? (
            <EmptyState
              icon={RefreshCw}
              title="No renewals yet"
              description={`Analyse a renewal schedule for ${contact.name}.`}
              href={`/renewal/new?contactId=${contactId}`}
              buttonLabel="New Renewal"
            />
          ) : (
            <div className="space-y-3">
              {renewals.map((c) => (
                <ComparisonCard
                  key={c._id}
                  id={c._id}
                  title={c.title}
                  status={c.status}
                  insuranceType={c.insuranceType}
                  contactName={contact.name}
                  createdAt={c._creationTime}
                  comparisonType="renewal"
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Claims tab */}
        <TabsContent value="claims" className="mt-4">
          {claims.length === 0 ? (
            <EmptyState
              icon={AlertCircle}
              title="No claims yet"
              description={`Log a claim for ${contact.name}.`}
              href={`/claims/new?contactId=${contactId}`}
              buttonLabel="New Claim"
            />
          ) : (
            <div className="space-y-3">
              {claims.map((claim) => (
                <ClaimCard
                  key={claim._id}
                  id={claim._id}
                  insurer={claim.insurer}
                  claimType={claim.claimType}
                  status={claim.status}
                  incidentDate={claim.incidentDate}
                  createdAt={claim._creationTime}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
