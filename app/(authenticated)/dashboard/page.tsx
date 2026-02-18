"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ComparisonCard } from "@/components/comparison-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, FileText, BarChart3 } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const comparisons = useQuery(api.comparisons.list);
  const contacts = useQuery(api.contacts.list);

  const isLoading = comparisons === undefined || contacts === undefined;

  const totalComparisons = comparisons?.length ?? 0;
  const totalContacts = contacts?.length ?? 0;
  const completedComparisons =
    comparisons?.filter((c) => c.status === "completed").length ?? 0;

  const recentComparisons = comparisons?.slice(0, 10) ?? [];

  const contactMap = new Map(
    contacts?.map((c) => [c._id, c.name]) ?? []
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of your quote comparisons
          </p>
        </div>
        <Link href="/comparison/new" className="self-start sm:self-auto">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Comparison
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Contacts
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "—" : totalContacts}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Comparisons
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "—" : totalComparisons}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "—" : completedComparisons}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Comparisons */}
      <div>
        <h2 className="text-lg font-medium mb-4">Recent Comparisons</h2>
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
        ) : recentComparisons.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="text-sm font-medium">No comparisons yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Upload insurance quotes to generate your first AI-powered
                comparison.
              </p>
              <Link href="/comparison/new" className="mt-4">
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Comparison
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {recentComparisons.map((comparison) => (
              <ComparisonCard
                key={comparison._id}
                id={comparison._id}
                title={comparison.title}
                status={comparison.status}
                insuranceType={comparison.insuranceType}
                contactName={contactMap.get(comparison.contactId)}
                createdAt={comparison._creationTime}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
