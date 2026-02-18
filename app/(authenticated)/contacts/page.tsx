"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ContactCard } from "@/components/contact-card";
import { AddContactDialog } from "@/components/add-contact-dialog";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Users } from "lucide-react";

export default function ContactsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const contacts = useQuery(api.contacts.search, { query: searchQuery });
  const comparisons = useQuery(api.comparisons.list);

  const isLoading = contacts === undefined;

  const comparisonCountMap = new Map<string, number>();
  const lastActivityMap = new Map<string, number>();

  comparisons?.forEach((c) => {
    const contactId = c.contactId;
    comparisonCountMap.set(
      contactId,
      (comparisonCountMap.get(contactId) ?? 0) + 1
    );
    const existing = lastActivityMap.get(contactId) ?? 0;
    if (c._creationTime > existing) {
      lastActivityMap.set(contactId, c._creationTime);
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your clients and their quote comparisons
          </p>
        </div>
        <div className="self-start sm:self-auto">
          <AddContactDialog />
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search contacts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Contact List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-10 animate-pulse bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="text-sm font-medium">
              {searchQuery ? "No contacts found" : "No contacts yet"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              {searchQuery
                ? "Try a different search term."
                : "Add your first client contact to get started."}
            </p>
            {!searchQuery && (
              <div className="mt-4">
                <AddContactDialog />
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {contacts.map((contact) => {
            const lastTime = lastActivityMap.get(contact._id);
            return (
              <ContactCard
                key={contact._id}
                id={contact._id}
                name={contact.name}
                email={contact.email}
                company={contact.company}
                comparisonCount={comparisonCountMap.get(contact._id) ?? 0}
                lastActivity={
                  lastTime
                    ? new Date(lastTime).toLocaleDateString()
                    : undefined
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
