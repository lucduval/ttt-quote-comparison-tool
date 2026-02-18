"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ComparisonCard } from "@/components/comparison-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  Phone,
  Building2,
  StickyNote,
  Plus,
  FileText,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

export default function ContactDetailPage() {
  const params = useParams();
  const contactId = params.id as Id<"contacts">;

  const contact = useQuery(api.contacts.get, { id: contactId });
  const comparisons = useQuery(api.comparisons.listByContact, {
    contactId,
  });

  if (contact === undefined || comparisons === undefined) {
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

  return (
    <div className="space-y-6">
      {/* Back link */}
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
            <Link href={`/comparison/new?contactId=${contactId}`} className="self-start sm:self-auto shrink-0">
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                New Comparison
              </Button>
            </Link>
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

      {/* Comparisons */}
      <div>
        <h2 className="text-lg font-medium mb-4">
          Comparisons ({comparisons.length})
        </h2>
        {comparisons.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="text-sm font-medium">No comparisons yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Create a quote comparison for {contact.name}.
              </p>
              <Link
                href={`/comparison/new?contactId=${contactId}`}
                className="mt-4"
              >
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Comparison
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {comparisons.map((comparison) => (
              <ComparisonCard
                key={comparison._id}
                id={comparison._id}
                title={comparison.title}
                status={comparison.status}
                insuranceType={comparison.insuranceType}
                contactName={contact.name}
                createdAt={comparison._creationTime}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
