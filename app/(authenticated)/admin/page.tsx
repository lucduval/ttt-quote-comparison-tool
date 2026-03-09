"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  FileText,
  RefreshCw,
  ShieldAlert,
  LogIn,
  BarChart2,
  TrendingUp,
  ShieldCheck,
  ShieldX,
  Search,
  X,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

type ClerkUser = {
  id: string;
  name: string;
  email: string;
  imageUrl: string;
  role: string;
  createdAt: number;
};

type DatePreset = "7" | "30" | "90" | "365" | "custom";

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function isoNDaysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export default function AdminPage() {
  const { user } = useUser();
  const isAdmin =
    (user?.publicMetadata as { role?: string } | undefined)?.role === "admin";

  // ── Filter state ────────────────────────────────────────────────────────
  const [preset, setPreset] = useState<DatePreset>("30");
  const [customFrom, setCustomFrom] = useState(isoNDaysAgo(30));
  const [customTo, setCustomTo] = useState(isoToday());
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [userSearch, setUserSearch] = useState("");

  // Derived timestamps
  const { fromTs, toTs } = useMemo(() => {
    if (preset === "custom") {
      return {
        fromTs: startOfDay(new Date(customFrom)),
        toTs: endOfDay(new Date(customTo)),
      };
    }
    const days = parseInt(preset);
    return {
      fromTs: Date.now() - days * 24 * 60 * 60 * 1000,
      toTs: Date.now(),
    };
  }, [preset, customFrom, customTo]);

  const filterUserId = selectedUserId === "all" ? undefined : selectedUserId;

  // ── Convex queries ──────────────────────────────────────────────────────
  const systemStats = useQuery(
    api.admin.getSystemStats,
    isAdmin ? { fromTs, toTs, userId: filterUserId } : "skip"
  );
  const userBreakdown = useQuery(
    api.admin.getUserBreakdown,
    isAdmin ? { fromTs, toTs, userId: filterUserId } : "skip"
  );
  const timeline = useQuery(
    api.admin.getActivityTimeline,
    isAdmin ? { fromTs, toTs, userId: filterUserId } : "skip"
  );

  // ── Clerk user list ─────────────────────────────────────────────────────
  const [clerkUsers, setClerkUsers] = useState<ClerkUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setClerkUsers(data);
      })
      .finally(() => setUsersLoading(false));
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
        <ShieldX className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Access Denied</h1>
        <p className="text-sm text-muted-foreground">
          You need admin privileges to view this page.
        </p>
      </div>
    );
  }

  const isLoading =
    systemStats === undefined ||
    userBreakdown === undefined ||
    timeline === undefined;

  const userMap = new Map(clerkUsers.map((u) => [u.id, u]));

  // Filter table rows by name/email search
  const filteredBreakdown = userBreakdown?.filter((row) => {
    if (!userSearch.trim()) return true;
    const clerk = userMap.get(row.userId);
    const q = userSearch.toLowerCase();
    return (
      clerk?.name.toLowerCase().includes(q) ||
      clerk?.email.toLowerCase().includes(q)
    );
  });

  const chartData = timeline?.map((d) => ({
    date: d.date.slice(5),
    Comparisons: d.comparisons,
    Renewals: d.renewals,
    Claims: d.claims,
    Logins: d.logins,
  }));

  const statCards = [
    {
      title: "Active Users",
      value: systemStats?.uniqueUsers,
      icon: Users,
      color: "text-blue-500",
    },
    {
      title: "Comparisons",
      value: systemStats?.totalComparisons,
      icon: FileText,
      color: "text-violet-500",
    },
    {
      title: "Renewals",
      value: systemStats?.totalRenewals,
      icon: RefreshCw,
      color: "text-green-500",
    },
    {
      title: "Claims",
      value: systemStats?.totalClaims,
      icon: ShieldAlert,
      color: "text-orange-500",
    },
    {
      title: "Contacts",
      value: systemStats?.totalContacts,
      icon: Users,
      color: "text-cyan-500",
    },
    {
      title: "Logins Today",
      value: systemStats?.loginsToday,
      icon: LogIn,
      color: "text-rose-500",
    },
    {
      title: "Total Logins",
      value: systemStats?.totalLogins,
      icon: TrendingUp,
      color: "text-amber-500",
    },
  ];

  const presetLabels: Record<DatePreset, string> = {
    "7": "7 days",
    "30": "30 days",
    "90": "90 days",
    "365": "1 year",
    custom: "Custom",
  };

  const hasActiveFilters =
    selectedUserId !== "all" || preset !== "30";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Admin Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              System-wide usage metrics across all users
            </p>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date presets */}
          <div className="flex items-center rounded-lg border overflow-hidden text-sm">
            {(["7", "30", "90", "365", "custom"] as DatePreset[]).map((p) => (
              <button
                key={p}
                onClick={() => setPreset(p)}
                className={cn(
                  "px-3 py-1.5 transition-colors border-r last:border-r-0",
                  preset === p
                    ? "bg-primary text-primary-foreground font-medium"
                    : "hover:bg-muted/60 text-muted-foreground"
                )}
              >
                {presetLabels[p]}
              </button>
            ))}
          </div>

          {/* User selector */}
          {!usersLoading && clerkUsers.length > 0 && (
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-44 h-9 text-sm">
                <SelectValue placeholder="All users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                {clerkUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Clear filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-1.5 text-muted-foreground"
              onClick={() => {
                setPreset("30");
                setSelectedUserId("all");
              }}
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Custom date range inputs */}
      {preset === "custom" && (
        <div className="flex flex-wrap items-center gap-3 p-4 rounded-lg border bg-muted/30">
          <span className="text-sm font-medium">From</span>
          <Input
            type="date"
            value={customFrom}
            max={customTo}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="w-40 h-9 text-sm"
          />
          <span className="text-sm font-medium">To</span>
          <Input
            type="date"
            value={customTo}
            min={customFrom}
            max={isoToday()}
            onChange={(e) => setCustomTo(e.target.value)}
            className="w-40 h-9 text-sm"
          />
        </div>
      )}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <Icon className={cn("h-4 w-4", card.color)} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? "—" : (card.value ?? 0)}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Activity chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">
              Activity —{" "}
              {preset === "custom"
                ? `${customFrom} → ${customTo}`
                : `Last ${presetLabels[preset]}`}
              {selectedUserId !== "all" &&
                ` · ${userMap.get(selectedUserId)?.name ?? "Selected user"}`}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-72 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={288}>
              <BarChart
                data={chartData}
                margin={{ top: 4, right: 16, left: -16, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid hsl(var(--border))",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Logins" fill="hsl(346 77% 60%)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Comparisons" fill="hsl(262 80% 65%)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Renewals" fill="hsl(142 71% 45%)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Claims" fill="hsl(25 95% 55%)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Per-user breakdown table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">
              User Breakdown
            </CardTitle>
            {!isLoading && (
              <Badge variant="secondary" className="text-xs">
                {filteredBreakdown?.length ?? 0}
              </Badge>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search users…"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="pl-8 h-8 w-48 text-sm"
            />
            {userSearch && (
              <button
                onClick={() => setUserSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading || usersLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse bg-muted rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      User
                    </th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                      Role
                    </th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                      Contacts
                    </th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                      Comparisons
                    </th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                      Renewals
                    </th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                      Claims
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                      Last Active
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBreakdown?.map((row) => {
                    const clerk = userMap.get(row.userId);
                    const initials = clerk?.name
                      ? clerk.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)
                      : "?";

                    return (
                      <tr
                        key={row.userId}
                        className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={clerk?.imageUrl} />
                              <AvatarFallback className="text-xs">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium truncate">
                                {clerk?.name ?? "Unknown"}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {clerk?.email ?? row.userId}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge
                            variant={
                              clerk?.role === "admin" ? "default" : "secondary"
                            }
                            className="text-xs"
                          >
                            {clerk?.role ?? "user"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center tabular-nums">
                          {row.contacts}
                        </td>
                        <td className="px-4 py-3 text-center tabular-nums">
                          {row.comparisons}
                        </td>
                        <td className="px-4 py-3 text-center tabular-nums">
                          {row.renewals}
                        </td>
                        <td className="px-4 py-3 text-center tabular-nums">
                          {row.claims}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground text-xs whitespace-nowrap">
                          {row.lastActive
                            ? new Date(row.lastActive).toLocaleDateString(
                                undefined,
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                }
                              )
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredBreakdown?.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-12 text-center text-muted-foreground text-sm"
                      >
                        {userSearch
                          ? `No users matching "${userSearch}"`
                          : "No user activity in this period."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
