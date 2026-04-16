"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ComparisonCard } from "@/components/comparison-card";
import { ClaimCard } from "@/components/claim-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Users,
  FileText,
  RefreshCw,
  ShieldAlert,
  Maximize2,
  Minimize2,
  Share2,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type PanelId = "comparisons" | "renewals" | "claims";

export default function DashboardPage() {
  const [expanded, setExpanded] = useState<PanelId | null>(null);
  const [activeTab, setActiveTab] = useState<PanelId | "shared">("comparisons");

  const comparisons = useQuery(api.comparisons.list);
  const contacts = useQuery(api.contacts.list);
  const claims = useQuery(api.claims.list);
  const sharedWithMe = useQuery(api.shares.listSharedWithMe);

  const isLoading =
    comparisons === undefined || contacts === undefined || claims === undefined;

  const contactMap = new Map(contacts?.map((c) => [c._id, c.name]) ?? []);

  const totalContacts = contacts?.length ?? 0;
  const recentComparisons =
    comparisons?.filter((c) => c.comparisonType !== "renewal").slice(0, 10) ?? [];
  const recentRenewals =
    comparisons?.filter((c) => c.comparisonType === "renewal").slice(0, 10) ?? [];
  const recentClaims = claims?.slice(0, 10) ?? [];
  const totalComparisons =
    comparisons?.filter((c) => c.comparisonType !== "renewal").length ?? 0;
  const totalRenewals =
    comparisons?.filter((c) => c.comparisonType === "renewal").length ?? 0;
  const totalClaims = claims?.length ?? 0;
  const totalShared = sharedWithMe?.length ?? 0;

  const handleToggle = (id: PanelId) => {
    setExpanded((prev) => (prev === id ? null : id));
  };

  // ── Panel definitions ────────────────────────────────────────────────────

  const panels = [
    {
      id: "comparisons" as PanelId,
      title: "Comparisons",
      Icon: FileText,
      count: totalComparisons,
      newHref: "/comparison/new",
      newLabel: "New Comparison",
      emptyIcon: FileText,
      emptyTitle: "No comparisons yet",
      emptyDesc:
        "Upload insurance quotes to generate your first AI-powered comparison.",
      renderItems: () =>
        recentComparisons.map((c) => (
          <ComparisonCard
            key={c._id}
            id={c._id}
            title={c.title}
            status={c.status}
            insuranceType={c.insuranceType}
            contactName={contactMap.get(c.contactId)}
            createdAt={c._creationTime}
            comparisonType={c.comparisonType}
          />
        )),
    },
    {
      id: "renewals" as PanelId,
      title: "Renewals",
      Icon: RefreshCw,
      count: totalRenewals,
      newHref: "/renewal/new",
      newLabel: "New Renewal",
      emptyIcon: RefreshCw,
      emptyTitle: "No renewals yet",
      emptyDesc:
        "Start a renewal to compare a client's existing policy against new options.",
      renderItems: () =>
        recentRenewals.map((r) => (
          <ComparisonCard
            key={r._id}
            id={r._id}
            title={r.title}
            status={r.status}
            insuranceType={r.insuranceType}
            contactName={contactMap.get(r.contactId)}
            createdAt={r._creationTime}
            comparisonType={r.comparisonType}
          />
        )),
    },
    {
      id: "claims" as PanelId,
      title: "Claims",
      Icon: ShieldAlert,
      count: totalClaims,
      newHref: "/claims/new",
      newLabel: "New Claim",
      emptyIcon: ShieldAlert,
      emptyTitle: "No claims yet",
      emptyDesc:
        "File a claim to generate an AI-assisted claim form and email draft.",
      renderItems: () =>
        recentClaims.map((cl) => (
          <ClaimCard
            key={cl._id}
            id={cl._id}
            insurer={cl.insurer}
            claimType={cl.claimType}
            status={cl.status}
            contactName={contactMap.get(cl.contactId)}
            createdAt={cl._creationTime}
          />
        )),
    },
  ];

  return (
    <div className="space-y-8">
      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of your quote comparisons
          </p>
        </div>
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          <Link href="/comparison/new">
            <Button variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              New Comparison
            </Button>
          </Link>
          <Link href="/renewal/new">
            <Button variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              New Renewal
            </Button>
          </Link>
          <Link href="/claims/new">
            <Button variant="outline" className="gap-2">
              <FileText className="h-4 w-4" />
              New Claim
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-5">
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
              Comparisons
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
              Renewals
            </CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "—" : totalRenewals}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Claims
            </CardTitle>
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "—" : totalClaims}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Shared with Me
            </CardTitle>
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sharedWithMe === undefined ? "—" : totalShared}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Shared with me section (desktop) ─────────────────────────────── */}
      {totalShared > 0 && (
        <div className="hidden md:block">
          <div className="flex items-center gap-2 mb-3">
            <Share2 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Shared with Me</h2>
            <Badge variant="secondary" className="text-xs">
              {totalShared}
            </Badge>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {sharedWithMe?.map((item) => {
              if (!item) return null;
              return (
                <ComparisonCard
                  key={item._id}
                  id={item.comparison._id}
                  title={item.comparison.title}
                  status={item.comparison.status}
                  insuranceType={item.comparison.insuranceType}
                  contactName={item.contactName}
                  createdAt={item.comparison._creationTime}
                  comparisonType={item.comparison.comparisonType}
                  sharedByName={item.sharedByName}
                  permission={item.permission}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ── DESKTOP: horizontal panel layout ───────────────────────────────── */}
      <div className="hidden md:flex gap-3 min-h-[520px]">
        {panels.map((panel) => {
          const isExpanded = expanded === panel.id;
          const isCollapsed = expanded !== null && !isExpanded;
          const { Icon, emptyIcon: EmptyIcon } = panel;

          return (
            <div
              key={panel.id}
              className={cn(
                "relative flex flex-col rounded-lg border bg-card overflow-hidden",
                "transition-[width,flex] duration-300 ease-in-out",
                isCollapsed
                  ? "w-14 flex-none cursor-pointer hover:bg-muted/30"
                  : "flex-1 min-w-0"
              )}
              onClick={isCollapsed ? () => handleToggle(panel.id) : undefined}
            >
              {/* ── Collapsed strip ── */}
              {isCollapsed && (
                <div className="flex flex-col items-center gap-4 py-5 h-full select-none">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 flex items-center justify-center overflow-hidden">
                    <span
                      className="text-xs font-medium text-muted-foreground whitespace-nowrap"
                      style={{
                        writingMode: "vertical-rl",
                        transform: "rotate(180deg)",
                      }}
                    >
                      {panel.title}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground shrink-0 tabular-nums">
                    {isLoading ? "—" : panel.count}
                  </span>
                </div>
              )}

              {/* ── Full panel (equal or expanded) ── */}
              {!isCollapsed && (
                <>
                  {/* Panel header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <h2 className="text-sm font-semibold truncate">
                        Recent {panel.title}
                      </h2>
                      {!isLoading && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {panel.count}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <Link
                        href={panel.newHref}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 h-7 text-xs px-2"
                        >
                          <Plus className="h-3 w-3" />
                          New
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggle(panel.id);
                        }}
                        title={isExpanded ? "Restore columns" : "Expand panel"}
                      >
                        {isExpanded ? (
                          <Minimize2 className="h-3.5 w-3.5" />
                        ) : (
                          <Maximize2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Panel body */}
                  <div className="flex-1 overflow-y-auto p-3">
                    {isLoading ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="h-16 animate-pulse bg-muted rounded-lg"
                          />
                        ))}
                      </div>
                    ) : panel.count === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                        <EmptyIcon className="h-8 w-8 text-muted-foreground mb-3" />
                        <h3 className="text-sm font-medium">
                          {panel.emptyTitle}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                          {panel.emptyDesc}
                        </p>
                        <Link href={panel.newHref} className="mt-4">
                          <Button size="sm" className="gap-2">
                            <Plus className="h-4 w-4" />
                            {panel.newLabel}
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-2">{panel.renderItems()}</div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* ── MOBILE: tabbed layout ───────────────────────────────────────────── */}
      <div className="md:hidden space-y-4">
        {/* Tab bar */}
        <div className="flex rounded-lg border overflow-hidden">
          {[...panels, ...(totalShared > 0 ? [{
            id: "shared" as const,
            title: "Shared",
            Icon: Share2,
            count: totalShared,
          }] : [])].map((panel, idx) => {
            const isActive = activeTab === panel.id;
            const { Icon } = panel;
            return (
              <button
                key={panel.id}
                onClick={() => setActiveTab(panel.id as PanelId | "shared")}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 py-3 px-2 text-xs font-medium transition-colors",
                  idx > 0 && "border-l",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{panel.title}</span>
                {!isLoading && (
                  <Badge
                    variant={isActive ? "outline" : "secondary"}
                    className="text-[10px] h-4 px-1"
                  >
                    {panel.count}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>

        {/* Active tab content */}
        {activeTab === "shared" ? (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold">Shared with Me</h2>
            </div>
            {sharedWithMe === undefined ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="h-10 animate-pulse bg-muted rounded" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : totalShared === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Share2 className="h-10 w-10 text-muted-foreground mb-3" />
                  <h3 className="text-sm font-medium">Nothing shared yet</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                    When a team member shares a comparison or renewal with you, it will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {sharedWithMe.map((item) => {
                  if (!item) return null;
                  return (
                    <ComparisonCard
                      key={item._id}
                      id={item.comparison._id}
                      title={item.comparison.title}
                      status={item.comparison.status}
                      insuranceType={item.comparison.insuranceType}
                      contactName={item.contactName}
                      createdAt={item.comparison._creationTime}
                      comparisonType={item.comparison.comparisonType}
                      sharedByName={item.sharedByName}
                      permission={item.permission}
                    />
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          panels.map((panel) => {
            if (panel.id !== activeTab) return null;
            const EmptyIcon = panel.emptyIcon;
            return (
              <div key={panel.id}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold">
                    Recent {panel.title}
                  </h2>
                  <Link href={panel.newHref}>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Plus className="h-3.5 w-3.5" />
                      {panel.newLabel}
                    </Button>
                  </Link>
                </div>
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
                ) : panel.count === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <EmptyIcon className="h-10 w-10 text-muted-foreground mb-3" />
                      <h3 className="text-sm font-medium">{panel.emptyTitle}</h3>
                      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                        {panel.emptyDesc}
                      </p>
                      <Link href={panel.newHref} className="mt-4">
                        <Button size="sm" className="gap-2">
                          <Plus className="h-4 w-4" />
                          {panel.newLabel}
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">{panel.renderItems()}</div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
